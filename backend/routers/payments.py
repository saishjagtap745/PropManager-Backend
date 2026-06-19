from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, Dict, Any

from backend.database import get_db
from backend.models import Payment, User, Agreement, Property
from backend.schemas import PaymentCreate
from backend.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/")
def create_payment(
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = Payment(
        user_id=current_user.id,
        property_id=data.property_id,
        agreement_id=data.agreement_id,
        amount=data.amount,
        status="pending",
        due_date=data.due_date
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment


@router.get("/")
def get_payments(
    agreementId: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Payment)
    
    if agreementId:
        query = query.filter(Payment.agreement_id == agreementId)
        
    # Role Scoping
    if current_user.role == 'tenant':
        query = query.filter(Payment.user_id == current_user.id)
    elif current_user.role == 'manager':
        # Find property IDs managed by manager
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        query = query.filter(Payment.property_id.in_(managed_property_ids))
        
    return query.all()


@router.put("/{payment_id}")
def record_payment(
    payment_id: int,
    payment_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
        
    # Optional Manager scoping check
    if current_user.role == 'manager':
        property_item = db.query(Property).filter(Property.id == payment.property_id).first()
        if property_item and property_item.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    payment.status = "paid"
    payment.payment_date = datetime.utcnow().strftime("%Y-%m-%d")
    payment.payment_method = payment_data.get("payment_method", "UPI")
    
    db.commit()
    db.refresh(payment)
    return payment