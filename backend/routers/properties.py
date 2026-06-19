from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

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
        description=property_data.description,
        address=property_data.address,
        city=property_data.city,
        property_type=property_data.type,
        bedrooms=property_data.bedrooms,
        bathrooms=property_data.bathrooms,
        rent_amount=property_data.rent_amount,
        status=property_data.status or "vacant",
        owner_id=current_user.id
    )

    db.add(property_obj)
    db.commit()
    db.refresh(property_obj)

    return property_obj


# GET ALL PROPERTIES (with filters)
@router.get("/")
def get_properties(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Property)
    
    # Scoping: Managers can only see properties assigned to them
    if current_user.role == 'manager':
        query = query.filter(Property.owner_id == current_user.id)
        
    if status and status != 'all':
        query = query.filter(Property.status == status)
        
    if search:
        search_lower = f"%{search.lower()}%"
        query = query.filter(
            Property.title.ilike(search_lower) | 
            Property.address.ilike(search_lower) | 
            Property.city.ilike(search_lower)
        )
        
    return query.all()


# GET SINGLE PROPERTY
@router.get("/{property_id}")
def get_property(
    property_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_item = db.query(Property).filter(Property.id == property_id).first()
    if not property_item:
        raise HTTPException(status_code=404, detail="Property not found")
        
    if current_user.role == 'manager' and property_item.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
        
    return property_item


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

    if property_item.owner_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not allowed")

    property_item.title = updated_data.title
    property_item.description = updated_data.description
    property_item.address = updated_data.address
    property_item.city = updated_data.city
    property_item.property_type = updated_data.type
    property_item.bedrooms = updated_data.bedrooms
    property_item.bathrooms = updated_data.bathrooms
    property_item.rent_amount = updated_data.rent_amount
    property_item.status = updated_data.status or property_item.status

    db.commit()
    db.refresh(property_item)

    return property_item


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

    if property_item.owner_id != current_user.id and current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Not allowed")

    db.delete(property_item)
    db.commit()

    return {
        "message": "Property deleted successfully"
    }