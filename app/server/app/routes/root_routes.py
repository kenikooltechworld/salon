"""Root-level HTTP routes."""
from __future__ import annotations

from fastapi import APIRouter

from app.controllers import health_controller

router = APIRouter()


@router.get("/")
async def root():
    return await health_controller.root()


@router.get("/health")
async def health():
    return await health_controller.health()