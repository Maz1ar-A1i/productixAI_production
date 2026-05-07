import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pathlib import Path

# Define database location
if getattr(sys, 'frozen', False):
    # Running as EXE (Production)
    # Use AppData folder as requested (Option B)
    base_dir = Path(os.environ.get('APPDATA', os.path.expanduser('~'))) / "Productix AI"
    base_dir.mkdir(parents=True, exist_ok=True)
    db_path = (base_dir / "productix.db").resolve()
else:
    # Running in development
    # Stay relative to the project structure
    db_path = Path(__file__).parent.parent.resolve() / "productix.db"

# For SQLite absolute paths on Windows, sqlite:/// followed by path is standard, 
# but we ensure the path is stringified and resolved.
DATABASE_URL = f"sqlite:///{str(db_path)}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Enable WAL mode for SQLite to prevent "Database is Busy" during concurrent refreshes
from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


