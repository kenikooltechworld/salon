from __future__ import annotations
from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.attendance_controller import AttendanceController
from app.lib.deps import db_session, get_current_user
from app.models.user import User

router = APIRouter(prefix='/attendance', tags=['attendance'])

@router.get('')
async def list_attendance(staff_id: str | None = Query(None), start_date: str | None = Query(None), end_date: str | None = Query(None), status: str | None = Query(None), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await AttendanceController(session).list(current_user.tenant_id, staff_id, start_date, end_date, status)

@router.get('/current')
async def current_attendance(staff_id: str | None = Query(None), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await AttendanceController(session).current(current_user.tenant_id, staff_id)

@router.post('/clock-in')
async def clock_in(payload: dict = Body(default={}), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    staff_id = (payload or {}).get('staff_id')
    notes = (payload or {}).get('notes')
    return await AttendanceController(session).clock_in(current_user.tenant_id, staff_id, notes)

@router.post('/clock-out')
async def clock_out(payload: dict = Body(default={}), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    staff_id = (payload or {}).get('staff_id')
    notes = (payload or {}).get('notes')
    return await AttendanceController(session).clock_out(current_user.tenant_id, staff_id, notes)

@router.get('/summary')
async def attendance_summary(staff_id: str = Query(...), period: str = Query('month'), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await AttendanceController(session).summary(current_user.tenant_id, staff_id, period)
