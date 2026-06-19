from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Agreement, Property, User
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

    agreement = Agreement(
        user_id=current_user.id,
        property_id=data.property_id,
        status=data.status
    )

    db.add(agreement)
    db.commit()
    db.refresh(agreement)

    return {
        "message": "Agreement created successfully",
        "agreement": agreement
    }


@router.get("/")
def get_agreements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Agreement).filter(
        Agreement.user_id == current_user.id
    ).all()


@router.get("/{agreement_id}")
def get_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    agreement = db.query(Agreement).filter(
        Agreement.id == agreement_id,
        Agreement.user_id == current_user.id
    ).first()

    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="Agreement not found"
        )

    return agreement


@router.delete("/{agreement_id}")
def delete_agreement(
    agreement_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    agreement = db.query(Agreement).filter(
        Agreement.id == agreement_id,
        Agreement.user_id == current_user.id
    ).first()

    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="Agreement not found"
        )

    db.delete(agreement)
    db.commit()

    return {
        "message": "Agreement deleted successfully"
    }