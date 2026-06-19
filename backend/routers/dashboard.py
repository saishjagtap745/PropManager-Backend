from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from backend.database import get_db
from backend.models import Property, User, Agreement, Payment, MaintenanceTicket, Tenant
from backend.dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/{role}")
def get_dashboard_data(
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if role != current_user.role:
        raise HTTPException(status_code=403, detail="Role mismatch")

    if role == 'admin' or role == 'manager':
        # Filter properties by scope
        if role == 'manager':
            properties = db.query(Property).filter(Property.owner_id == current_user.id).all()
        else:
            properties = db.query(Property).all()

        total_props = len(properties)
        occupied_props = len([p for p in properties if p.status == 'occupied'])
        occupancy_pct = round((occupied_props / total_props * 100)) if total_props > 0 else 0

        # Scoped payments
        prop_ids = [p.id for p in properties]
        payments = db.query(Payment).filter(Payment.property_id.in_(prop_ids)).all() if prop_ids else []

        collected_this_month = sum([p.amount for p in payments if p.status == 'paid'])
        pending_this_month = sum([p.amount for p in payments if p.status != 'paid'])

        # Maintenance tickets
        tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.property_id.in_(prop_ids)).all() if prop_ids else []
        open_tickets = len([t for t in tickets if t.status != 'done'])
        urgent_tickets = len([t for t in tickets if t.status == 'urgent'])

        # Due rents list (top 4 unpaid payments)
        due_rents_raw = db.query(Payment).filter(
            Payment.property_id.in_(prop_ids),
            Payment.status != 'paid'
        ).limit(4).all() if prop_ids else []

        due_rents = []
        for p in due_rents_raw:
            tenant_user = db.query(User).filter(User.id == p.user_id).first()
            tenant_name = tenant_user.name if tenant_user else "Unknown Tenant"
            due_rents.append({
                "id": p.id,
                "tenantName": tenant_name,
                "dueDate": p.due_date or "N/A",
                "amount": f"₹{(p.amount/1000):.1f}K",
                "status": p.status
            })

        # Recent activities dynamically compiled
        recent_activity = []
        recent_payments = db.query(Payment).filter(
            Payment.property_id.in_(prop_ids),
            Payment.status == 'paid'
        ).order_by(Payment.id.desc()).limit(3).all() if prop_ids else []

        for p in recent_payments:
            tenant_user = db.query(User).filter(User.id == p.user_id).first()
            tenant_name = tenant_user.name if tenant_user else "Tenant"
            prop_item = db.query(Property).filter(Property.id == p.property_id).first()
            prop_title = prop_item.title if prop_item else "Unit"
            recent_activity.append({
                "id": f"act-p-{p.id}",
                "text": f"Rent received from <strong>{tenant_name}</strong> ({prop_title}) — ₹{p.amount:,}",
                "time": "Just now",
                "type": "payment"
            })

        recent_agreements = db.query(Agreement).filter(
            Agreement.property_id.in_(prop_ids)
        ).order_by(Agreement.id.desc()).limit(2).all() if prop_ids else []

        for a in recent_agreements:
            tenant_user = db.query(User).filter(User.id == a.user_id).first()
            tenant_name = tenant_user.name if tenant_user else "Tenant"
            recent_activity.append({
                "id": f"act-a-{a.id}",
                "text": f"Lease agreement activated — <strong>{tenant_name}</strong>",
                "time": "Recent",
                "type": "agreement"
            })

        if not recent_activity:
            recent_activity = [
                {"id": "act-1", "text": "Dashboard initialized. Ready for operations.", "time": "Just now", "type": "info"}
            ]

        return {
            "kpi": {
                "totalProperties": total_props,
                "occupancyRate": f"{occupancy_pct}%",
                "rentCollected": f"₹{(collected_this_month/100000):.1f}L" if collected_this_month >= 100000 else f"₹{collected_this_month:,}",
                "pendingRent": f"₹{(pending_this_month/1000):.0f}K" if pending_this_month >= 1000 else f"₹{pending_this_month:,}",
                "openTickets": open_tickets,
                "urgentTickets": urgent_tickets
            },
            "dueRents": due_rents,
            "recentActivity": recent_activity,
            "collectionTrend": [55, 60, 50, 65, 58, 70]
        }

    elif role == 'tenant':
        # Find active lease agreement
        active_agr = db.query(Agreement).filter(
            Agreement.user_id == current_user.id,
            Agreement.status == 'active'
        ).first()

        prop = db.query(Property).filter(Property.id == active_agr.property_id).first() if active_agr else None

        payments_raw = db.query(Payment).filter(Payment.user_id == current_user.id).order_by(Payment.id.desc()).all()
        next_due_raw = db.query(Payment).filter(
            Payment.user_id == current_user.id,
            Payment.status != 'paid'
        ).first()

        maintenance_raw = db.query(MaintenanceTicket).filter(
            MaintenanceTicket.property_id == active_agr.property_id
        ).all() if active_agr else []

        # Find manager details
        manager_name = "Rajesh Kumar"
        manager_email = "rajesh@example.com"
        manager_phone = "+91 98765 43210"
        if prop:
            mgr = db.query(User).filter(User.id == prop.owner_id).first()
            if mgr:
                manager_name = mgr.name
                manager_email = mgr.email
                manager_phone = mgr.phone or "+91 98765 43210"

        lease_data = None
        if active_agr:
            lease_data = {
                "id": active_agr.id,
                "propertyName": prop.title if prop else "Leased Unit",
                "address": f"{prop.address}, {prop.city}" if prop else "",
                "rent": f"₹{active_agr.rent_amount:,}",
                "deposit": f"₹{active_agr.deposit_amount:,}",
                "startDate": active_agr.start_date,
                "endDate": active_agr.end_date,
                "status": active_agr.status
            }

        next_payment_data = None
        if next_due_raw:
            next_payment_data = {
                "amount": f"₹{next_due_raw.amount:,}",
                "dueDate": next_due_raw.due_date or "N/A",
                "status": next_due_raw.status
            }

        return {
            "lease": lease_data,
            "nextPayment": next_payment_data,
            "payments": [
                {
                    "due_date": p.due_date,
                    "amount": p.amount,
                    "status": p.status,
                    "payment_date": p.payment_date
                } for p in payments_raw[:5]
            ],
            "maintenanceTickets": [
                {
                    "description": t.description,
                    "reported_date": t.reported_date,
                    "status": t.status,
                    "notes": t.notes
                } for t in maintenance_raw[:5]
            ],
            "contacts": {
                "manager": {"name": manager_name, "email": manager_email, "phone": manager_phone},
                "owner": {"name": "Super Admin", "email": "admin@example.com", "phone": "+91 99999 88888"}
            }
        }
    
    return {}
