from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import User, Tenant
from backend.auth import hash_password

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.post("/")
def create_user(userData: Dict[str, Any], db: Session = Depends(get_db)):
    email = userData.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User email already exists")

    role = userData.get("role", "tenant")
    new_user = User(
        name=userData.get("name"),
        email=email,
        hashed_password=hash_password("password"),  # Default password
        role=role,
        phone=userData.get("phone", ""),
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if role == "tenant":
        tenant = Tenant(
            user_id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            phone=new_user.phone,
            emergency_contact=""
        )
        db.add(tenant)
        db.commit()

    return new_user


@router.put("/{user_id}/toggle-status")
def toggle_user_status(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    user.status = "deactivated" if user.status == "active" else "active"
    db.commit()
    db.refresh(user)
    return user


@router.put("/{user_id}/profile")
def update_user_profile(user_id: int, profileData: Dict[str, Any], db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User profile not found")

    user.name = profileData.get("name", user.name)
    user.email = profileData.get("email", user.email)
    user.phone = profileData.get("phone", user.phone)
    
    if user.role == "tenant":
        tenant = db.query(Tenant).filter(Tenant.user_id == user_id).first()
        if tenant:
            tenant.name = user.name
            tenant.email = user.email
            tenant.phone = user.phone
            tenant.emergency_contact = profileData.get("emergency_contact", tenant.emergency_contact)
            
    db.commit()
    db.refresh(user)

    user_payload = {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "phone": user.phone,
        "status": user.status
    }
    if user.role == 'tenant':
        tenant = db.query(Tenant).filter(Tenant.user_id == user_id).first()
        user_payload["emergency_contact"] = tenant.emergency_contact if tenant else ""
        
    return user_payload