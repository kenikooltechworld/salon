"""Controller layer for health and root endpoints."""
from __future__ import annotations

from fastapi.responses import JSONResponse

from app.services.health_service import get_health_payload, get_root_payload


async def root():
    """Handle root request."""
    return await get_root_payload()


async def health():
    """Handle health check request."""
    payload, status_code = await get_health_payload()
    if status_code == 200:
        return payload
    return JSONResponse(status_code=status_code, content=payload)