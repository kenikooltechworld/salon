"""Tenant routes for public recovery flows."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session
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
            from app.services.email_service import send_email

            base = str(settings.frontend_url).rstrip("/")
            link = f"{base}/auth/account-recovery?token={raw}"
            html = f"""
            <div style=\"font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px\">
              <h2>Recover your salon account</h2>
              <p>We received a request to recover your Kenikool Salon account.</p>
              <p><a href=\"{link}\" style=\"display:inline-block;padding:12px 18px;background:#0b6cfb;color:#fff;text-decoration:none;border-radius:8px\">Recover account</a></p>
              <p style=\"color:#555;font-size:14px\">Or copy this link:<br><span style=\"word-break:break-all\">{link}</span></p>
              <p style=\"color:#555;font-size:14px\">This link expires in {RECOVERY_TTL_HOURS} hours. If you did not request this, ignore this email.</p>
            </div>
            """
            await send_email(user.email, "Recover your Kenikool Salon account", html)

    return ForgotPasswordResponse(message="If the account exists, a recovery link has been sent")


@router.post("/recover", response_model=RecoverAccountResponse)
async def recover_tenant(
    data: RecoverAccountRequest,
    session: AsyncSession = Depends(db_session),
):
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
    await session.commit()
    return RecoverAccountResponse(success=True, detail="Account recovered successfully")
