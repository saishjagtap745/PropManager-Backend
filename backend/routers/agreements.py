from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Agreement, Property, User, Payment
from backend.dependencies import get_current_user
from backend.schemas import AgreementCreate

router = APIRouter(
    prefix="/agreements",
    tags=["Agreements"]
)


@router.post("/")
def create_agreement(
    data: AgreementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_obj = db.query(Property).filter(
        Property.id == data.property_id
    ).first()

    if not property_obj:
        raise HTTPException(
            status_code=404,
            detail="Property not found"
        )

    # Check if property already occupied
    if property_obj.status == "occupied":
        raise HTTPException(
            status_code=400,
            detail="Property is already occupied"
        )

    agreement = Agreement(
        user_id=data.tenant_id,  # tenant's user ID
        property_id=data.property_id,
        status=data.status or "active",
        start_date=data.start_date,
        end_date=data.end_date,
        rent_amount=data.rent_amount,
        deposit_amount=data.deposit_amount,
        document_url="lease_agreement.pdf"
    )

    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    # Set property occupied
    property_obj.status = "occupied"
    
    # Create first rent payment
    first_payment = Payment(
        user_id=data.tenant_id,
        property_id=data.property_id,
        agreement_id=agreement.id,
        amount=data.rent_amount,
        status="pending",
        due_date=data.start_date
    )
    db.add(first_payment)
    db.commit()

    return {
        "message": "Agreement created successfully",
        "agreement": agreement
    }


@router.get("/")
def get_agreements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == 'tenant':
        return db.query(Agreement).filter(Agreement.user_id == current_user.id).all()
    elif current_user.role == 'manager':
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        return db.query(Agreement).filter(Agreement.property_id.in_(managed_property_ids)).all()
    else:
        return db.query(Agreement).all()


@router.get("/{agreement_id}")
def get_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="Agreement not found"
        )

    # Access scoping
    if current_user.role == 'tenant' and agreement.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    elif current_user.role == 'manager':
        property_item = db.query(Property).filter(Property.id == agreement.property_id).first()
        if not property_item or property_item.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    return agreement


@router.delete("/{agreement_id}")
def delete_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    agreement = db.query(Agreement).filter(Agreement.id == agreement_id).first()

    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="Agreement not found"
        )

    # Scoping check
    if current_user.role == 'manager':
        property_item = db.query(Property).filter(Property.id == agreement.property_id).first()
        if not property_item or property_item.owner_id != current_user.id:
            raise HTTPException(status_code=403, detail="Forbidden")

    # Set property to vacant
    property_obj = db.query(Property).filter(Property.id == agreement.property_id).first()
    if property_obj:
        property_obj.status = "vacant"

    agreement.status = "terminated"
    db.commit()

    return {
        "message": "Agreement terminated successfully"
    }