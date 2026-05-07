from .models import User, UserRole
from .database import SessionLocal
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_system_admin():
    db = SessionLocal()
    if not db.query(User).filter(User.role == UserRole.system_admin).first():
        admin = User(
            organization_id=1,   # can be a dummy "System Org"
            name="SystemAdmin",
            email="rahmat@irp.edu.pk",
            password_hash=pwd_context.hash("Pakistan786"),
            role=UserRole.system_admin,
            is_verified=True
        )
        db.add(admin)
        db.commit()
    db.close()
    print("✅ Admin user created!")

if __name__ == "__main__":
    create_system_admin()
