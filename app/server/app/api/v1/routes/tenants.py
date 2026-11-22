"""Tenant routes for public recovery flows."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session
from app.lib.rate_limit import enforce_rate_limit
from app.lib.security import generate_secure_token, hash_token
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    RecoverAccountRequest,
    RecoverAccountResponse,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])

RECOVERY_TTL_HOURS = 24


@router.post("/request-recovery", response_model=ForgotPasswordResponse)
async def request_tenant_recovery(
    data: ForgotPasswordRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    """Request account recovery by owner email. Always returns generic response."""
    enforce_rate_limit(request, "tenant:request-recovery", limit=5, window_seconds=600)
    enforce_rate_limit(request, "tenant:request-recovery:email", limit=3, window_seconds=3600, identifier=str(data.email).lower())
    result = await session.execute(select(User).where(User.email == data.email, User.role == "owner"))
    user = result.scalar_one_or_none()
    if user is not None and user.status == "active":
        tenant_result = await session.execute(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant = tenant_result.scalar_one_or_none()
        if tenant is not None:
            raw = generate_secure_token(32)
            tenant.recovery_token_hash = hash_token(raw)
            tenant.recovery_token_expires_at = datetime.now(timezone.utc) + timedelta(hours=RECOVERY_TTL_HOURS)
            tenant.recovery_requested_at = datetime.now(timezone.utc)
            await session.commit()

            from app.config import settings
            from app.services.email_service import account_recovery_email_html, send_email

            base = str(settings.frontend_url).rstrip("/")
            link = f"{base}/auth/account-recovery?token={raw}"
            try:
                await send_email(user.email, "Recover your Kenikool Salon account", account_recovery_email_html(link, RECOVERY_TTL_HOURS), required=True)
            except Exception:
                # Keep generic response; token remains valid so user can retry request later or support can assist.
                pass

    return ForgotPasswordResponse(message="If the account exists, a recovery link has been sent")


@router.post("/recover", response_model=RecoverAccountResponse)
async def recover_tenant(
    data: RecoverAccountRequest,
    request: Request,
    session: AsyncSession = Depends(db_session),
):
    enforce_rate_limit(request, "tenant:recover", limit=10, window_seconds=600)
    token = data.recovery_token.strip()
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid recovery token")

    token_hash = hash_token(token)
    result = await session.execute(select(Tenant).where(Tenant.recovery_token_hash == token_hash))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired recovery token")

    expires = tenant.recovery_token_expires_at
    if expires is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired recovery token")
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired recovery token")

    tenant.status = "active"
    tenant.recovery_token_hash = None
    tenant.recovery_token_expires_at = None
    tenant.recovery_requested_at = None

    # Reset lockout for owner accounts on successful recovery as a safe recovery action.
    owner_result = await session.execute(select(User).where(User.tenant_id == tenant.id, User.role == "owner"))
    for owner in owner_result.scalars().all():
        owner.failed_login_attempts = 0
        owner.locked_until = None

    await session.commit()
    return RecoverAccountResponse(success=True, detail="Account recovered successfully")
