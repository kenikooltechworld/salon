"""Tenant settings and dashboard endpoints."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session, get_current_user
from app.models.appointment import Appointment
from app.models.customer import Customer
from app.models.user import User
from app.schemas.auth import TenantRead, TenantSettingsUpdate
from app.services.tenant_service import TenantService

router = APIRouter(tags=["settings", "owner-dashboard"])


def _require_owner(user: User) -> None:
    if user.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def _tenant_payload(tenant) -> dict:
    data = TenantRead.model_validate(tenant).model_dump()
    # Kenikool OwnerProfile expects salon_name and subdomain_url
    data["salon_name"] = tenant.name
    data["subdomain_url"] = f"https://{tenant.subdomain}.kenikoolsalon.com" if tenant.subdomain else None
    return data


@router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return {"data": _tenant_payload(tenant)}


@router.put("/settings")
async def update_settings(
    data: TenantSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    payload = data.model_dump(exclude_unset=True)
    if "salon_name" in payload and payload["salon_name"] is not None:
        tenant.name = payload["salon_name"].strip()
    for field in ("email", "phone", "address", "description", "logo_url", "primary_color", "secondary_color"):
        if field in payload:
            setattr(tenant, field, payload[field])
    await session.commit()
    await session.refresh(tenant)
    return {"data": _tenant_payload(tenant)}


@router.get("/owner/dashboard/metrics")
async def owner_dashboard_metrics(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    _require_owner(current_user)
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    appt_count = await session.scalar(
        select(func.count(Appointment.id)).where(Appointment.tenant_id == current_user.tenant_id, Appointment.start_time >= month_start)
    )
    revenue = await session.scalar(
        select(func.coalesce(func.sum(Appointment.price), 0)).where(
            Appointment.tenant_id == current_user.tenant_id,
            Appointment.start_time >= month_start,
            Appointment.status.in_(["completed", "confirmed", "scheduled"]),
        )
    )
    customers = await session.scalar(select(func.count(Customer.id)).where(Customer.tenant_id == current_user.tenant_id))

    rev_value = float(revenue) if isinstance(revenue, Decimal) else float(revenue or 0)
    return {
        "data": {
            "appointments": {"thisMonth": int(appt_count or 0)},
            "revenue": {"current": rev_value},
            "customers": {"total": int(customers or 0)},
        }
    }


@router.get("/owner/dashboard/pending-actions")
async def owner_dashboard_pending_actions(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    _require_owner(current_user)
    now = datetime.now(timezone.utc)
    pending = await session.scalar(
        select(func.count(Appointment.id)).where(
            Appointment.tenant_id == current_user.tenant_id,
            Appointment.status.in_(["scheduled", "pending"]),
            Appointment.start_time >= now - timedelta(days=1),
        )
    )
    return {"data": {"total": int(pending or 0)}}


