from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from .. import models, schemas, database
from ..deps import get_current_user

router = APIRouter(prefix="/shifts", tags=["Shifts"])


def decimals_to_float(obj):
    if isinstance(obj, list):
        return [decimals_to_float(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: decimals_to_float(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return float(obj)
    else:
        return obj


@router.post("/", response_model=schemas.ShiftEntryOut)
def create_shift_entry(
    entry: schemas.ShiftEntryCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Convert decimals to floats
    entry_data = entry.dict()
    if entry_data.get("input_materials"):
        entry_data["input_materials"] = decimals_to_float(entry_data["input_materials"])
    if entry_data.get("output_products"):
        entry_data["output_products"] = decimals_to_float(entry_data["output_products"])

    db_entry = models.ShiftEntry(
        organization_id=current_user.organization_id,
        **entry_data
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry


@router.get("/", response_model=list[schemas.ShiftEntryOut])
def list_shift_entries(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    return db.query(models.ShiftEntry).filter(
        models.ShiftEntry.organization_id == current_user.organization_id
    ).all()


@router.get("/{shift_id}", response_model=schemas.ShiftEntryOut)
def get_shift_entry(
    shift_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = db.query(models.ShiftEntry).filter(
        models.ShiftEntry.id == shift_id,
        models.ShiftEntry.organization_id == current_user.organization_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Shift entry not found")
    return entry


@router.put("/{shift_id}", response_model=schemas.ShiftEntryOut)
def update_shift_entry(
    shift_id: int,
    entry_update: schemas.ShiftEntryUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = db.query(models.ShiftEntry).filter(
        models.ShiftEntry.id == shift_id,
        models.ShiftEntry.organization_id == current_user.organization_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Shift entry not found")

    update_data = entry_update.dict(exclude_unset=True)
    if update_data.get("input_materials"):
        update_data["input_materials"] = decimals_to_float(update_data["input_materials"])
    if update_data.get("output_products"):
        update_data["output_products"] = decimals_to_float(update_data["output_products"])

    for key, value in update_data.items():
        setattr(entry, key, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{shift_id}")
def delete_shift_entry(
    shift_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    entry = db.query(models.ShiftEntry).filter(
        models.ShiftEntry.id == shift_id,
        models.ShiftEntry.organization_id == current_user.organization_id
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Shift entry not found")

    db.delete(entry)
    db.commit()
    return {"detail": "Shift entry deleted successfully"}


@router.get("/product/{product_id}/fields")
def get_product_fields(
    product_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_user)
):
    product = db.query(models.Product).filter(
        models.Product.id == product_id,
        models.Product.organization_id == current_user.organization_id
    ).first()

    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Return input and output fields directly
    return {
        "input_fields": product.input_fields or [],
        "output_fields": product.output_fields or []
    }
