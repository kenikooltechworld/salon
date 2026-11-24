from __future__ import annotations
import uuid
from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.time_off_request_controller import TimeOffRequestController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.time_off_request import TimeOffRequestCreate

router = APIRouter(prefix='/time-off-requests', tags=['time-off-requests'])

@router.get('')
async def list_requests(staff_id: str | None = Query(None), status: str | None = Query(None), page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await TimeOffRequestController(session).list(current_user.tenant_id, staff_id, status, page, page_size)

@router.get('/{request_id}')
async def get_request(request_id: uuid.UUID, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await TimeOffRequestController(session).get(current_user.tenant_id, request_id)

@router.post('')
async def create_request(data: TimeOffRequestCreate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await TimeOffRequestController(session).create(current_user.tenant_id, data)

@router.put('/{request_id}/approve')
async def approve_request(request_id: uuid.UUID, current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    return await TimeOffRequestController(session).approve(current_user.tenant_id, request_id, current_user.id)

@router.put('/{request_id}/deny')
async def deny_request(request_id: uuid.UUID, payload: dict = Body(default={}), current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    denial_reason = (payload or {}).get('denial_reason')
    return await TimeOffRequestController(session).deny(current_user.tenant_id, request_id, current_user.id, denial_reason)
