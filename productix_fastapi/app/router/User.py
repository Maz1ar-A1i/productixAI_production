from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas, deps, auth
from ..database import get_db

router = APIRouter(prefix="/users", tags=["Users"])

# -------------------------------
# List users in the current org
# -------------------------------
@router.get("/", response_model=List[schemas.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    return (
        db.query(models.User)
        .filter(models.User.organization_id == current_user.organization_id)
        .all()
    )

# -------------------------------
# Create new user (org_admin only)
# -------------------------------
@router.post("/", response_model=schemas.UserResponse)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    # Prevent duplicate emails
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    if user_in.role == models.UserRole.system_admin:
        raise HTTPException(
            status_code=400,
            detail="Creating system admin accounts via this API is not allowed."
        )

    hashed = auth.hash_password(user_in.password)
    user = models.User(
        name=user_in.name,
        email=user_in.email,
        password_hash=hashed,
        role=user_in.role or "org_user",
        organization_id=current_user.organization_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# -------------------------------
# Get my profile
# -------------------------------
@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

# -------------------------------
# Delete user (org_admin only)
# -------------------------------
@router.delete("/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    # Fetch the user in the same organization
    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id,
            models.User.organization_id == current_user.organization_id
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting self
    if user.id == current_user.id:
        raise HTTPException(status_code=403, detail="You cannot delete yourself")

    # Prevent deleting system admin
    if user.role == "system_admin":
        raise HTTPException(status_code=403, detail="You cannot delete system admin")

    # Only org_users can be deleted
    if user.role != "org_user":
        raise HTTPException(status_code=403, detail="You can only delete org users")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted successfully"}


# -------------------------------
# List units assigned to a user
# -------------------------------
@router.get("/{user_id}/assigned-units", response_model=List[schemas.ProductResponse])
def list_assigned_units(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    # Verify user belongs to org
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get assigned products
    assignments = db.query(models.UserProductAssignment).filter(
        models.UserProductAssignment.user_id == user_id
    ).all()
    
    product_ids = [a.product_id for a in assignments]
    
    products = db.query(models.Product).filter(
        models.Product.id.in_(product_ids)
    ).all() if product_ids else []

    # Map/parse JSON fields for safety
    import json
    for p in products:
        if isinstance(p.input_fields, str) and p.input_fields:
            p.input_fields = json.loads(p.input_fields.replace("'", '"'))
        if isinstance(p.output_fields, str) and p.output_fields:
            p.output_fields = json.loads(p.output_fields.replace("'", '"'))

    return products


# -------------------------------
# Assign units to a user
# -------------------------------
from pydantic import BaseModel

class AssignUnitsPayload(BaseModel):
    product_ids: List[int]

@router.post("/{user_id}/assign-units")
def assign_units(
    user_id: int,
    payload: AssignUnitsPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    # Verify user belongs to org
    user = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organization_id == current_user.organization_id
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Verify all product_ids belong to org
    for pid in payload.product_ids:
        product = db.query(models.Product).filter(
            models.Product.id == pid,
            models.Product.organization_id == current_user.organization_id
        ).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Unit with ID {pid} not found in your organization")

    # Delete existing assignments
    db.query(models.UserProductAssignment).filter(
        models.UserProductAssignment.user_id == user_id
    ).delete()

    # Add new assignments
    for pid in payload.product_ids:
        assignment = models.UserProductAssignment(
            user_id=user_id,
            product_id=pid
        )
        db.add(assignment)

    db.commit()
    return {"detail": "Units assigned successfully"}
