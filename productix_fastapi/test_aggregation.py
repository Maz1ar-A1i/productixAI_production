import traceback
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import app.models as models
from app.router.analytics import aggregate_data

engine = create_engine('sqlite:///./productix.db')
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()
user = db.query(models.User).filter_by(email="admin@productix.ai").first()

try:
    res = aggregate_data(granularity='monthly', db=db, current_user=user)
    print('SUCCESS')
except Exception as e:
    traceback.print_exc()
