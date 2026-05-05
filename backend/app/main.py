import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import close_pool
from .routers import auth as auth_router
from .routers import etl as etl_router
from .routers import dashboard
from .routers import notifications
from .routers import settings

API_PREFIX = os.getenv("API_PREFIX", "/api/v1")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in CORS_ORIGINS.split(",")] if CORS_ORIGINS else ["*"]

app = FastAPI(
    title="Optina Dashboard API",
    version="1.0.0",
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url=f"{API_PREFIX}/docs",
    redoc_url=f"{API_PREFIX}/redoc",
)

app.include_router(auth_router.router, prefix=f"{API_PREFIX}/auth")
app.include_router(etl_router.router) # ETL routes are internal/custom
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=f"{API_PREFIX}/notifications", tags=["Notifications"])
app.include_router(settings.router, prefix=f"{API_PREFIX}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def _startup():
    from . import db
    pool = await db.get_pool()
    async with pool.acquire() as conn:
        try:
            await conn.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;")
        except Exception as e:
            print(f"Startup migration warning: {e}")

@app.on_event("shutdown")
async def _shutdown():
    await close_pool()

