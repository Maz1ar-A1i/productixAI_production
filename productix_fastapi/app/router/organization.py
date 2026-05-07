from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas, deps
from ..database import get_db

router = APIRouter(prefix="/organizations", tags=["Organizations"])

# ------------------------------------------------
# Get my organization details
# ------------------------------------------------
@router.get("/me", response_model=schemas.OrganizationResponse)
def get_my_org(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_user)
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# ------------------------------------------------
# Update my organization (org_admin only)
# ------------------------------------------------
@router.put("/me", response_model=schemas.OrganizationResponse)
def update_my_org(
    org_in: schemas.OrganizationBase,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("org_admin"))
):
    org = db.query(models.Organization).filter(models.Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.name = org_in.name
    if org_in.subscription_plan:
        org.subscription_plan = org_in.subscription_plan

    db.commit()
    db.refresh(org)
    return org


# ------------------------------------------------
# List all organizations (superadmin only)
# ------------------------------------------------
@router.get("/", response_model=List[schemas.OrganizationResponse])
def list_orgs(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("superadmin"))
):
    return db.query(models.Organization).all()


# ------------------------------------------------
# Get specific org (superadmin only)
# ------------------------------------------------
@router.get("/{org_id}", response_model=schemas.OrganizationResponse)
def get_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("superadmin"))
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# ------------------------------------------------
# Delete organization (superadmin only)
# ------------------------------------------------
@router.delete("/{org_id}")
def delete_org(
    org_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.require_role("superadmin"))
):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    db.delete(org)
    db.commit()
    return {"detail": "Organization deleted"}
