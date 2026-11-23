"""Service commission routes."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.service_commission_controller import ServiceCommissionController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.service_commission import CommissionListResponse, CommissionSummaryResponse, ServiceCommissionRead

router = APIRouter(prefix="/service-commissions", tags=["service-commissions"])


@router.post("/calculate/{appointment_id}", response_model=ServiceCommissionRead)
async def calculate_commission(
    appointment_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceCommissionController(session).calculate(current_user.tenant_id, appointment_id)


@router.get("/staff/{staff_id}", response_model=CommissionListResponse)
async def list_staff_commissions(
    staff_id: uuid.UUID,
    status: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceCommissionController(session).list_staff(
        current_user.tenant_id,
        staff_id,
        status_filter=status,
        start_date=start_date,
        end_date=end_date,
        page=page,
        page_size=page_size,
    )


@router.get("/staff/{staff_id}/summary", response_model=CommissionSummaryResponse)
async def commission_summary(
    staff_id: uuid.UUID,
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceCommissionController(session).summary(
        current_user.tenant_id, staff_id, start_date, end_date
    )


@router.post("/{commission_id}/mark-paid", response_model=ServiceCommissionRead)
async def mark_paid(
    commission_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceCommissionController(session).mark_paid(current_user.tenant_id, commission_id, current_user.id)


@router.post("/staff/{staff_id}/mark-paid-batch")
async def mark_paid_batch(
    staff_id: uuid.UUID,
    commission_ids: list[uuid.UUID],
    current_user: User = Depends(require_roles("owner","admin","manager")),
    session: AsyncSession = Depends(db_session),
):
    return await ServiceCommissionController(session).mark_paid_batch(
        current_user.tenant_id, staff_id, commission_ids, current_user.id
    )
