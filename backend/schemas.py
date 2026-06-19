from pydantic import BaseModel, EmailStr
from typing import Optional

# ---------------- USER SCHEMAS ----------------
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "tenant"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ---------------- PROPERTY SCHEMAS ----------------
class PropertyCreate(BaseModel):
    title: str
    address: str
    city: str
    type: str  # apartment, house, commercial, studio
    rent_amount: int
    description: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    status: Optional[str] = "vacant"

# ---------------- PAYMENT SCHEMAS ----------------
class PaymentCreate(BaseModel):
    property_id: Optional[int] = None
    agreement_id: Optional[int] = None
    amount: int
    status: Optional[str] = "pending"
    due_date: Optional[str] = None
    payment_method: Optional[str] = None

# ---------------- AGREEMENT SCHEMAS ----------------
class AgreementCreate(BaseModel):
    property_id: int
    tenant_id: int
    start_date: str
    end_date: str
    rent_amount: int
    deposit_amount: int
    status: Optional[str] = "active"

# ---------------- TENANT SCHEMAS ----------------
class TenantCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    emergency_contact: Optional[str] = None
    id_proof_url: Optional[str] = None

# ---------------- BOOKING SCHEMAS ----------------
class BookingRequestCreate(BaseModel):
    property_id: int
    tenant_id: int
    start_date: str
    end_date: str

# ---------------- MAINTENANCE SCHEMAS ----------------
class MaintenanceTicketCreate(BaseModel):
    property_id: int
    description: str
    status: Optional[str] = "pending"
    notes: Optional[str] = None