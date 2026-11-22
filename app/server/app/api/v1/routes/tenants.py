"""Tenant routes for public recovery flows."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session
from app.models.tenant import Tenant
from app.schemas.auth import RecoverAccountRequest, RecoverAccountResponse

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.post("/recover", response_model=RecoverAccountResponse)
async def recover_tenant(
    data: RecoverAccountRequest,
    session: AsyncSession = Depends(db_session),
):
    # Minimal recovery implementation: accept signed/known token format "tenant:<subdomain>"
    # or a tenant subdomain token issued externally. For now support subdomain-based recovery token.
    token = data.recovery_token.strip()
    subdomain = token.replace("tenant:", "", 1) if token.startswith("tenant:") else token
    result = await session.execute(select(Tenant).where(Tenant.subdomain == subdomain))
    tenant = result.scalar_one_or_none()
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired recovery token")
    tenant.status = "active"
    await session.commit()
    return RecoverAccountResponse(success=True, detail="Account recovered")
