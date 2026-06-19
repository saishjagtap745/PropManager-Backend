from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router
from backend.routers.users import router as users_router
from backend.routers.payments import router as payments_router
from backend.routers.agreements import router as agreements_router
from backend.routers.tenants import router as tenants_router
from backend.routers.booking_requests import router as booking_requests_router
from backend.routers.maintenance import router as maintenance_router
from backend.routers.dashboard import router as dashboard_router

app = FastAPI()

@app.get("/reset-db")
def reset_db_endpoint():
    from backend.database import Base, engine, SessionLocal
    from backend.models import User, Property, Agreement, Payment, Tenant, BookingRequest, MaintenanceTicket
    from backend.auth import hash_password
    from sqlalchemy import text
    
    # 1. Drop tables with CASCADE
    conn = engine.connect()
    try:
        for table_name in ["maintenance", "payments", "booking_requests", "agreements", "tenants", "properties", "users"]:
            conn.execute(text(f"DROP TABLE IF EXISTS {table_name} CASCADE;"))
        conn.commit()
    except Exception as e:
        conn.rollback()
        return {"error_drop": str(e)}
    finally:
        conn.close()
        
    # 2. Create tables
    Base.metadata.create_all(bind=engine)
    
    # 3. Seed
    db = SessionLocal()
    try:
        admin_pwd = hash_password("password")
        
        admin = User(name="Super Admin", email="admin@example.com", hashed_password=admin_pwd, role="admin", phone="+91 99999 88888", status="active")
        manager = User(name="Rajesh Kumar", email="rajesh@example.com", hashed_password=admin_pwd, role="manager", phone="+91 98765 43210", status="active")
        tenant1 = User(name="Arjun Sharma", email="arjun@example.com", hashed_password=admin_pwd, role="tenant", phone="+91 98765 11111", status="active")
        tenant2 = User(name="Priya Desai", email="priya@example.com", hashed_password=admin_pwd, role="tenant", phone="+91 98765 22222", status="active")
        tenant3 = User(name="Kiran Nair", email="kiran@example.com", hashed_password=admin_pwd, role="tenant", phone="+91 98765 33333", status="active")
        
        db.add_all([admin, manager, tenant1, tenant2, tenant3])
        db.commit()
        
        # Seed Tenant Profiles
        t1_profile = Tenant(user_id=tenant1.id, name=tenant1.name, email=tenant1.email, phone=tenant1.phone, emergency_contact="Amit Sharma: +91 98765 99991")
        t2_profile = Tenant(user_id=tenant2.id, name=tenant2.name, email=tenant2.email, phone=tenant2.phone, emergency_contact="Ravi Desai: +91 98765 99992")
        t3_profile = Tenant(user_id=tenant3.id, name=tenant3.name, email=tenant3.email, phone=tenant3.phone, emergency_contact="Gopal Nair: +91 98765 99993")
        db.add_all([t1_profile, t2_profile, t3_profile])
        
        # Seed Properties
        p1 = Property(title="Sunrise Apartments — B-204", description="Cozy 2BHK flat with a spacious balcony overlooking the park.", address="Koregaon Park", city="Pune", property_type="flat", bedrooms=2, bathrooms=2, rent_amount=28000, status="occupied", owner_id=manager.id)
        p2 = Property(title="Green Valley Villa — 7A", description="Luxurious 4BHK gated community villa with private garden.", address="Baner", city="Pune", property_type="villa", bedrooms=4, bathrooms=4, rent_amount=55000, status="occupied", owner_id=manager.id)
        p3 = Property(title="MG Road Commercial Space", description="Premium ground floor commercial showroom location.", address="Deccan", city="Pune", property_type="commercial", rent_amount=42000, status="vacant", owner_id=manager.id)
        p4 = Property(title="Shivaji Nagar PG Suites", description="Furnished studio spaces for students and working professionals.", address="Shivaji Nagar", city="Pune", property_type="studio", bedrooms=1, bathrooms=1, rent_amount=12000, status="occupied", owner_id=manager.id)
        db.add_all([p1, p2, p3, p4])
        db.commit()
        
        # Seed Agreements
        a1 = Agreement(user_id=tenant1.id, property_id=p1.id, start_date="2025-06-01", end_date="2026-06-01", rent_amount=28000, deposit_amount=60000, status="active", document_url="lease_b204.pdf")
        a2 = Agreement(user_id=tenant2.id, property_id=p2.id, start_date="2025-09-15", end_date="2026-09-15", rent_amount=55000, deposit_amount=110000, status="active", document_url="lease_villa7a.pdf")
        a3 = Agreement(user_id=tenant3.id, property_id=p4.id, start_date="2026-01-01", end_date="2026-12-31", rent_amount=12000, deposit_amount=25000, status="active", document_url="lease_pg.pdf")
        db.add_all([a1, a2, a3])
        db.commit()
        
        # Seed Payments
        pay1 = Payment(user_id=tenant1.id, property_id=p1.id, agreement_id=a1.id, amount=28000, status="paid", due_date="2026-06-17", payment_date="2026-06-17", payment_method="UPI")
        pay2 = Payment(user_id=tenant2.id, property_id=p2.id, agreement_id=a2.id, amount=55000, status="pending", due_date="2026-06-20")
        pay3 = Payment(user_id=tenant3.id, property_id=p4.id, agreement_id=a3.id, amount=12000, status="pending", due_date="2026-06-22")
        pay4 = Payment(user_id=tenant1.id, property_id=p1.id, agreement_id=a1.id, amount=28000, status="paid", due_date="2026-05-17", payment_date="2026-05-17", payment_method="Net Banking")
        pay5 = Payment(user_id=tenant2.id, property_id=p2.id, agreement_id=a2.id, amount=55000, status="paid", due_date="2026-05-15", payment_date="2026-05-16", payment_method="UPI")
        pay6 = Payment(user_id=tenant1.id, property_id=p1.id, agreement_id=a1.id, amount=28000, status="overdue", due_date="2026-04-17")
        db.add_all([pay1, pay2, pay3, pay4, pay5, pay6])
        
        # Seed Maintenance
        m1 = MaintenanceTicket(property_id=p1.id, description="Pipe leak in master bathroom toilet unit.", status="urgent", reported_date="2026-06-17", notes="Plumber assigned, visiting today.")
        m2 = MaintenanceTicket(property_id=p2.id, description="Power outage in kitchen heating appliance line.", status="pending", reported_date="2026-06-16", notes="Waiting for electrician slot.")
        m3 = MaintenanceTicket(property_id=p4.id, description="Common area walls repainting.", status="done", reported_date="2026-06-05", notes="Completed painting work on June 14.")
        db.add_all([m1, m2, m3])
        
        db.commit()
        return {"message": "Database reset and seeded successfully!"}
    except Exception as e:
        db.rollback()
        return {"error_seed": str(e)}
    finally:
        db.close()

@app.get("/debug-db-url")
def debug_db_url():

    import os
    from sqlalchemy import inspect
    from backend.database import engine
    db_url = os.getenv("DATABASE_URL", "not set")
    masked_url = db_url
    if "@" in db_url:
        parts = db_url.split("@")
        prefix = parts[0]
        if ":" in prefix:
            prefix_parts = prefix.split(":")
            if len(prefix_parts) > 2:
                masked_url = f"{prefix_parts[0]}:{prefix_parts[1]}:*****@{parts[1]}"
    inspector = inspect(engine)
    tables = {}
    for table_name in inspector.get_table_names():
        tables[table_name] = [col['name'] for col in inspector.get_columns(table_name)]
    return {
        "database_url": masked_url,
        "tables": tables
    }

from fastapi.responses import JSONResponse
import traceback

@app.exception_handler(Exception)
def debug_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))
        }
    )



# CORS configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "null"
    ],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB create tables on startup
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# ROUTES
app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(users_router)
app.include_router(payments_router)
app.include_router(agreements_router)
app.include_router(tenants_router)
app.include_router(booking_requests_router)
app.include_router(maintenance_router)
app.include_router(dashboard_router)

# HOME
@app.get("/")
def home():
    return {"message": "PropManager API Running"}