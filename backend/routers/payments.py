from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Payment, User
from backend.schemas import PaymentCreate
from backend.dependencies import get_current_user

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
        amount=data.amount,
        status="pending"
    )

    db.add(payment)
    db.commit()
    db.refresh(payment)

    return payment