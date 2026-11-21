"""Staff controller."""
from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.staff import StaffCreate, StaffRead, StaffUpdate
from app.services.staff_service import StaffService


class StaffController:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.service = StaffService(session)

    async def list(self, tenant_id: uuid.UUID, status: str | None = None) -> list[StaffRead]:
        items = await self.service.list_staff(tenant_id, status=status)
        return [StaffRead.model_validate(i) for i in items]

    async def create(self, tenant_id: uuid.UUID, data: StaffCreate) -> StaffRead:
        item = await self.service.create(tenant_id, data)
        await self.session.commit()
        return StaffRead.model_validate(item)

    async def get(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> StaffRead:
        item = await self.service.get(tenant_id, staff_id)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        return StaffRead.model_validate(item)

    async def update(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate
    ) -> StaffRead:
        item = await self.service.update(tenant_id, staff_id, data)
        if item is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        await self.session.commit()
        return StaffRead.model_validate(item)

    async def delete(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> None:
        ok = await self.service.delete(tenant_id, staff_id)
        if not ok:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Staff not found")
        await self.session.commit()
