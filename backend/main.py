from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router

app = FastAPI()

# ----------------------
# CORS CONFIG (IMPORTANT)
# ----------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "https://prop-manager-backend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------
# CREATE TABLES ON STARTUP
# ----------------------
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# ----------------------
# ROUTERS (CORE)
# ----------------------
app.include_router(auth_router)
app.include_router(properties_router)

# ----------------------
# OPTIONAL ROUTERS (SAFE IMPORTS)
# ----------------------
try:
    from backend.routers.payments import router as payments_router
    app.include_router(payments_router)
except Exception as e:
    print("Payments router not loaded:", e)

try:
    from backend.routers.agreements import router as agreements_router
    app.include_router(agreements_router)
except Exception as e:
    print("Agreements router not loaded:", e)

try:
    from backend.routers.tenants import router as tenants_router
    app.include_router(tenants_router)
except Exception as e:
    print("Tenants router not loaded:", e)

try:
    from backend.routers.maintenance import router as maintenance_router
    app.include_router(maintenance_router)
except Exception as e:
    print("Maintenance router not loaded:", e)

# ----------------------
# HEALTH CHECK
# ----------------------
@app.get("/")
def home():
    return {
        "message": "PropManager API Running",
        "status": "success"
    }