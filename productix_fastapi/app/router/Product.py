from fastapi import APIRouter, Depends, HTTPException
from ..models import Batch
from ..deps import get_current_user
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, deps
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


# ------------------------------------------------
# Create Product (org_admin only)
# ------------------------------------------------
@router.post("/", response_model=schemas.ProductResponse)
def create_product(
    product_in: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    product = models.Product(
        name=product_in.name,
        description=product_in.description,
        organization_id=current_user.organization_id,
        input_fields=product_in.input_fields,
        output_fields=product_in.output_fields,
        sector=product_in.sector or "Telecom",
        region=product_in.region or product_in.description or "",
        location=product_in.location or "Urban",
        customers=product_in.customers or [],
        unit_vars=product_in.unit_vars or [],
        customer_vars=product_in.customer_vars or []
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

import json
# ------------------------------------------------
# List Products (any user in org)
# ------------------------------------------------
@router.get("/", response_model=List[schemas.ProductResponse])
def list_products(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    if current_user.role.value == "org_user":
        products = db.query(models.Product).join(
            models.UserProductAssignment,
            models.Product.id == models.UserProductAssignment.product_id
        ).filter(
            models.Product.organization_id == current_user.organization_id,
            models.UserProductAssignment.user_id == current_user.id
        ).all()
    else:
        products = db.query(models.Product).filter(
            models.Product.organization_id == current_user.organization_id
        ).all()

    for p in products:
        if isinstance(p.input_fields, str) and p.input_fields:
            p.input_fields = json.loads(p.input_fields.replace("'", '"'))
        if isinstance(p.output_fields, str) and p.output_fields:
            p.output_fields = json.loads(p.output_fields.replace("'", '"'))
    return products


# ------------------------------------------------
# Get Single Product (org user)
# ------------------------------------------------
@router.get("/{product_id}", response_model=schemas.ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    if current_user.role.value == "org_user":
        assignment = db.query(models.UserProductAssignment).filter(
            models.UserProductAssignment.user_id == current_user.id,
            models.UserProductAssignment.product_id == product_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You do not have access to this unit.")

    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


# ------------------------------------------------
# Update Product (org_admin only)
# ------------------------------------------------
@router.put("/{product_id}", response_model=schemas.ProductResponse)
def update_product(
    product_id: int,
    product_in: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.name = product_in.name or product.name
    product.description = product_in.description or product.description
    if product_in.region is not None:
        product.region = product_in.region
    if product_in.location is not None:
        product.location = product_in.location
    if product_in.customers is not None:
        product.customers = product_in.customers
    if product_in.unit_vars is not None:
        product.unit_vars = product_in.unit_vars
    if product_in.customer_vars is not None:
        product.customer_vars = product_in.customer_vars

    db.commit()
    db.refresh(product)
    return product


# ------------------------------------------------
# Delete Product (org_admin only)
# ------------------------------------------------
@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()
    return {"detail": "Product deleted successfully"}


@router.get("/{product_id}/trend_last_batches")
def trend_last_batches(product_id: int, n: int = 3, db: Session = Depends(get_db), user=Depends(get_current_user)):
    product = db.query(models.Product).filter(
        models.Product.id == product_id, 
        models.Product.organization_id == user.organization_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    last_batches = (
        db.query(Batch)
        .filter(
            Batch.product_id == product_id,
            Batch.organization_id == user.organization_id
        )
        .order_by(Batch.start_date.desc())
        .limit(n)
        .all()
    )

    trend_data = []
    for batch in reversed(last_batches):
        entries = db.query(models.ShiftEntry).filter(models.ShiftEntry.batch_id == batch.id).all()
        total_output = sum(e.output_units for e in entries)
        total_cost = sum(e.total_cost for e in entries)
        trend_data.append({
            "batch_no": batch.batch_no,
            "start_date": batch.start_date,
            "end_date": batch.end_date,
            "total_output": total_output,
            "total_cost": float(total_cost),
            "cost_per_unit": float(total_cost / total_output) if total_output > 0 else 0,
            "productivity_ratio": float(total_output / total_cost) if total_cost > 0 else 0
        })

    return {"product_id": product.id, "trend_last_batches": trend_data}




@router.get("/product/{product_id}/fields")
def get_product_fields_and_batches(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Fetch product to get its dynamic fields
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    if current_user.role.value == "org_user":
        assignment = db.query(models.UserProductAssignment).filter(
            models.UserProductAssignment.user_id == current_user.id,
            models.UserProductAssignment.product_id == product_id
        ).first()
        if not assignment:
            raise HTTPException(status_code=403, detail="You do not have access to this unit.")

    # Fetch batches for this product
    batches = db.query(models.Batch).filter(
        models.Batch.product_id == product_id,
        models.Batch.organization_id == current_user.organization_id
    ).all()

    return {
        "product": {
            "id": product.id,
            "name": product.name,
            "input_fields": product.input_fields,  # Assuming JSON field
            "output_fields": product.output_fields,
        },
        "batches": [
            {"id": b.id, "batch_number": b.batch_number} for b in batches
        ]
    }