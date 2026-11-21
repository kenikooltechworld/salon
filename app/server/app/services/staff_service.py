"""Staff service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.staff import Staff
from app.schemas.staff import StaffCreate, StaffUpdate


class StaffService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def list_staff(
        self, tenant_id: uuid.UUID, *, status: str | None = None
    ) -> Sequence[Staff]:
        stmt = select(Staff).where(Staff.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Staff.status == status)
        stmt = stmt.order_by(Staff.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, tenant_id: uuid.UUID, data: StaffCreate) -> Staff:
        staff = Staff(tenant_id=tenant_id, **data.model_dump())
        self.session.add(staff)
        await self.session.flush()
        await self.session.refresh(staff)
        return staff

    async def get(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> Staff | None:
        result = await self.session.execute(
            select(Staff).where(Staff.id == staff_id, Staff.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def update(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate
    ) -> Staff | None:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(staff, field, value)
        await self.session.flush()
        await self.session.refresh(staff)
        return staff

    async def delete(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> bool:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return False
        await self.session.delete(staff)
        await self.session.flush()
        return True
