from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Tenant
from backend.schemas import UserRegister, UserLogin

from backend.auth import hash_password, verify_password, create_access_token
from backend.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=hash_password(user.password),
        role=user.role
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if new_user.role == "tenant":
        tenant_profile = Tenant(
            user_id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            phone=new_user.phone
        )
        db.add(tenant_profile)
        db.commit()

    return {"message": "User created"}



@router.post("/login")
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "sub": db_user.email,
        "role": db_user.role
    })

    user_payload = {
        "id": db_user.id,
        "name": db_user.name,
        "email": db_user.email,
        "role": db_user.role,
        "phone": db_user.phone,
        "status": db_user.status
    }
    if db_user.role == 'tenant':
        tenant = db.query(Tenant).filter(Tenant.user_id == db_user.id).first()
        user_payload["emergency_contact"] = tenant.emergency_contact if tenant else ""

    return {
        "token": token,
        "user": user_payload
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_payload = {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role,
        "phone": current_user.phone,
        "status": current_user.status
    }
    if current_user.role == 'tenant':
        tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
        user_payload["emergency_contact"] = tenant.emergency_contact if tenant else ""
    return user_payload