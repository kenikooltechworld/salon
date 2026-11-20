"""Service layer for health and root endpoints."""
from __future__ import annotations

from app.config import settings
from app.db import ping_db


async def get_root_payload() -> dict:
    """Build payload for the root endpoint."""
    return {
        "message": settings.app_name,
        "status": "ok",
        "api_prefix": settings.api_prefix,
    }


async def get_health_payload() -> tuple[dict, int]:
    """Build health payload and HTTP status code."""
    payload: dict = {
        "service": settings.app_name,
        "environment": settings.environment,
    }

    if not settings.database_configured:
        payload["status"] = "ok"
        payload["database"] = {"status": "not_configured"}
        return payload, 200

    ok, error = await ping_db()
    if ok:
        payload["status"] = "ok"
        payload["database"] = {"status": "ok"}
        return payload, 200

    payload["status"] = "degraded"
    payload["database"] = {"status": "error"}
    if settings.debug and error:
        payload["database"]["error"] = error
    return payload, 503