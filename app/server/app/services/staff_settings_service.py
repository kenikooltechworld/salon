from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.staff_settings import StaffSettings
from app.models.user import User

class StaffSettingsService:
    def __init__(self, session: AsyncSession): self.session=session
    async def get_or_create(self, tenant_id: uuid.UUID, user_id: uuid.UUID):
        row=(await self.session.execute(select(StaffSettings).where(StaffSettings.tenant_id==tenant_id, StaffSettings.user_id==str(user_id)))).scalar_one_or_none()
        if row: return row
        user=(await self.session.execute(select(User).where(User.tenant_id==tenant_id, User.id==user_id))).scalar_one_or_none()
        first=user.first_name if user else ''
        last=user.last_name if user else ''
        phone=user.phone if user else None
        row=StaffSettings(tenant_id=tenant_id, user_id=str(user_id), first_name=first, last_name=last, phone=phone)
        self.session.add(row); await self.session.flush(); await self.session.refresh(row); return row
    async def update(self, tenant_id: uuid.UUID, user_id: uuid.UUID, data):
        row=await self.get_or_create(tenant_id, user_id)
        payload=data.model_dump(exclude_unset=True)
        for k,v in payload.items(): setattr(row,k,v)
        await self.session.flush(); await self.session.refresh(row); return row
