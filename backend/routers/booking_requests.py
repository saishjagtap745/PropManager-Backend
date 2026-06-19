from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import BookingRequest, Property, Agreement, Payment, User, Tenant
from backend.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/booking-requests", tags=["Booking Requests"])


@router.get("/")
def get_booking_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == 'manager':
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        return db.query(BookingRequest).filter(BookingRequest.property_id.in_(managed_property_ids)).all()
    elif current_user.role == 'tenant':
        tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
        if tenant:
            return db.query(BookingRequest).filter(BookingRequest.tenant_id == tenant.id).all()
        return []
    else:
        return db.query(BookingRequest).all()


@router.post("/")
def create_booking_request(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_id = data.get("property_id")
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    if property_obj.status != 'vacant':
        raise HTTPException(status_code=400, detail="Property is not vacant")

    tenant_id = data.get("tenant_id")
    # If not provided, find it from current user
    if not tenant_id:
        tenant = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
        if tenant:
            tenant_id = tenant.id
        else:
            raise HTTPException(status_code=400, detail="Tenant profile not found")

    new_req = BookingRequest(
        property_id=property_id,
        tenant_id=tenant_id,
        start_date=data.get("start_date"),
        end_date=data.get("end_date"),
        status="pending",
        created_at=datetime.utcnow().strftime("%Y-%m-%d")
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return new_req


@router.put("/{request_id}/approve")
def approve_booking_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(BookingRequest).filter(BookingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")

    property_obj = db.query(Property).filter(Property.id == req.property_id).first()
    if not property_obj:
        raise HTTPException(status_code=404, detail="Property not found")
    if property_obj.status != 'vacant':
        raise HTTPException(status_code=400, detail="Property is no longer vacant")

    # Find the tenant user_id
    tenant = db.query(Tenant).filter(Tenant.id == req.tenant_id).first()
    tenant_user_id = tenant.user_id if tenant else current_user.id

    # Create Lease Agreement
    agreement = Agreement(
        user_id=tenant_user_id,
        property_id=req.property_id,
        start_date=req.start_date,
        end_date=req.end_date,
        rent_amount=property_obj.rent_amount,
        deposit_amount=property_obj.rent_amount * 2,
        status="active",
        document_url="lease_agreement.pdf"
    )
    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    # Set property to occupied
    property_obj.status = "occupied"

    # Create first rent payment invoice
    payment = Payment(
        user_id=tenant_user_id,
        property_id=req.property_id,
        agreement_id=agreement.id,
        amount=agreement.rent_amount,
        due_date=req.start_date,
        status="pending"
    )
    db.add(payment)
    
    # Remove/Delete booking request
    db.delete(req)
    db.commit()

    return agreement


@router.delete("/{request_id}")
def reject_booking_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req = db.query(BookingRequest).filter(BookingRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Booking request not found")

    db.delete(req)
    db.commit()
    return {"message": "Booking request rejected successfully"}
