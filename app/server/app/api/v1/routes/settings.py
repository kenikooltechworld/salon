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
from app.schemas.auth import TenantRead
from app.schemas.tenant_settings import CommissionSettingsSchema, FinancialConfigSchema, OperationalConfigSchema, TenantSettingsSchema
from app.services.tenant_service import TenantService
from app.services.tenant_settings_service import (
    commission_settings_payload,
    financial_settings_payload,
    operational_settings_payload,
    reset_tenant_settings,
    tenant_settings_payload_async,
    update_commission_settings,
    update_financial_settings,
    update_operational_settings,
    update_tenant_settings,
)

router = APIRouter(tags=["settings", "owner-dashboard"])


def _require_owner(user: User) -> None:
    if user.role not in {"owner", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


@router.get("/settings")
async def get_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await tenant_settings_payload_async(session, tenant)


@router.put("/settings")
async def update_settings(
    data: TenantSettingsSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await update_tenant_settings(session, tenant, data.model_dump())


@router.post("/settings/reset")
async def reset_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await reset_tenant_settings(session, tenant)


@router.get("/billing/subscription")
async def get_billing_subscription(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    payload = (await tenant_settings_payload_async(session, tenant))["data"]
    return {
        "data": {
            "plan_name": payload.get("plan_name"),
            "billing_cycle": payload.get("billing_cycle"),
            "status": payload.get("status"),
            "subscription_status": payload.get("subscription_status"),
            "subscription_tier": payload.get("subscription_tier"),
            "trial_end": payload.get("trial_end"),
            "next_billing_date": payload.get("next_billing_date"),
            "current_period_end": payload.get("current_period_end"),
            "is_trial": payload.get("is_trial"),
        }
    }


@router.get("/settings/commission")
async def get_commission_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return commission_settings_payload(tenant)


@router.put("/settings/commission")
async def put_commission_settings(
    data: CommissionSettingsSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await update_commission_settings(session, tenant, data.model_dump())


@router.get("/settings/financial")
async def get_financial_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return financial_settings_payload(tenant)


@router.put("/settings/financial")
async def put_financial_settings(
    data: FinancialConfigSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await update_financial_settings(session, tenant, data.model_dump())


@router.get("/settings/operational")
async def get_operational_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return operational_settings_payload(tenant)


@router.put("/settings/operational")
async def put_operational_settings(
    data: OperationalConfigSchema,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    _require_owner(current_user)
    tenant = await TenantService.get_tenant(session, current_user.tenant_id)
    if tenant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return await update_operational_settings(session, tenant, data.model_dump())


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
