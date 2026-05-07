from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, List
from ..database import get_db
from ..models import AIAnalysis, Product, Batch, ShiftEntry, User, ProductDataRecord
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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, List[ProductRecord]]:
    """
    Returns all productivity records for the current user's tenant using the flat schema.
    Calculates combined and single productivity based on heuristic keyword matching.
    """
    records_dict: Dict[str, List[ProductRecord]] = {}

    products = db.query(Product).filter(
        Product.organization_id == current_user.organization_id
    ).all()

    # Heuristic keywords
    output_keywords = ["revenue", "sales", "traffic", "capacity", "units", "produced"]
    input_keywords = ["cost", "opex", "diesel", "grid", "elec", "fuel", "rent", "kwh", "liters", "hours", "maintenance"]

    for product in products:
        records_dict[product.name] = []

        # Fetch flat records for this product
        data_records = db.query(ProductDataRecord).filter(
            ProductDataRecord.organization_id == current_user.organization_id,
            ProductDataRecord.product_id == product.id
        ).all()

        for record in data_records:
            mapped_inputs = {}
            mapped_outputs = {}
            
            data_dict = record.data or {}
            
            def process_kv_prod(k, v, is_explicit_input=None):
                try: amt = float(v)
                except: return
                k_lower = k.lower()
                is_output = False
                if is_explicit_input is False: is_output = True
                elif is_explicit_input is True: is_output = False
                else: is_output = any(kw in k_lower for kw in output_keywords)
                
                if is_output: mapped_outputs[k] = mapped_outputs.get(k, 0.0) + amt
                else: mapped_inputs[k] = mapped_inputs.get(k, 0.0) + amt

            if "tenants" in data_dict and isinstance(data_dict["tenants"], list):
                for t in data_dict["tenants"]:
                    for k, v in t.get("inputs", {}).items(): process_kv_prod(k, v, is_explicit_input=True)
                    for k, v in t.get("outputs", {}).items(): process_kv_prod(k, v, is_explicit_input=False)
            else:
                for key, val in data_dict.items():
                    process_kv_prod(key, val, is_explicit_input=None)

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

            # Convert month string to pseudo-date for charting if needed, or just pass it directly.
            # Using month string as the generic 'date' field to avoid breaking frontend schema.
            combined_record = ProductRecord(
                calculation_id=record.id,
                date=record.month,  # Note: reusing 'date' field to store 'month' string
                inputs=mapped_inputs,
                outputs=mapped_outputs,
                combined_productivity=combined_productivity,
                single_productivity=single_productivity
            )
            records_dict[product.name].append(combined_record)

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
    query = db.query(ProductDataRecord).filter(
        ProductDataRecord.organization_id == current_user.organization_id
    )

    if product_id or sector:
        query = query.join(Product)
        if product_id:
            query = query.filter(Product.id == product_id)
        if sector:
            query = query.filter(Product.sector == sector)
    
    entries = query.all()

    # Aggregation logic
    grouped_data: Dict[str, Dict[str, Any]] = {}
    
    # Heuristic keywords
    output_keywords = ["revenue", "sales", "traffic", "capacity", "units", "produced"]
    input_keywords = ["cost", "opex", "diesel", "grid", "elec", "fuel", "rent", "kwh", "liters", "hours", "maintenance"]

    for entry in entries:
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

        data_dict = entry.data or {}

        # Helper function for parsing key-values
        def process_kv_agg(k, v, is_explicit_input=None):
            try: amt = float(v)
            except Exception: return
            k_lower = k.lower()
            is_output = False
            if is_explicit_input is False: is_output = True
            elif is_explicit_input is True: is_output = False
            else: is_output = any(kw in k_lower for kw in output_keywords)
            
            if is_output:
                grouped_data[label]["outputs"][k] = grouped_data[label]["outputs"].get(k, 0.0) + amt
            else:
                grouped_data[label]["inputs"][k] = grouped_data[label]["inputs"].get(k, 0.0) + amt

        if "tenants" in data_dict and isinstance(data_dict["tenants"], list):
            for t in data_dict["tenants"]:
                for k, v in t.get("inputs", {}).items(): process_kv_agg(k, v, is_explicit_input=True)
                for k, v in t.get("outputs", {}).items(): process_kv_agg(k, v, is_explicit_input=False)
        else:
            for key, val in data_dict.items():
                process_kv_agg(key, val, is_explicit_input=None)

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