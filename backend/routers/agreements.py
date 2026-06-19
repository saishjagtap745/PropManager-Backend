from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Agreement, Property, User, Payment, Tenant
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

    tenant = db.query(Tenant).filter(Tenant.id == data.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant profile not found"
        )
    tenant_user_id = tenant.user_id

    agreement = Agreement(
        user_id=tenant_user_id,
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
        user_id=tenant_user_id,
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
        "agreement": {
            "id": agreement.id,
            "property_id": agreement.property_id,
            "tenant_id": data.tenant_id,
            "user_id": agreement.user_id,
            "status": agreement.status,
            "start_date": agreement.start_date,
            "end_date": agreement.end_date,
            "rent_amount": agreement.rent_amount,
            "deposit_amount": agreement.deposit_amount,
            "document_url": agreement.document_url
        }
    }


@router.get("/")
def get_agreements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == 'tenant':
        agreements = db.query(Agreement).filter(Agreement.user_id == current_user.id).all()
    elif current_user.role == 'manager':
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        agreements = db.query(Agreement).filter(Agreement.property_id.in_(managed_property_ids)).all()
    else:
        agreements = db.query(Agreement).all()

    res = []
    for a in agreements:
        tenant = db.query(Tenant).filter(Tenant.user_id == a.user_id).first()
        payments = db.query(Payment).filter(Payment.agreement_id == a.id, Payment.status != 'paid').all()
        outstanding_balance = sum([p.amount for p in payments])
        res.append({
            "id": a.id,
            "property_id": a.property_id,
            "tenant_id": tenant.id if tenant else None,
            "user_id": a.user_id,
            "status": a.status,
            "start_date": a.start_date,
            "end_date": a.end_date,
            "rent_amount": a.rent_amount,
            "deposit_amount": a.deposit_amount,
            "document_url": a.document_url,
            "outstanding_balance": outstanding_balance
        })
    return res


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

    tenant = db.query(Tenant).filter(Tenant.user_id == agreement.user_id).first()
    payments = db.query(Payment).filter(Payment.agreement_id == agreement.id, Payment.status != 'paid').all()
    outstanding_balance = sum([p.amount for p in payments])

    return {
        "id": agreement.id,
        "property_id": agreement.property_id,
        "tenant_id": tenant.id if tenant else None,
        "user_id": agreement.user_id,
        "status": agreement.status,
        "start_date": agreement.start_date,
        "end_date": agreement.end_date,
        "rent_amount": agreement.rent_amount,
        "deposit_amount": agreement.deposit_amount,
        "document_url": agreement.document_url,
        "outstanding_balance": outstanding_balance
    }



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