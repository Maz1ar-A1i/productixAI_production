import sys
sys.path.insert(0, 'e:\\ProductixAI')
from productix_fastapi.app.database import SessionLocal
from productix_fastapi.app.models import User, Organization, UserRole
from productix_fastapi.app.auth import hash_password

def create_fresh_admin():
    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            org = Organization(name="Test Org", subscription_plan="pro", status="active")
            db.add(org)
            db.commit()
            db.refresh(org)
        
        email = "test@test.com"
        password = "password123"
        
        # Ensure org is active
        org.status = "active"
        
        existing = db.query(User).filter_by(email=email).first()
        if existing:
            existing.password_hash = hash_password(password)
            existing.is_verified = True
        else:
            new_user = User(
                organization_id=org.id,
                name="Test Admin",
                email=email,
                password_hash=hash_password(password),
                role=UserRole.system_admin,
                is_verified=True
            )
            db.add(new_user)
        
        db.commit()
        print(f"✅ Created/Updated user: {email} with password: {password}")
    finally:
        db.close()

if __name__ == "__main__":
    create_fresh_admin()
