from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import MaintenanceTicket, Property, User, Agreement, Tenant
from backend.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get("/")
def get_maintenance_tickets(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == 'manager':
        managed_property_ids = [p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()]
        return db.query(MaintenanceTicket).filter(MaintenanceTicket.property_id.in_(managed_property_ids)).all()
    elif current_user.role == 'tenant':
        # Find tenant's active leased property
        agreement = db.query(Agreement).filter(
            Agreement.user_id == current_user.id,
            Agreement.status == 'active'
        ).first()
        if agreement:
            return db.query(MaintenanceTicket).filter(MaintenanceTicket.property_id == agreement.property_id).all()
        return []
    else:
        return db.query(MaintenanceTicket).all()


@router.post("/")
def create_maintenance_ticket(
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    property_id = data.get("property_id")
    # If not provided, find it from current tenant user's lease
    if not property_id:
        agreement = db.query(Agreement).filter(
            Agreement.user_id == current_user.id,
            Agreement.status == 'active'
        ).first()
        if agreement:
            property_id = agreement.property_id
        else:
            raise HTTPException(status_code=400, detail="No active lease found to report maintenance")

    new_ticket = MaintenanceTicket(
        property_id=property_id,
        description=data.get("description"),
        status=data.get("status", "pending"),
        reported_date=datetime.utcnow().strftime("%Y-%m-%d"),
        notes=data.get("notes", "Ticket submitted.")
    )
    db.add(new_ticket)
    db.commit()
    db.refresh(new_ticket)
    return new_ticket


@router.put("/{ticket_id}")
def update_maintenance_ticket(
    ticket_id: int,
    data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(MaintenanceTicket).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Maintenance ticket not found")

    ticket.status = data.get("status", ticket.status)
    ticket.notes = data.get("notes", ticket.notes)
    
    db.commit()
    db.refresh(ticket)
    return ticket
