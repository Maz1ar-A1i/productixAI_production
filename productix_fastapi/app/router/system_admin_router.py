# app/routers/system_admin.py

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models import Organization, Subscription, User
from ..schemas import (
    OrganizationResponse,
    OrganizationBase,
    UserResponse,
    UserCreate
)
from ..deps import require_system_admin
from ..auth import hash_password

router = APIRouter(prefix="/system-admin", tags=["System Admin"])

# ------------------------------------------------
# Organizations
# ------------------------------------------------
@router.get("/organizations", response_model=List[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    return db.query(Organization).all()


@router.post("/organizations", response_model=OrganizationResponse)
def create_organization(
    org_in: OrganizationBase,
    db: Session = Depends(get_db),
    admin=Depends(require_system_admin)
):
    org = Organization(**org_in.dict())
    db.add(org)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Organization already exists or invalid data")
    db.refresh(org)
    return org


@router.put("/organizations/{org_id}", response_model=OrganizationResponse)
def update_organization(
    org_id: int,
    org_in: OrganizationBase,
    db: Session = Depends(get_db),
    admin=Depends(require_system_admin)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.name = org_in.name
    org.subscription_plan = org_in.subscription_plan
    db.commit()
    db.refresh(org)
    return org


@router.delete("/organizations/{org_id}")
def delete_organization(
    org_id: int,
    db: Session = Depends(get_db),
    admin=Depends(require_system_admin)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return {"detail": "Organization deleted"}


# ------------------------------------------------
# Users
# ------------------------------------------------
@router.get("/users", response_model=List[UserResponse])
def list_all_users(db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    return db.query(User).all()


@router.post("/organizations/{org_id}/users", response_model=UserResponse)
def create_org_user(
    org_id: int,
    user_in: UserCreate,   # contains email, password, role
    db: Session = Depends(get_db),
    admin=Depends(require_system_admin)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    new_user = User(
        email=user_in.email,
        password_hash=hash_password(user_in.password),
        role=user_in.role,
        organization_id=org_id,
        is_verified=True # Auto-verify users created by admin
    )
    db.add(new_user)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Could not create user (Integrity error)")
    db.refresh(new_user)
    return new_user

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


# ------------------------------------------------
# Subscription Management
# ------------------------------------------------
@router.get("/organizations/{org_id}/subscription")
def view_subscription(org_id: int, db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    return {
        "organization": org.name,
        "subscription_plan": org.subscription_plan,
        "is_active": org.is_active
    }


@router.post("/organizations/{org_id}/subscription/cancel")
def cancel_subscription(org_id: int, db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    if org.subscription:
        org.subscription.status = "cancelled"
    
    # Update the organization status column
    org.status = "disabled"

    db.add(org)
    db.commit()
    db.refresh(org)
    return {"subscription": {"status": org.subscription.status}, "org_status": org.status}


@router.post("/organizations/{org_id}/subscription/enable")
def enable_subscription(org_id: int, db: Session = Depends(get_db), admin=Depends(require_system_admin)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Update subscription table
    if not org.subscription:
        org.subscription = Subscription(
            organization_id=org.id,
            plan_name=org.subscription_plan,
            status="active",
            start_date=datetime.utcnow()
        )
    else:
        org.subscription.status = "active"

    # Update the organization status column
    org.status = "active"

    db.add(org)
    db.commit()
    db.refresh(org)
    return {"subscription": {"status": org.subscription.status}, "org_status": org.status}


# ------------------------------------------------
# Generic Status Toggles (Active/Inactive)
# ------------------------------------------------

@router.put("/organizations/{org_id}/toggle-status", response_model=OrganizationResponse)
def toggle_organization_status(
    org_id: int, 
    db: Session = Depends(get_db), 
    admin=Depends(require_system_admin)
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    org.status = "disabled" if org.status == "active" else "active"
    db.commit()
    db.refresh(org)
    return org


@router.put("/users/{user_id}/toggle-status", response_model=UserResponse)
def toggle_user_status(
    user_id: int, 
    db: Session = Depends(get_db), 
    admin=Depends(require_system_admin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    return user

