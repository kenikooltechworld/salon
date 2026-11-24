from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.staff_settings_controller import StaffSettingsController
from app.lib.deps import db_session, get_current_user
from app.models.user import User
from app.schemas.staff_settings import StaffSettingsRead, StaffSettingsUpdate

router = APIRouter(prefix='/staff/settings', tags=['staff-settings'])

@router.get('', response_model=StaffSettingsRead)
async def get_staff_settings(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await StaffSettingsController(session).get(current_user.tenant_id, current_user.id)

@router.put('', response_model=StaffSettingsRead)
async def update_staff_settings(data: StaffSettingsUpdate, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await StaffSettingsController(session).update(current_user.tenant_id, current_user.id, data)
