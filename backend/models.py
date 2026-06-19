from sqlalchemy import Column, Integer, String, Boolean, Float
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="tenant")  # admin, manager, tenant
    phone = Column(String, nullable=True)
    status = Column(String, default="active")  # active, deactivated

class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False)
    property_type = Column(String, nullable=False)  # apartment, house, commercial, studio
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Integer, nullable=True)
    rent_amount = Column(Integer, nullable=False)
    status = Column(String, default="vacant")  # vacant, occupied, maintenance
    owner_id = Column(Integer, nullable=True)  # manager or owner user id

class Agreement(Base):
    __tablename__ = "agreements"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)  # tenant user id
    property_id = Column(Integer, nullable=False)
    status = Column(String, default="active")  # active, expired, terminated
    start_date = Column(String, nullable=True)
    end_date = Column(String, nullable=True)
    rent_amount = Column(Integer, nullable=True)
    deposit_amount = Column(Integer, nullable=True)
    document_url = Column(String, nullable=True)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # tenant user id
    property_id = Column(Integer, nullable=True)
    agreement_id = Column(Integer, nullable=True)
    amount = Column(Integer, nullable=False)
    status = Column(String, default="pending")  # paid, pending, overdue
    due_date = Column(String, nullable=True)
    payment_date = Column(String, nullable=True)
    payment_method = Column(String, nullable=True)

class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    emergency_contact = Column(String, nullable=True)
    id_proof_url = Column(String, nullable=True)

class BookingRequest(Base):
    __tablename__ = "booking_requests"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, nullable=False)
    tenant_id = Column(Integer, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_at = Column(String, nullable=True)

class MaintenanceTicket(Base):
    __tablename__ = "maintenance"

    id = Column(Integer, primary_key=True, index=True)
    property_id = Column(Integer, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, urgent, done
    reported_date = Column(String, nullable=True)
    notes = Column(String, nullable=True)