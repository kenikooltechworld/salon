from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.controllers.role_controller import RoleController
from app.lib.deps import db_session, get_current_user
from app.models.user import User

router = APIRouter(prefix='/roles', tags=['roles'])

@router.get('')
async def list_roles(current_user: User = Depends(get_current_user), session: AsyncSession = Depends(db_session)):
    return await RoleController(session).list(current_user.tenant_id)
