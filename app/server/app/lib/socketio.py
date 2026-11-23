"""Socket.IO server and notification realtime helpers."""
from __future__ import annotations

import logging
from typing import Any

import socketio

from app.config import settings
from app.lib.security import verify_token

logger = logging.getLogger(__name__)

_origins = settings.cors_origins_list
_cors_origins: str | list[str] = "*" if _origins == ["*"] else _origins

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=_cors_origins,
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
    max_http_buffer_size=1_000_000,
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
        cookie_header = environ.get("HTTP_COOKIE", "")
        for part in cookie_header.split(";"):
            k, _, v = part.strip().partition("=")
            if k == "access_token" and v:
                token = v
                break

    payload = verify_token(token) if token else None
    if not payload or payload.get("type") != "access":
        logger.info("Socket.IO reject sid=%s reason=unauthorized", sid)
        raise socketio.exceptions.ConnectionRefusedError("unauthorized")

    tenant_id = str(payload.get("tenant_id", ""))
    user_id = str(payload.get("sub", ""))
    if not tenant_id or not user_id:
        raise socketio.exceptions.ConnectionRefusedError("invalid_token")

    await sio.save_session(sid, {"tenant_id": tenant_id, "user_id": user_id})
    await sio.enter_room(sid, _room(tenant_id, user_id))
    await sio.enter_room(sid, _tenant_room(tenant_id))
    logger.info("Socket.IO connected sid=%s user=%s tenant=%s", sid, user_id, tenant_id)
    await sio.emit("connection:ready", {"user_id": user_id, "tenant_id": tenant_id}, to=sid)
    return True


@sio.event
async def disconnect(sid: str):
    session = await sio.get_session(sid)
    if session:
        logger.info("Socket.IO disconnected sid=%s user=%s", sid, session.get("user_id"))
    else:
        logger.info("Socket.IO disconnected sid=%s", sid)


@sio.event
async def ping(sid: str, data: dict | None = None):
    return {"ok": True, "ts": data.get("ts") if isinstance(data, dict) else None}


async def emit_to_user(tenant_id: str, user_id: str, event: str, data: dict[str, Any]) -> None:
    try:
        await sio.emit(event, data, room=_room(str(tenant_id), str(user_id)))
    except Exception:
        logger.exception("Socket.IO emit_to_user failed event=%s tenant=%s user=%s", event, tenant_id, user_id)


async def emit_to_tenant(tenant_id: str, event: str, data: dict[str, Any]) -> None:
    try:
        await sio.emit(event, data, room=_tenant_room(str(tenant_id)))
    except Exception:
        logger.exception("Socket.IO emit_to_tenant failed event=%s tenant=%s", event, tenant_id)
