"""CSRF protection for cookie-authenticated state-changing requests."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, Request, status
from sqlalchemy import select

from app.db import get_session_factory
from app.lib.security import hash_token


SAFE_METHODS = {"GET", "HEAD", "OPTIONS", "TRACE"}
EXEMPT_PATHS = {
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/forgot-password",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/mfa/validate",
    "/api/v1/auth/verify-email",
    "/api/v1/auth/send-verification",
    "/api/v1/auth/refresh",
    "/api/v1/auth/csrf-token",
    "/api/v1/tenants/request-recovery",
    "/api/v1/tenants/recover",
    "/health",
    "/",
}


def _is_cookie_auth(request: Request) -> bool:
    return bool(request.cookies.get("access_token") or request.cookies.get("refresh_token") or request.cookies.get("mfa_pending"))


async def enforce_csrf(request: Request) -> None:
    if request.method.upper() in SAFE_METHODS:
        return
    path = request.url.path.rstrip("/") or "/"
    if path in EXEMPT_PATHS:
        return
    if not _is_cookie_auth(request):
        return
    cookie_token = request.cookies.get("csrf_token")
    header_token = request.headers.get("x-csrf-token")
    if not cookie_token or not header_token or cookie_token != header_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")

    session_id = request.cookies.get("session_id")
    if session_id:
        from app.models.session import Session

        try:
            import uuid

            sid = uuid.UUID(session_id)
        except Exception:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")
        factory = get_session_factory()
        async with factory() as db:
            row = (
                await db.execute(
                    select(Session).where(Session.id == sid, Session.status == "active")
                )
            ).scalar_one_or_none()
            if row is None or row.expires_at < datetime.now(timezone.utc):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")
            if row.csrf_token_hash != hash_token(header_token):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF validation failed")
