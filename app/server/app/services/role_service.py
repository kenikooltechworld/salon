from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.role import Role

DEFAULT_ROLES = [
    ('Owner','Full system access', False),
    ('Admin','Administrative access', False),
    ('Manager','Management access', False),
    ('Staff','Staff access', False),
]

class RoleService:
    def __init__(self, session: AsyncSession):
        self.session=session
    async def list(self, tenant_id: uuid.UUID):
        rows=(await self.session.execute(select(Role).where(Role.tenant_id==tenant_id).order_by(Role.name.asc()))).scalars().all()
        if not rows:
            for name, desc, is_custom in DEFAULT_ROLES:
                self.session.add(Role(tenant_id=tenant_id,name=name,description=desc,is_custom=is_custom,permissions=[]))
            await self.session.flush()
            rows=(await self.session.execute(select(Role).where(Role.tenant_id==tenant_id).order_by(Role.name.asc()))).scalars().all()
        return rows
