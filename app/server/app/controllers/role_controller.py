from __future__ import annotations
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.role_service import RoleService
from app.schemas.role import RoleRead

class RoleController:
    def __init__(self, session: AsyncSession): self.service=RoleService(session); self.session=session
    async def list(self, tenant_id: uuid.UUID):
        rows=await self.service.list(tenant_id)
        await self.session.commit()
        return {'roles':[RoleRead.model_validate(r).model_dump() for r in rows]}
