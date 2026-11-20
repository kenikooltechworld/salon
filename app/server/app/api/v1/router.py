"""API v1 router aggregation."""
from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.routes import health as health_routes

api_router = APIRouter()
api_router.include_router(health_routes.router)