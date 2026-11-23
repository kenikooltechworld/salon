"""Socket.IO server and notification realtime helpers."""
from __future__ import annotations

import logging
from typing import Any

import socketio

from app.lib.security import verify_token

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


def _room(tenant_id: str, user_id: str) -> str:
    return f"tenant:{tenant_id}:user:{user_id}"


def _tenant_room(tenant_id: str) -> str:
    return f"tenant:{tenant_id}"


@sio.event
async def connect(sid: str, environ: dict, auth: dict | None = None):
    token = None
    if isinstance(auth, dict):
        token = auth.get("token") or auth.get("access_token")
    if not token:
        # Fallback: cookie header
        cookie_header = environ.get("HTTP_COOKIE", "")
        for part in cookie_header.split(";"):
            k, _, v = part.strip().partition("=")
            if k == "access_token" and v:
                token = v
                break

    payload = verify_token(token) if token else None
    if not payload or payload.get("type") != "access":
        logger.info("Socket.IO reject sid=%s reason=unauthorized", sid)
        return False

    tenant_id = str(payload.get("tenant_id", ""))
    user_id = str(payload.get("sub", ""))
    if not tenant_id or not user_id:
        return False

    await sio.save_session(sid, {"tenant_id": tenant_id, "user_id": user_id})
    await sio.enter_room(sid, _room(tenant_id, user_id))
    await sio.enter_room(sid, _tenant_room(tenant_id))
    logger.info("Socket.IO connected sid=%s user=%s tenant=%s", sid, user_id, tenant_id)
    return True


@sio.event
async def disconnect(sid: str):
    logger.info("Socket.IO disconnected sid=%s", sid)


async def emit_to_user(tenant_id: str, user_id: str, event: str, data: dict[str, Any]) -> None:
    await sio.emit(event, data, room=_room(str(tenant_id), str(user_id)))


async def emit_to_tenant(tenant_id: str, event: str, data: dict[str, Any]) -> None:
    await sio.emit(event, data, room=_tenant_room(str(tenant_id)))
