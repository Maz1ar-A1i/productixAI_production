from sqlalchemy.orm import joinedload
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import User, UserRole
from ..schemas import LoginSchema, TokenSchema
from ..auth import verify_password, create_access_token

router = APIRouter()

@router.post("/login/login", response_model=TokenSchema, summary="User Login with JWT")
async def login(credentials: LoginSchema, db: Session = Depends(get_db)):
    # Fetch user along with organization
    user = (
        db.query(User)
        .options(joinedload(User.organization))
        .filter(User.email == credentials.email)
        .first()
    )

    # Verify user existence and password
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Require email verification
    if not getattr(user, "is_verified", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email not verified. Please check your inbox.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check user account active status
    if getattr(user, "is_active", True) is False:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account deactivated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check organization status only for non-system-admin users
    if user.role != UserRole.system_admin:
        if not user.organization or user.organization.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Package expired. Please renew your subscription.",
            )

    # Create JWT access token
    access_token = create_access_token({
        "user_id": user.id,
        "organization_id": user.organization_id if user.role != UserRole.system_admin else None,
        "role": user.role.value
    })

    return {"access_token": access_token, "token_type": "bearer"}
