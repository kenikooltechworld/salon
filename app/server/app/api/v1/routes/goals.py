from __future__ import annotations
import uuid
from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.goal_controller import GoalController
from app.lib.deps import db_session, get_current_user, require_roles
from app.models.user import User
from app.schemas.goal import GoalCreate

router = APIRouter(prefix='/goals', tags=['goals'])

@router.get('/staff/{staff_id}')
async def staff_goals(staff_id: uuid.UUID, current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await GoalController(session).staff_goals(current_user.tenant_id, staff_id)

@router.get('/achievements')
async def achievements(staff_id: str = Query(...), limit: int = Query(25, ge=1, le=100), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await GoalController(session).achievements(current_user.tenant_id, staff_id, limit)

@router.get('/bonuses')
async def bonuses(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await GoalController(session).bonuses(current_user.tenant_id)

@router.get('/performance-vs-targets')
async def performance_vs_targets(staff_id: str = Query(...), current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await GoalController(session).performance_vs_targets(current_user.tenant_id, staff_id)

@router.post('/staff/{staff_id}/goals')
async def create_goal(staff_id: uuid.UUID, payload: dict = Body(...), current_user: User = Depends(require_roles('owner','admin','manager')), session: AsyncSession = Depends(db_session)):
    data = GoalCreate(**payload)
    return await GoalController(session).create(current_user.tenant_id, staff_id, data)
