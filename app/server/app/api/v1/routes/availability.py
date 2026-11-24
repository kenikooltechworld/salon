"""Availability routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.availability import (
    AvailabilityCreateRequest,
    AvailabilityListResponse,
    AvailabilityResponse,
    AvailabilityUpdateRequest,
    AvailableSlotsResponse,
)
from app.services.availability_service import AvailabilityService

router = APIRouter(prefix="/availability", tags=["availability"])


@router.post("", response_model=AvailabilityResponse)
async def create_availability(
    data: AvailabilityCreateRequest,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    svc = AvailabilityService(session)
    row = await svc.create(current_user.tenant_id, data)
    await session.commit()
    return row


@router.get("/slots/available", response_model=AvailableSlotsResponse)
async def get_available_slots(
    staff_id: str = Query(...),
    service_id: str = Query(...),
    target_date: str = Query(...),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    from datetime import datetime
    try:
        staff_uuid = uuid.UUID(staff_id)
        service_uuid = uuid.UUID(service_id)
        date_obj = datetime.strptime(target_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid staff_id, service_id, or target_date")
    svc = AvailabilityService(session)
    slots = await svc.get_available_slots(current_user.tenant_id, staff_uuid, service_uuid, date_obj)
    return {"date": target_date, "slots": slots, "staff_id": staff_id, "total_slots": len(slots)}


@router.get("/{availability_id}", response_model=AvailabilityResponse)
async def get_availability(
    availability_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    svc = AvailabilityService(session)
    row = await svc.get(current_user.tenant_id, availability_id)
    if not row:
        raise HTTPException(status_code=404, detail="Availability not found")
    return row


@router.get("", response_model=AvailabilityListResponse)
async def list_availability(
    staff_id: str | None = Query(None),
    is_recurring: bool | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    svc = AvailabilityService(session)
    return await svc.list(current_user.tenant_id, staff_id, is_recurring, is_active, page, page_size)


@router.put("/{availability_id}", response_model=AvailabilityResponse)
async def update_availability(
    availability_id: uuid.UUID,
    data: AvailabilityUpdateRequest,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    svc = AvailabilityService(session)
    row = await svc.update(current_user.tenant_id, availability_id, data)
    if not row:
        raise HTTPException(status_code=404, detail="Availability not found")
    await session.commit()
    return row


@router.delete("/{availability_id}")
async def delete_availability(
    availability_id: uuid.UUID,
    current_user: User = Depends(require_roles("owner", "admin", "manager", "staff")),
    session: AsyncSession = Depends(db_session),
):
    svc = AvailabilityService(session)
    ok = await svc.delete(current_user.tenant_id, availability_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Availability not found")
    await session.commit()
    return {"message": "Availability deleted successfully"}
