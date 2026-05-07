from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import pandas as pd
import json
import os

from .. import models, schemas, deps
from ..database import get_db

router = APIRouter(prefix="/data-records", tags=["Data Records"])


# ------------------------------------------------
# List records for a product (or all for org)
# ------------------------------------------------
@router.get("/", response_model=List[schemas.ProductDataRecordResponse])
def list_records(
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    query = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.organization_id == current_user.organization_id
    )
    if product_id is not None:
        query = query.filter(models.ProductDataRecord.product_id == product_id)
    return query.order_by(models.ProductDataRecord.id.asc()).all()


# ------------------------------------------------
# Create a record
# ------------------------------------------------
@router.post("/", response_model=schemas.ProductDataRecordResponse)
def create_record(
    record_in: schemas.ProductDataRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    # Verify product belongs to org
    product = db.query(models.Product).filter(
        models.Product.id == record_in.product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    record = models.ProductDataRecord(
        organization_id=current_user.organization_id,
        product_id=record_in.product_id,
        month=record_in.month,
        data=record_in.data
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


# ------------------------------------------------
# Update a record
# ------------------------------------------------
@router.put("/{record_id}", response_model=schemas.ProductDataRecordResponse)
def update_record(
    record_id: int,
    record_in: schemas.ProductDataRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    record = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.id == record_id,
        models.ProductDataRecord.organization_id == current_user.organization_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    record.month = record_in.month
    record.data = record_in.data
    db.commit()
    db.refresh(record)
    return record


# ------------------------------------------------
# Delete a record
# ------------------------------------------------
@router.delete("/{record_id}")
def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    record = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.id == record_id,
        models.ProductDataRecord.organization_id == current_user.organization_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()
    return {"detail": "Record deleted successfully"}


# ------------------------------------------------
# Aggregated Analytics Report for a Record
# (Replacement for Batch Report)
# ------------------------------------------------
@router.get("/{record_id}/report")
def get_record_report(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    record = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.id == record_id,
        models.ProductDataRecord.organization_id == current_user.organization_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    data = record.data or {}
    output_keywords = ["revenue", "sales", "traffic", "capacity", "units", "produced"]
    
    inputs = {}
    outputs = {}
    total_output = 0.0
    total_input_cost = 0.0

    # Heuristic mapping for either new nested Multi-Tenant JSON or legacy flat JSON
    per_input_stats = {}
    
    # helper for processing key-values
    def process_kv(k, v, is_explicit_input=None):
        nonlocal total_output, total_input_cost, inputs, outputs, per_input_stats
        try:
            val = float(v)
        except: return
        
        k_lower = k.lower()
        is_output = False
        if is_explicit_input is False:
            is_output = True
        elif is_explicit_input is True:
            is_output = False
        else:
            is_output = any(kw in k_lower for kw in output_keywords)
            
        if is_output:
            outputs[k] = outputs.get(k, 0) + val
            total_output += val
        else:
            inputs[k] = inputs.get(k, 0) + val
            total_input_cost += val
            per_input_stats[k] = {
                "total_used": inputs[k],
                "unit_price": 1.0, 
                "total_cost": inputs[k],
                "cost_per_output_unit": (inputs[k] / total_output) if total_output > 0 else 0,
                "productivity_ratio": (total_output / inputs[k]) if inputs[k] > 0 else 0
            }

    if "tenants" in data and isinstance(data["tenants"], list):
        for tenant in data["tenants"]:
            for k, v in tenant.get("inputs", {}).items():
                process_kv(k, v, is_explicit_input=True)
            for k, v in tenant.get("outputs", {}).items():
                process_kv(k, v, is_explicit_input=False)
    else:
        for k, v in data.items():
            process_kv(k, v, is_explicit_input=None)

    # Map to legacy structure for frontend compatibility
    return {
        "record_id": record_id,
        "product_name": record.product.name if record.product else "N/A",
        "month": record.month,
        "totals": outputs, # Show output metrics as the main totals
        "total_input_cost": total_input_cost,
        "input_cost_per_unit": (total_input_cost / total_output) if total_output > 0 else 0,
        "Combined_productivity_ratio": (total_output / total_input_cost) if total_input_cost > 0 else 0,
        "per_input_stats": per_input_stats,
        "daily_details": [{"date": record.month, "totals": {**inputs, **outputs}}], # Map the single record as one "daily" entry
        "trend_data": [
            {"shift": "Current", "output_units": total_output, "total_cost": total_input_cost, "productivity_ratio": (total_output / total_input_cost) if total_input_cost > 0 else 0}
        ]
    }


# ------------------------------------------------
# Export Record to Excel
# ------------------------------------------------
@router.get("/{record_id}/export")
def export_record_excel(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    record = db.query(models.ProductDataRecord).filter(
        models.ProductDataRecord.id == record_id,
        models.ProductDataRecord.organization_id == current_user.organization_id
    ).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    df = pd.DataFrame([record.data or {}])
    file_path = f"record_{record_id}_export.xlsx"
    df.to_excel(file_path, index=False)

    return FileResponse(
        file_path,
        filename=f"Report_{record.month}.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
