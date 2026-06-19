from fastapi import FastAPI

from backend.database import engine
from backend.models import Base

from backend.routers.auth import router as auth_router
from backend.routers.properties import router as properties_router


app = FastAPI()


# ----------------------
# CREATE TABLES SAFELY
# ----------------------
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


# ----------------------
# ROUTERS
# ----------------------
app.include_router(auth_router)
app.include_router(properties_router)


# OPTIONAL ROUTERS (ONLY IF THEY EXIST PROPERLY)
try:
    from backend.routers.payments import router as payments_router
    app.include_router(payments_router)
except:
    print("Payments router not loaded")

try:
    from backend.routers.agreements import router as agreements_router
    app.include_router(agreements_router)
except:
    print("Agreements router not loaded")


# ----------------------
# HOME
# ----------------------
@app.get("/")
def home():
    return {"message": "PropManager API Running"}


from backend.routers.agreements import router as agreements_router

app.include_router(agreements_router)