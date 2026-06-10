from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, List
from ..database import get_db
from ..models import AIAnalysis, Product, Batch, ShiftEntry, User, ProductDataRecord, UserProductAssignment
from ..deps import get_current_user
from ..schemas import (
    AnalysisCountResponse, ProductivityRecordsResponse, ProductRecord,
    AggregationResponse, AggregationDataPoint
)
from sqlalchemy import func, and_
from typing import Dict, List, Optional, Any
from datetime import datetime, date, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get(
    "/productivity-records",
    summary="Fetch productivity records for logged-in tenant",
    response_model=ProductivityRecordsResponse
)
def get_productivity_records(
    product_id: Optional[int] = None,
    date_start: Optional[str] = None,
    date_end: Optional[str] = None,
    region: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[ProductRecord]]:
    """
    Returns all productivity records for the current user's tenant using the flat schema.
    Calculates combined and single productivity using centralized data_pipeline classifiers.
    """
    records_dict: Dict[str, List[ProductRecord]] = {}

    assigned_ids = None
    if current_user.role.value == "org_user":
        assigned_ids = [a.product_id for a in db.query(UserProductAssignment).filter(
            UserProductAssignment.user_id == current_user.id
        ).all()]
        if product_id is not None and product_id not in assigned_ids:
            raise HTTPException(status_code=403, detail="You do not have access to this unit.")

    product_query = db.query(Product).filter(
        Product.organization_id == current_user.organization_id
    )
    if assigned_ids is not None:
        product_query = product_query.filter(Product.id.in_(assigned_ids))
    products = product_query.all()

    for product in products:
        records_dict[product.name] = []

    # Fetch flat records
    query = db.query(ProductDataRecord).filter(
        ProductDataRecord.organization_id == current_user.organization_id
    )
    if product_id is not None:
        query = query.filter(ProductDataRecord.product_id == product_id)
    elif assigned_ids is not None:
        query = query.filter(ProductDataRecord.product_id.in_(assigned_ids))
        
    data_records = query.all()

    # Apply filters using apply_filters helper
    from ..data_pipeline import apply_filters, classify_input_output
    filters = {
        "tower_id": product_id,
        "date_start": date_start,
        "date_end": date_end,
        "region": region
    }
    filtered_records = apply_filters(data_records, filters)

    for record in filtered_records:
        mapped_inputs, mapped_outputs = classify_input_output(record.data or {})

        combined_productivity = None
        single_productivity = {}

        total_input = sum(mapped_inputs.values())
        total_output = sum(mapped_outputs.values())
        
        if total_input > 0:
            combined_productivity = round((total_output / total_input) * 100, 2)

        for in_key, in_val in mapped_inputs.items():
            for out_key, out_val in mapped_outputs.items():
                if in_val > 0:
                    single_productivity[f"{in_key} / {out_key}"] = round((out_val / in_val) * 100, 2)
                else:
                    single_productivity[f"{in_key} / {out_key}"] = None

        combined_record = ProductRecord(
            calculation_id=record.id,
            date=record.month,  # reusing 'date' field to store 'month' string
            inputs=mapped_inputs,
            outputs=mapped_outputs,
            combined_productivity=combined_productivity,
            single_productivity=single_productivity
        )
        
        p_name = record.product.name if record.product else f"Product-{record.product_id}"
        if p_name not in records_dict:
            records_dict[p_name] = []
        records_dict[p_name].append(combined_record)

    return records_dict


@router.get(
    "/analysis-count",
    summary="Get count of AI analyses for tenant",
    response_model=AnalysisCountResponse
)
def get_analysis_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the total number of AI analysis records for the current user's tenant.
    """
    count = db.query(AIAnalysis).filter(
        AIAnalysis.organization_id == current_user.organization_id
    ).count()
    return {"analysis_count": count}


@router.get("/aggregation", response_model=AggregationResponse)
def aggregate_data(
    granularity: str = "monthly",
    product_id: Optional[int] = None,
    batch_id: Optional[int] = None, # Deprecated but kept for schema compatibility
    start_date: Optional[date] = None, # Kept for API compatibility but currently ignored due to flat schema string months
    end_date: Optional[date] = None,
    sector: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Groups data records by month and sums up inputs/outputs using keyword heuristics.
    """
    assigned_ids = None
    if current_user.role.value == "org_user":
        assigned_ids = [a.product_id for a in db.query(UserProductAssignment).filter(
            UserProductAssignment.user_id == current_user.id
        ).all()]
        if product_id is not None and product_id not in assigned_ids:
            raise HTTPException(status_code=403, detail="You do not have access to this unit.")

    query = db.query(ProductDataRecord).filter(
        ProductDataRecord.organization_id == current_user.organization_id
    )

    if assigned_ids is not None:
        query = query.filter(ProductDataRecord.product_id.in_(assigned_ids))

    if product_id or sector:
        query = query.join(Product)
        if product_id:
            query = query.filter(Product.id == product_id)
        if sector:
            query = query.filter(Product.sector == sector)
    
    entries = query.all()

    # Apply date/region filters
    from ..data_pipeline import apply_filters, classify_input_output
    filters = {
        "tower_id": product_id,
        "date_start": start_date.strftime("%Y-%m-%d") if start_date else None,
        "date_end": end_date.strftime("%Y-%m-%d") if end_date else None,
    }
    filtered_entries = apply_filters(entries, filters)

    # Aggregation logic
    grouped_data: Dict[str, Dict[str, Any]] = {}

    for entry in filtered_entries:
        raw_date_str = entry.month
        label = raw_date_str
        
        # Attempt to parse as YYYY-MM-DD to apply granularity formatting
        try:
            from datetime import datetime
            d = datetime.strptime(raw_date_str, "%Y-%m-%d")
            if granularity == "monthly":
                label = d.strftime("%Y-%m")
            elif granularity == "weekly":
                label = f"{d.year}-W{d.isocalendar()[1]}"
            elif granularity == "daily":
                label = d.strftime("%Y-%m-%d")
        except ValueError:
            pass # Keep as-is if it's legacy data like "Jan"

        if label not in grouped_data:
            grouped_data[label] = {"inputs": {}, "outputs": {}}

        mapped_inputs, mapped_outputs = classify_input_output(entry.data or {})

        for k, v in mapped_inputs.items():
            grouped_data[label]["inputs"][k] = grouped_data[label]["inputs"].get(k, 0.0) + v
        for k, v in mapped_outputs.items():
            grouped_data[label]["outputs"][k] = grouped_data[label]["outputs"].get(k, 0.0) + v

    # Convert to schema format and calculate productivity
    result_data = []
    # Try to sort months correctly if possible, but string sort is fallback
    month_order = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "May": 5, "Jun": 6, "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12}
    
    try:
        def sort_key(label):
            return month_order.get(label[:3], 99)
        sorted_labels = sorted(grouped_data.keys(), key=sort_key)
    except Exception:
        sorted_labels = sorted(grouped_data.keys())
    
    for label in sorted_labels:
        d = grouped_data[label]
        total_in = sum(d["inputs"].values())
        total_out = sum(d["outputs"].values())
        prod = (total_out / total_in * 100) if total_in > 0 else None
        
        result_data.append(AggregationDataPoint(
            label=label,
            inputs=d["inputs"],
            outputs=d["outputs"],
            productivity=prod
        ))

    return AggregationResponse(granularity="monthly", data=result_data)