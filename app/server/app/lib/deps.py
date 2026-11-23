"""FastAPI dependencies."""
from __future__ import annotations

import uuid
from typing import AsyncGenerator, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.lib.cookies import clear_auth_cookies, cookie_kwargs
from app.lib.security import verify_token
from app.models.user import User
from app.services.auth_service import AuthService

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session


async def get_current_user(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(db_session),
) -> User:
    access_token = request.cookies.get(ACCESS_COOKIE)
    refresh_token = request.cookies.get(REFRESH_COOKIE)

    payload = verify_token(access_token) if access_token else None

    # Try refresh if access token invalid/missing but refresh present
    if (not payload or payload.get("type") != "access") and refresh_token:
        refresh_payload = verify_token(refresh_token)
        if refresh_payload and refresh_payload.get("type") == "refresh":
            from app.config import settings
            from app.lib.security import create_access_token

            user_id_raw = refresh_payload.get("sub")
            tenant_id_raw = refresh_payload.get("tenant_id")
            try:
                user_id = uuid.UUID(str(user_id_raw))
                tenant_id = uuid.UUID(str(tenant_id_raw))
            except (ValueError, TypeError):
                user_id = None
                tenant_id = None

            if user_id and tenant_id:
                service = AuthService(session)
                user = await service.get_user_by_id(user_id)
                if user is not None and user.tenant_id == tenant_id and user.status == "active":
                    new_access = create_access_token(
                        user_id=str(user.id),
                        tenant_id=str(user.tenant_id),
                        email=user.email,
                        role=user.role,
                    )
                    kwargs = cookie_kwargs(request)
                    response.set_cookie(
                        key=ACCESS_COOKIE,
                        value=new_access,
                        max_age=settings.jwt_access_token_expire_minutes * 60,
                        **kwargs,
                    )
                    payload = verify_token(new_access)

    if not payload or payload.get("type") != "access":
        clear_auth_cookies(response, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    try:
        user_id = uuid.UUID(str(payload.get("sub")))
        tenant_id = uuid.UUID(str(payload.get("tenant_id")))
    except (ValueError, TypeError):
        clear_auth_cookies(response, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    service = AuthService(session)
    user = await service.get_user_by_id(user_id)
    if user is None or user.tenant_id != tenant_id or user.status != "active":
        clear_auth_cookies(response, request)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_roles(*roles: str):
    allowed = {r.strip().lower() for r in roles if r and r.strip()}

    async def _dep(current_user: User = Depends(get_current_user)) -> User:
        if allowed and str(current_user.role).lower() not in allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return current_user

    return _dep
