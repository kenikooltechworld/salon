"""API v1 health routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.controllers import health_controller

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return await health_controller.health()