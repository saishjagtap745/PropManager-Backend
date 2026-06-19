from pydantic import BaseModel, EmailStr


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
    property_type: str
    rent_amount: int


# ---------------- PAYMENT SCHEMAS ----------------
class PaymentCreate(BaseModel):
    property_id: int
    amount: int


class AgreementCreate(BaseModel):
    property_id: int
    status: str = "active"