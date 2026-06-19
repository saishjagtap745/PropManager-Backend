from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router

app = FastAPI()

# ----------------------
# CORS CONFIG
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
# ROUTERS (ONLY EXISTING)
# ----------------------
app.include_router(auth_router)
app.include_router(properties_router)

# ----------------------
# HEALTH CHECK
# ----------------------
@app.get("/")
def home():
    return {
        "message": "PropManager API Running",
        "status": "success"
    }