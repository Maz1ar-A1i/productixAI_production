#!/usr/bin/env python
"""
Script to create initial admin account and organization in the database
Run this after starting the backend for the first time
"""

import sys
sys.path.insert(0, 'e:\\ProductixAI')

from productix_fastapi.app.database import SessionLocal, Base, engine
from productix_fastapi.app.models import User, Organization, UserRole
from passlib.context import CryptContext

# Create all tables
Base.metadata.create_all(bind=engine)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_admin():
    db = SessionLocal()
    
    try:
        # Check if organization already exists
        org = db.query(Organization).filter(Organization.name == "Default Organization").first()
        
        if not org:
            # Create default organization
            org = Organization(
                name="Default Organization",
                subscription_plan="pro",
                status="active"
            )
            db.add(org)
            db.commit()
            print("✅ Organization created!")
        
        # Check if admin already exists
        admin = db.query(User).filter(User.email == "admin@productix.com").first()
        
        if admin:
            print("❌ Admin account already exists!")
            return
        
        # Create new admin
        new_admin = User(
            organization_id=org.id,
            name="Admin",
            email="admin@productix.com",
            password_hash=pwd_context.hash("AdminPassword123!"),
            role=UserRole.system_admin,
            is_verified=True
        )
        
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        
        print("✅ Admin account created successfully!")
        print(f"   Email: admin@productix.com")
        print(f"   Password: AdminPassword123!")
        print(f"   Role: System Admin")
        
    except Exception as e:
        print(f"❌ Error creating admin: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
