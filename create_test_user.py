import sys
sys.path.insert(0, 'e:\\ProductixAI')

from productix_fastapi.app.database import SessionLocal, Base, engine
from productix_fastapi.app.models import User, Organization, UserRole
from productix_fastapi.app.auth import hash_password

def create_test_user():
    db = SessionLocal()
    try:
        # 1. Ensure a default organization exists
        org = db.query(Organization).filter(Organization.name == "Test Organization").first()
        if not org:
            org = Organization(
                name="Test Organization",
                subscription_plan="pro",
                status="active"
            )
            db.add(org)
            db.commit()
            db.refresh(org)
            print(f"✅ Created Organization: {org.name}")
        else:
            print(f"ℹ️ Organization {org.name} already exists.")

        # 2. Create an org_admin user
        email = "user@test.com"
        password = "Password123!"
        
        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                organization_id=org.id,
                name="Test User",
                email=email,
                password_hash=hash_password(password),
                role=UserRole.org_admin,
                is_verified=True
            )
            db.add(user)
            db.commit()
            print(f"✅ Created User: {email} with role {UserRole.org_admin.value}")
        else:
            user.password_hash = hash_password(password)
            user.role = UserRole.org_admin
            db.commit()
            print(f"✅ Updated User: {email} with password: {password}")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()
