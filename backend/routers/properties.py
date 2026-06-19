from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Property, User
from backend.schemas import PropertyCreate
from backend.dependencies import get_current_user

router = APIRouter(
    prefix="/properties",
    tags=["Properties"]
)


# CREATE PROPERTY (JWT protected)
@router.post("/")
def create_property(
    property_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_obj = Property(
        title=property_data.title,
        address=property_data.address,
        property_type=property_data.property_type,
        rent_amount=property_data.rent_amount,
        owner_id=current_user.id
    )

    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)

    return property_obj


# GET ALL PROPERTIES (public or protected optional)
@router.get("/")
def get_properties(db: Session = Depends(get_db)):
    return db.query(Property).all()


# UPDATE PROPERTY (JWT protected)
@router.put("/{property_id}")
def update_property(
    property_id: int,
    updated_data: PropertyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_item = db.query(Property).filter(Property.id == property_id).first()

    if not property_item:
        raise HTTPException(status_code=404, detail="Property not found")

    # OPTIONAL: ownership check (recommended)
    if property_item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    property_item.title = updated_data.title
    property_item.address = updated_data.address
    property_item.property_type = updated_data.property_type
    property_item.rent_amount = updated_data.rent_amount

    db.commit()
    db.refresh(property_item)

    return {
        "message": "Property updated successfully",
        "property": property_item
    }


# DELETE PROPERTY (JWT protected)
@router.delete("/{property_id}")
def delete_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_item = db.query(Property).filter(Property.id == property_id).first()

    if not property_item:
        raise HTTPException(status_code=404, detail="Property not found")

    # OPTIONAL: ownership check (recommended)
    if property_item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(property_item)
    db.commit()

    return {
        "message": "Property deleted successfully"
    }