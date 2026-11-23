"""Notification routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.controllers.notification_controller import NotificationController
from app.lib.deps import db_session, get_current_user
from app.models.user import User
from app.schemas.notification import NotificationListResponse, NotificationRead

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    is_read: bool | None = Query(default=None),
    category: str | None = Query(default=None, description="Filter by category: services, appointments, commissions, system"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await NotificationController(session).list(
        current_user.tenant_id,
        current_user.id,
        is_read=is_read,
        category=category,
        page=page,
        page_size=page_size,
    )


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await NotificationController(session).mark_all_read(current_user.tenant_id, current_user.id)


@router.post("/{notification_id}/read", response_model=NotificationRead)
async def mark_read(
    notification_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(db_session),
):
    return await NotificationController(session).mark_read(
        current_user.tenant_id, notification_id, current_user.id
    )
