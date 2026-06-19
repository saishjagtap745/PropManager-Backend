from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router
from backend.routers.users import router as users_router
from backend.routers.payments import router as payments_router
from backend.routers.agreements import router as agreements_router

app = FastAPI()

# CORS
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

# DB create tables
@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)

# ROUTES
app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(users_router)
app.include_router(payments_router)
app.include_router(agreements_router)

# HOME
@app.get("/")
def home():
    return {"message": "PropManager API Running"}