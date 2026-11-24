from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.shift_controller import ShiftController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftRead, ShiftListResponse

router = APIRouter(prefix='/shifts', tags=['shifts'])

@router.get('', response_model=ShiftListResponse)
async def list_shifts(staff_id: str | None = Query(None), status: str | None = Query(None), page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=100), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await ShiftController(session).list(current_user.tenant_id, staff_id, status, page, page_size)

@router.get('/{shift_id}', response_model=ShiftRead)
async def get_shift(shift_id: uuid.UUID, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await ShiftController(session).get(current_user.tenant_id, shift_id)

@router.post('', response_model=ShiftRead)
async def create_shift(data: ShiftCreate, current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    return await ShiftController(session).create(current_user.tenant_id, data)

@router.put('/{shift_id}', response_model=ShiftRead)
async def update_shift(shift_id: uuid.UUID, data: ShiftUpdate, current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    return await ShiftController(session).update(current_user.tenant_id, shift_id, data)

@router.delete('/{shift_id}')
async def delete_shift(shift_id: uuid.UUID, current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    return await ShiftController(session).delete(current_user.tenant_id, shift_id)
