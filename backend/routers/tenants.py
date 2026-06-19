from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import Tenant, User, Agreement, Property
from backend.dependencies import get_current_user
from backend.auth import hash_password

router = APIRouter(prefix="/tenants", tags=["Tenants"])


@router.get("/")
def get_tenants(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == 'manager':
        # Find properties managed by Rajesh/manager
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        # Find active agreement tenant user IDs
        active_tenant_user_ids = [a.user_id for a in db.query(Agreement).filter(
            Agreement.property_id.in_(managed_property_ids),
            Agreement.status == 'active'
        ).all()]
        return db.query(Tenant).filter(Tenant.user_id.in_(active_tenant_user_ids)).all()
    else:
        return db.query(Tenant).all()


@router.post("/")
def create_tenant(
    tenant_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    email = tenant_data.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")
        
    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create User account
    new_user = User(
        name=tenant_data.get("name"),
        email=email,
        hashed_password=hash_password("password"),  # Default password
        role="tenant",
        phone=tenant_data.get("phone", ""),
        status="active"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create Tenant profile
    new_tenant = Tenant(
        user_id=new_user.id,
        name=new_user.name,
        email=new_user.email,
        phone=new_user.phone,
        emergency_contact=tenant_data.get("emergency_contact", ""),
        id_proof_url=tenant_data.get("id_proof_url")
    )
    db.add(new_tenant)
    db.commit()
    db.refresh(new_tenant)

    return new_tenant


@router.put("/{tenant_id}")
def update_tenant(
    tenant_id: int,
    tenant_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")

    tenant.name = tenant_data.get("name", tenant.name)
    tenant.phone = tenant_data.get("phone", tenant.phone)
    tenant.emergency_contact = tenant_data.get("emergency_contact", tenant.emergency_contact)
    
    # Update mapped user values too
    user = db.query(User).filter(User.id == tenant.user_id).first()
    if user:
        user.name = tenant.name
        user.phone = tenant.phone

    db.commit()
    db.refresh(tenant)
    return tenant
