from fastapi import APIRouter, HTTPException, status, Request, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from ..database import get_db
from ..client_license_manager import (
    check_license_status,
    IS_LICENSED,
    LICENSE_BLOCK_REASON,
    LICENSE_KEY,
    EXPIRES_AT,
    HOURS_LEFT,
    get_machine_id
)

router = APIRouter(prefix="/api/license", tags=["Local Client License"])

class RegisterLocalRequest(BaseModel):
    licenseKey: str

class LocalStatusResponse(BaseModel):
    valid: bool
    reason: str
    licenseKey: str
    expiresAt: Optional[str] = None
    hoursLeft: float
    machineId: str

@router.get("/local-status", response_model=LocalStatusResponse)
def get_local_status(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Returns the current local licensing status of the client application.
    Checks the database directly, scoped to the user's organization if authenticated.
    """
    valid = False
    reason = "UNLICENSED"
    license_key = ""
    expires_at = None
    hours_left = 0.0
    machine_id = get_machine_id()

    # Get cached license key
    from ..client_license_manager import read_encrypted_cache
    cache = read_encrypted_cache()
    cached_key = cache.get("license_key") if cache else None

    # Get token from Authorization header if present
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        from ..auth import decode_token
        decoded = decode_token(token)
        if decoded:
            if decoded.role == "system_admin":
                valid = True
                reason = "ACTIVE"
            elif decoded.organization_id:
                # First check Master Kill Switch
                from ..models import License
                global_license = db.query(License).filter(License.role == "global_admin").first()
                if global_license and global_license.status == "revoked":
                    valid = False
                    reason = "SYSTEM_SUSPENDED"
                else:
                    # Check organization's license matching the cached key
                    lic = db.query(License).filter(
                        License.organization_id == decoded.organization_id,
                        License.license_key == cached_key,
                        License.status == "active"
                    ).first()
                    
                    from datetime import datetime
                    if lic and lic.expires_at and lic.expires_at < datetime.utcnow():
                        lic.status = "expired"
                        db.commit()
                        lic = None
                        
                    if lic:
                        valid = True
                        reason = "ACTIVE"
                        license_key = lic.license_key
                        expires_at = lic.expires_at.isoformat() if lic.expires_at else None
                        if lic.expires_at:
                            time_left = lic.expires_at - datetime.utcnow()
                            hours_left = max(0.0, time_left.total_seconds() / 3600.0)
                        else:
                            hours_left = 99999.0
                    else:
                        # Check if org has any active license key (but different from cache)
                        any_active = db.query(License).filter(
                            License.organization_id == decoded.organization_id,
                            License.status == "active"
                        ).first()
                        
                        if any_active:
                            reason = "UNLICENSED"
                        else:
                            # Check if any expired/revoked license exists to get the reason
                            any_lic = db.query(License).filter(
                                License.organization_id == decoded.organization_id
                            ).order_by(License.id.desc()).first()
                            if any_lic:
                                reason = any_lic.status.upper() # REVOKED or EXPIRED
                                license_key = any_lic.license_key
                                expires_at = any_lic.expires_at.isoformat() if any_lic.expires_at else None
                            else:
                                reason = "UNLICENSED"

    return LocalStatusResponse(
        valid=valid,
        reason=reason,
        licenseKey=license_key,
        expiresAt=expires_at,
        hoursLeft=hours_left,
        machineId=machine_id
    )

@router.post("/register-local", response_model=LocalStatusResponse)
def register_local_license(
    request: RegisterLocalRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Registers/activates a new license key locally for the logged-in organization.
    """
    # Decode token to verify organization
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required to register license.")
        
    token = auth_header.split(" ")[1]
    from ..auth import decode_token
    decoded = decode_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Invalid session token.")
        
    if decoded.role == "system_admin":
        raise HTTPException(status_code=400, detail="System admin does not need to register a license.")

    from ..models import License
    from datetime import datetime
    
    # Check if the license key exists and belongs to the user's organization
    lic = db.query(License).filter(
        License.license_key == request.licenseKey.strip()
    ).first()
    
    if not lic:
        raise HTTPException(status_code=400, detail="Invalid license key. Please check the key provided by global admin.")
        
    if lic.organization_id != decoded.organization_id:
        raise HTTPException(status_code=400, detail="This license key does not belong to your organization.")
        
    if lic.status == "revoked":
        raise HTTPException(status_code=400, detail="This license key has been revoked.")
        
    if lic.expires_at and lic.expires_at < datetime.utcnow():
        lic.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="This license key has expired.")

    # Mark the key as active if it was pending or change status to active
    lic.status = "active"
    db.commit()
    
    # Update local cache so we remain consistent
    from ..client_license_manager import write_encrypted_cache
    new_cache = {
        "license_key": lic.license_key,
        "last_validated": datetime.utcnow().isoformat(),
        "max_seen_time": datetime.utcnow().isoformat(),
        "expires_at": lic.expires_at.isoformat() if lic.expires_at else None,
        "cached_status": "active"
    }
    write_encrypted_cache(new_cache)
    
    # Update the global thread-safe state in client_license_manager
    import app.client_license_manager as clm
    with clm.state_lock:
        clm.IS_LICENSED = True
        clm.LICENSE_BLOCK_REASON = "ACTIVE"
        clm.LICENSE_KEY = lic.license_key
        clm.EXPIRES_AT = lic.expires_at.isoformat() if lic.expires_at else None
        clm.HOURS_LEFT = 99999.0

    return LocalStatusResponse(
        valid=True,
        reason="ACTIVE",
        licenseKey=lic.license_key,
        expiresAt=lic.expires_at.isoformat() if lic.expires_at else None,
        hoursLeft=99999.0,
        machineId=get_machine_id()
    )
