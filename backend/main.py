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