from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from ..models import User, Product, Batch, ShiftEntry
from ..core_logic import  ai_analysis_for_batch
from ..schemas import AIAnalysisCreate, BatchResponse, ProductRecord
from ..deps import get_current_user
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, deps
from ..database import get_db
import pandas as pd
from sqlalchemy import func
import json

router = APIRouter(prefix="/batches", tags=["Batches"])

@router.get("/", response_model=List[schemas.BatchResponse])
def list_all_org_batches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.Batch).filter(
        models.Batch.organization_id == current_user.organization_id
    ).all()


@router.get("/org", response_model=List[schemas.BatchResponse])
def get_org_batches(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)  # works for org_admin and org_user
):
    return db.query(models.Batch).filter(
        models.Batch.organization_id == current_user.organization_id
    ).all()
# ------------------------------------------------
# Create Batch (org_admin only)
# ------------------------------------------------
@router.post("/", response_model=schemas.BatchResponse)
def create_batch(batch: schemas.BatchCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Ensure organization ID is taken from current user's org
    organization_id = current_user.organization_id

    # Get last batch for this product in this organization
    last_batch = (
        db.query(models.Batch)
        .filter(
            models.Batch.product_id == batch.product_id,
            models.Batch.organization_id == organization_id
        )
        .order_by(models.Batch.id.desc())
        .first()
    )

    # Auto-generate batch_number per product (e.g., "BATCH-001", "BATCH-002")
    if last_batch:
        last_number = int(last_batch.batch_number.split("-")[-1])
        batch_number = f"BATCH-{last_number + 1:03d}"
    else:
        batch_number = "BATCH-001"

    db_batch = models.Batch(
        organization_id=organization_id,
        product_id=batch.product_id,
        batch_number=batch_number,
        start_date=batch.start_date,
        end_date=batch.end_date,
        status=batch.status or "open",
    )

    db.add(db_batch)
    db.commit()
    db.refresh(db_batch)
    return db_batch


# ------------------------------------------------
# List Batches for a Product (org user)
# ------------------------------------------------
@router.get("/{product_id}", response_model=List[schemas.BatchResponse])
def list_batches(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Verify product belongs to user's org
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return db.query(models.Batch).filter(
        models.Batch.product_id == product_id,
        models.Batch.organization_id == current_user.organization_id  # ✅ added
    ).all()


# ------------------------------------------------
# Get Batch (org user)
# ------------------------------------------------
@router.get("/{batch_id}", response_model=schemas.BatchResponse)
def get_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    batch = (
        db.query(models.Batch)
        .filter(
            models.Batch.id == batch_id,
            models.Batch.organization_id == current_user.organization_id  # ✅ fix
        )
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


# ------------------------------------------------
# Update Batch (org_admin only)
# ------------------------------------------------
@router.put("/{batch_id}", response_model=schemas.BatchResponse)
def update_batch(
    batch_id: int,
    batch_in: schemas.BatchUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    batch = (
        db.query(models.Batch)
        .filter(
            models.Batch.id == batch_id,
            models.Batch.organization_id == current_user.organization_id  # ✅ fix
        )
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch_in.batch_number is not None:
        batch.batch_number = batch_in.batch_number
    if batch_in.start_date is not None:
        batch.start_date = batch_in.start_date
    if batch_in.end_date is not None:
        batch.end_date = batch_in.end_date
    if batch_in.status is not None:
        batch.status = batch_in.status

    db.commit()
    db.refresh(batch)
    return batch


# ------------------------------------------------
# Delete Batch (org_admin only)
# ------------------------------------------------
@router.delete("/{batch_id}")
def delete_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    batch = (
        db.query(models.Batch)
        .filter(
            models.Batch.id == batch_id,
            models.Batch.organization_id == current_user.organization_id  # ✅ fix
        )
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    db.delete(batch)
    db.commit()
    return {"detail": "Batch deleted"}





@router.put("/{batch_id}/close", response_model=schemas.BatchResponse)
def close_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    batch = db.query(models.Batch).filter(
        models.Batch.id == batch_id,
        models.Batch.organization_id == current_user.organization_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.status == "closed":
        raise HTTPException(status_code=400, detail="Batch already closed")

    batch.status = "closed"
    batch.end_date = date.today()

    db.commit()
    db.refresh(batch)

    return batch


# ------------------------------------------------
# 1. Shift Trend (last 3 shifts)
# ------------------------------------------------
def safe_json_load(data):
    if isinstance(data, str):
        try:
            return json.loads(data)
        except:
            return {}
    return data or {}

@router.get("/{batch_id}/trend")
def get_shift_trend(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    entries = (
        db.query(models.ShiftEntry)
        .join(models.Batch)
        .filter(
            models.ShiftEntry.batch_id == batch_id,
            models.Batch.organization_id == current_user.organization_id
        )
        .order_by(models.ShiftEntry.date.desc(), models.ShiftEntry.shift_no.desc())
        .limit(3)
        .all()
    )

    trend_data = []
    for entry in reversed(entries):
        inputs = safe_json_load(entry.input_materials)
        outputs = safe_json_load(entry.output_products)

        # compute totals
        total_cost = 0
        for v in inputs.values():
            if isinstance(v, dict) and "amount" in v and "unit_price" in v:
                total_cost += float(v["amount"]) * float(v["unit_price"])

        output_units = 0
        for v in outputs.values():
            if isinstance(v, dict) and "amount" in v:
                output_units += float(v["amount"])

        trend_data.append({
            "date": entry.date,
            "shift": entry.shift_no,
            "output_units": output_units,
            "total_cost": total_cost,
            "productivity_ratio": (output_units / total_cost) if total_cost > 0 else 0
        })

    return {"batch_id": batch_id, "trend_last_3_shifts": trend_data}


# ------------------------------------------------
# 2. Export Batch to Excel
# ------------------------------------------------
@router.get("/{batch_id}/export")
def export_batch_excel(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    batch = db.query(models.Batch).filter(
        models.Batch.id == batch_id,
        models.Batch.organization_id == current_user.organization_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    entries = db.query(models.ShiftEntry).filter(
        models.ShiftEntry.batch_id == batch.id
    ).all()

    if not entries:
        raise HTTPException(status_code=404, detail="No shift entries found")

    data = []
    for e in entries:
        # Parse inputs/outputs if they are strings
        input_materials = e.input_materials
        if isinstance(input_materials, str):
            try: input_materials = json.loads(input_materials)
            except: input_materials = {}
            
        output_products = e.output_products
        if isinstance(output_products, str):
            try: output_products = json.loads(output_products)
            except: output_products = {}

        # Flatten output_products
        output_flat = {}
        total_output = 0
        if output_products:
            for k, v in output_products.items():
                val = v.get("amount", 0) if isinstance(v, dict) else (v or 0)
                output_flat[k] = val
                total_output += float(val)

        # Flatten input_materials & calculate cost
        input_flat = {}
        total_cost = 0
        total_input_units = 0
        if input_materials:
            for k, v in input_materials.items():
                if isinstance(v, dict):
                    amt = float(v.get("amount", 0))
                    price = float(v.get("unit_price", 0))
                    input_flat[k] = amt
                    total_cost += amt * price
                    total_input_units += amt
                else:
                    amt = float(v or 0)
                    input_flat[k] = amt
                    total_input_units += amt

        base = {
            "Date": str(e.date),
            "Shift": e.shift_no,
            **input_flat,
            **output_flat,
            "Total Output Units": total_output,
            "Total Input Cost": round(total_cost, 2),
            "Cost per Output Unit": round(total_cost / total_output, 2) if total_output > 0 else 0,
            "Combined Productivity Ratio": round(total_output / total_input_units, 2) if total_input_units > 0 else 0
        }
        data.append(base)

    df = pd.DataFrame(data)
    file_path = f"batch_{batch_id}_report.xlsx"
    df.to_excel(file_path, index=False)

    return FileResponse(
        file_path,
        filename=f"batch_{batch_id}_report.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# ------------------------------------------------
# 3. Daily Report (grouped by date)
# ------------------------------------------------
@router.get("/{batch_id}/daily_report")
def daily_report(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Ensure batch belongs to org
    batch = db.query(models.Batch).filter(
        models.Batch.id == batch_id,
        models.Batch.organization_id == current_user.organization_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Fetch all shift entries
    shift_entries = (
        db.query(models.ShiftEntry)
        .filter(models.ShiftEntry.batch_id == batch.id)
        .order_by(models.ShiftEntry.date)
        .all()
    )

    daily_summary_map = {}

    for entry in shift_entries:
        date_key = entry.date

        if date_key not in daily_summary_map:
            daily_summary_map[date_key] = {"date": date_key, "totals": {}}

        totals = daily_summary_map[date_key]["totals"]

        # Parse input materials safely
        input_materials = entry.input_materials or {}
        if isinstance(input_materials, str):
            import json
            try:
                input_materials = json.loads(input_materials)
            except:
                input_materials = {}

        # Parse output products safely
        output_products = entry.output_products or {}
        if isinstance(output_products, str):
            import json
            try:
                output_products = json.loads(output_products)
            except:
                output_products = {}

        # --- Aggregate Inputs and Compute Cost ---
        total_cost = 0
        total_inputs = 0
        for name, val in input_materials.items():
            if isinstance(val, dict):
                amount = val.get("amount", 0)
                unit_price = val.get("unit_price", 0)
                totals[name] = totals.get(name, 0) + amount
                total_cost += amount * unit_price
                total_inputs += amount
            elif isinstance(val, (int, float)):
                totals[name] = totals.get(name, 0) + val
                total_inputs += val
        # --- Aggregate Outputs ---
        total_units = 0
        for name, val in output_products.items():
            if isinstance(val, dict):
                amount = val.get("amount", 0)
            elif isinstance(val, (int, float)):
                amount = val
            else:
                amount = 0
            totals[name] = totals.get(name, 0) + amount
            total_units += amount

        # Store total_cost per day
        totals["total input cost"] = totals.get("total_cost", 0) + total_cost

        # Compute derived metrics
        if total_units > 0:
            totals["input_cost_per_unit"] = round(total_cost / total_units, 2)
            totals["productivity_ratio"] = round(total_units / total_inputs, 2) if total_inputs > 0 else 0
        else:
            totals["cost_per_unit"] = 0
            totals["productivity_ratio"] = 0

    # Prepare final output list
    daily_summary = list(daily_summary_map.values())

    return {"batch_id": batch.id, "daily_summary": daily_summary}



@router.get(
    "/{batch_id}/report",
    response_model=schemas.BatchReportResponse,
    summary="Get aggregated report for a batch"
)
def get_batch_report(
    batch_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    batch = db.query(models.Batch).filter(
        models.Batch.id == batch_id,
        models.Batch.organization_id == current_user.organization_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    shift_entries = db.query(models.ShiftEntry).filter(
        models.ShiftEntry.batch_id == batch.id
    ).all()

    input_totals = {}
    input_costs = {}
    input_unit_prices = {}
    output_totals = {}
    missing_prices = []

    total_output = 0

    # ---- Aggregate Inputs & Outputs ----
    for entry in shift_entries:
        # ---- Inputs ----
        if entry.input_materials:
            for k, v in entry.input_materials.items():
                if isinstance(v, dict):
                    amount = v.get("amount", 0)
                    unit_price = v.get("unit_price", 0) or 0
                else:
                    amount = v
                    unit_price = 0

                input_totals[k] = input_totals.get(k, 0) + amount
                input_unit_prices[k] = unit_price
                input_costs[k] = input_costs.get(k, 0) + (amount * unit_price)

                if unit_price == 0:
                    missing_prices.append(k)

        # ---- Outputs ----
        if entry.output_products:
            for k, v in entry.output_products.items():
                if isinstance(v, dict):
                    amount = v.get("amount", 0)
                else:
                    amount = v
                output_totals[k] = output_totals.get(k, 0) + amount
                total_output += amount

    # ---- Overall totals ----
    total_cost = sum(input_costs.values())
    total_input_amount = sum(input_totals.values())

    # Avoid division by zero
    cost_per_unit = total_cost / total_output if total_output else 0
    overall_productivity = total_output / total_input_amount if total_input_amount else 0

    # ---- Per Input productivity and cost ----
    per_input_stats = {}
    for key, input_amount in input_totals.items():
        total_cost_input = input_costs.get(key, 0)
        unit_price = input_unit_prices.get(key, 0)
        per_input_stats[key] = {
            "total_used": input_amount,
            "unit_price": unit_price,
            "total_cost": total_cost_input,
            "cost_per_output_unit": (total_cost_input / total_output) if total_output else 0,
            "productivity_ratio": (total_output / input_amount) if input_amount else 0
        }

    return schemas.BatchReportResponse(
        batch_id=batch.id,
        batch_no=batch.batch_number,
        product_id=batch.product_id,
        status=batch.status,
        totals={**input_totals, **output_totals},
        total_input_cost=total_cost,
        total_output=total_output,
        input_cost_per_unit=cost_per_unit,
        Combined_productivity_ratio=overall_productivity,
        missing_unit_prices=list(set(missing_prices)),
        per_input_stats=per_input_stats  # 👈 NEW FIELD
    )




@router.put("/{batch_id}/close", response_model=BatchResponse)
def close_batch(batch_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    batch = db.query(models.Batch).filter(
        models.Batch.id == batch_id, 
        models.Batch.organization_id == user.organization_id
    ).first()

    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    if batch.status == "closed":
        raise HTTPException(status_code=400, detail="Batch already closed")

    batch.status = "closed"
    batch.end_date = date.today()
    db.commit()
    db.refresh(batch)

    return batch






# -----------------------------
# AI Analysis Endpoint
# -----------------------------
@router.get("/{batch_id}/ai_analysis")
def batch_ai_analysis_endpoint(
    batch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Fetch batch
    batch = db.query(Batch).filter(
        Batch.id == batch_id,
        Batch.organization_id == user.organization_id
    ).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    # Fetch all shift entries
    shift_entries = db.query(ShiftEntry).filter(ShiftEntry.batch_id == batch.id).all()
    if not shift_entries:
        raise HTTPException(status_code=404, detail="No shift entries found")

    # Call AI analysis function
    try:
        ai_result = ai_analysis_for_batch(batch, shift_entries)
        
        # Return dashboard-ready JSON
        return {
            "batch_id": batch.id,
            "batch_no": batch.batch_number,
            "product_id": batch.product_id,
            "status": batch.status,
            **ai_result
        }
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        print(f"CRITICAL ERROR in AI endpoint: {error_msg}")
        return {"error": f"Internal Server Error in AI logic: {str(e)}", "traceback": error_msg}
