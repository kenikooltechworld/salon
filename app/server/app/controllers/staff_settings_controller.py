from __future__ import annotations
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.staff_settings_service import StaffSettingsService
from app.schemas.staff_settings import StaffSettingsRead, StaffSettingsUpdate

class StaffSettingsController:
    def __init__(self, session: AsyncSession): self.service=StaffSettingsService(session); self.session=session
    async def get(self, tenant_id: uuid.UUID, user_id: uuid.UUID):
        row=await self.service.get_or_create(tenant_id, user_id); await self.session.commit()
        return StaffSettingsRead.model_validate(row)
    async def update(self, tenant_id: uuid.UUID, user_id: uuid.UUID, data: StaffSettingsUpdate):
        row=await self.service.update(tenant_id, user_id, data); await self.session.commit()
        return StaffSettingsRead.model_validate(row)
