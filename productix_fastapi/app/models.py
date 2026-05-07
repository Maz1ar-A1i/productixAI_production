# app/models.py

from decimal import Decimal
from sqlalchemy import (
    Column, Integer, String, Date, Enum, ForeignKey, DECIMAL,
    TIMESTAMP, Boolean, DateTime, func, Text, JSON, Numeric, TypeDecorator
)
from sqlalchemy.orm import relationship
from .database import Base
import enum
from datetime import datetime
from pydantic import BaseModel, EmailStr


# ------------------------
# Enums
# ------------------------
class ShiftEnum(enum.Enum):
    morning = "Morning"
    evening = "Evening"
    night = "Night"


class UserRole(str, enum.Enum):
    system_admin = "system_admin"   # You (super admin)
    org_admin = "org_admin"         # Organization-level admin
    org_user = "org_user"           # Normal employee/user


class BatchStatus(enum.Enum):
    open = "open"
    closed = "closed"


# -------------------
# Login / Auth Schemas
# -------------------
class LoginSchema(BaseModel):
    email: EmailStr
    password: str


class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

# ------------------------
# Organization (Tenant)
# ------------------------
class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True)
    subscription_plan = Column(String(50), default="free")
    status = Column(String(50), default="active")
    created_at = Column(DateTime, server_default=func.now())

    # relationships
    users = relationship("User", back_populates="organization", cascade="all, delete")
    products = relationship("Product", back_populates="organization", cascade="all, delete")
    batches = relationship("Batch", back_populates="organization", cascade="all, delete")
    shift_entries = relationship("ShiftEntry", back_populates="organization", cascade="all, delete")
    subscription = relationship("Subscription", back_populates="organization", uselist=False, cascade="all, delete")


# ------------------------
# Users
# ------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.org_user, nullable=False)
    is_verified = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    organization = relationship("Organization", back_populates="users")
    productivity_calculations = relationship("ProductivityCalculation", back_populates="user")
    ai_analyses = relationship("AIAnalysis", back_populates="user")
    chatbot_history = relationship("ChatbotHistory", back_populates="user")
    ai_reports = relationship("AIReport", back_populates="user")


# ------------------------
# Subscription
# ------------------------
class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    plan_name = Column(String, nullable=False)   # e.g. Free, Pro, Enterprise
    status = Column(String, default="active")    # active, trial, cancelled
    start_date = Column(DateTime, default=datetime.utcnow)
    end_date = Column(DateTime)

    organization = relationship("Organization", back_populates="subscription")


# ------------------------
# Invitations
# ------------------------
class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    email = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.org_user)
    token = Column(String, unique=True, nullable=False)   # secure token for signup
    expires_at = Column(DateTime, nullable=False)
    accepted = Column(Boolean, default=False)

    organization = relationship("Organization")


# ------------------------
# AI Data / Productivity / Reports
# ------------------------
class AIData(Base):
    __tablename__ = "ai_data"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"))
    data_json = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProductivityCalculation(Base):
    __tablename__ = "productivity_calculations"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    combined_productivity = Column(String, nullable=False)
    single_productivity = Column(JSON, nullable=False)
    processed_inputs = Column(JSON, nullable=False)
    processed_outputs = Column(JSON, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="productivity_calculations")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    efficiency_score = Column(String)
    ai_prediction = Column(Text)
    top_inefficiencies = Column(Text)
    ai_prescriptions = Column(Text)
    request_data = Column(JSON, nullable=False)

    combined_productivity = Column(String)
    targeted_productivity = Column(String)
    standard_productivity = Column(String)
    inputs = Column(JSON)
    outputs = Column(JSON)
    single_productivity = Column(JSON)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_analyses")


class ChatbotHistory(Base):
    __tablename__ = "chatbot_history"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    records = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chatbot_history")


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    goal = Column(Text, nullable=False)
    plan = Column(Text, nullable=False)
    report = Column(Text, nullable=False)
    records_used = Column(JSON, nullable=True)
    request_data = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="ai_reports")


# ------------------------
# Products & Batches
# ------------------------
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String)

    # Dynamic fields
    input_fields = Column(JSON, default=[])
    output_fields = Column(JSON, default=[])
    sector = Column(String, default="Telecom")


    organization = relationship("Organization", back_populates="products")

    batches = relationship(
        "Batch",
        back_populates="product",
        cascade="all, delete-orphan"
    )

    data_records = relationship(
        "ProductDataRecord",
        back_populates="product",
        cascade="all, delete-orphan"
    )


class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String, nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date)
    status = Column(Enum(BatchStatus), default=BatchStatus.open)

    organization = relationship("Organization", back_populates="batches")
    product = relationship("Product", back_populates="batches")
    shift_entries = relationship("ShiftEntry", back_populates="batch")


# ------------------------
# Shift Entries
# ------------------------
class JSONDecimal(TypeDecorator):
    impl = JSON

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return self._convert_decimals(value)

    def _convert_decimals(self, obj):
        if isinstance(obj, list):
            return [self._convert_decimals(i) for i in obj]
        elif isinstance(obj, dict):
            return {k: self._convert_decimals(v) for k, v in obj.items()}
        elif isinstance(obj, Decimal):
            return float(obj)
        else:
            return obj

    def process_result_value(self, value, dialect):
        return value


class ShiftEntry(Base):
    __tablename__ = "shift_entries"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    batch_id = Column(Integer, ForeignKey("batches.id"), nullable=False)
    date = Column(Date, nullable=False)
    shift_no = Column(String, nullable=False)  # morning, evening, night

    # New structure for product inputs and outputs
    input_materials = Column(JSONDecimal, nullable=True)  # {field_name: {amount, unit_price}}
    output_products = Column(JSONDecimal, nullable=True)  # {field_name: {amount}}

    admin_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="shift_entries")
    batch = relationship("Batch", back_populates="shift_entries")

# ------------------------
# Product Data Records (flat model replacing Batch+ShiftEntry)
# ------------------------
class ProductDataRecord(Base):
    __tablename__ = "product_data_records"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    month = Column(String(50), nullable=False)   # e.g. "Jan", "Feb", "2024-01"
    data = Column(JSON, default={})              # {"Grid_kWh": 5200, "DG_RunHours": 133, ...}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    product = relationship("Product", back_populates="data_records")


# ------------------------
# Productivity Calculations




# ------------------------
# Chatbot History
# ------------------------


class FileUpload(Base):
    __tablename__ = "file_uploads"
    id = Column(Integer, primary_key=True, index=True, autoincrement=True) 
    organization_id = Column(Integer, nullable=False)
    uploader_id = Column(Integer, nullable=True)
    file_path = Column(Text, nullable=False)
    original_filename = Column(Text)
    status = Column(String, default="uploaded")  # uploaded, validating, processed, failed
    rows_processed = Column(Integer, default=0)
    batches_created = Column(Integer, default=0)
    shifts_created = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)


# ------------------------
# Formula Records (Formula Builder Module)
# ------------------------
class FormulaRecord(Base):
    __tablename__ = "formula_records"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    formula_name = Column(String(255), nullable=False)
    formula_template = Column(String(50), nullable=False)  # ratio|percentage|total|difference|product|cost_per_unit|margin|average
    selected_columns = Column(JSON, default=[])             # ordered list of column name strings
    source_table = Column(String(50), nullable=False)       # tower_expenses|tower_revenue|both
    expression_string = Column(Text, nullable=False)        # e.g. "[KW Sold] / [Total Capacity (KW)] * 100"
    output_type = Column(String(20), default="number")      # number|currency|percentage
    is_active = Column(Boolean, default=True)               # soft delete flag
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization")
    created_by_user = relationship("User", foreign_keys=[created_by])