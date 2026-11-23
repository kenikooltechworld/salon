"""Staff service."""
from __future__ import annotations

import uuid
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.staff import Staff
from app.models.user import User
from app.schemas.staff import StaffCreate, StaffUpdate


class StaffService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _attach_user_fields(self, items: Sequence[Staff]) -> list[dict]:
        user_ids: set[uuid.UUID] = set()
        for s in items:
            try:
                user_ids.add(uuid.UUID(str(s.user_id)))
            except Exception:
                pass
        users = {}
        if user_ids:
            rows = (await self.session.execute(select(User).where(User.id.in_(user_ids)))).scalars().all()
            users = {u.id: u for u in rows}
        out = []
        for s in items:
            data = {c.key: getattr(s, c.key) for c in s.__table__.columns}
            u = None
            try:
                u = users.get(uuid.UUID(str(s.user_id)))
            except Exception:
                pass
            if not u:
                raise ValueError(f"Staff {s.id} references missing user {s.user_id}")
            data["first_name"] = u.first_name
            data["last_name"] = u.last_name
            data["email"] = u.email
            name = f"{u.first_name or ''} {u.last_name or ''}".strip() or u.email
            if not name:
                raise ValueError(f"Staff {s.id} has no resolvable display name")
            data["name"] = name
            out.append(data)
        return out

    async def list_staff(
        self, tenant_id: uuid.UUID, *, status: str | None = None
    ) -> list[dict]:
        stmt = select(Staff).where(Staff.tenant_id == tenant_id)
        if status:
            stmt = stmt.where(Staff.status == status)
        stmt = stmt.order_by(Staff.created_at.desc())
        result = await self.session.execute(stmt)
        items = result.scalars().all()
        return await self._attach_user_fields(items)

    async def create(self, tenant_id: uuid.UUID, data: StaffCreate) -> dict:
        staff = Staff(tenant_id=tenant_id, **data.model_dump())
        self.session.add(staff)
        await self.session.flush()
        await self.session.refresh(staff)
        rows = await self._attach_user_fields([staff])
        return rows[0]

    async def get(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> Staff | None:
        result = await self.session.execute(
            select(Staff).where(Staff.id == staff_id, Staff.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def get_read(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> dict | None:
        item = await self.get(tenant_id, staff_id)
        if item is None:
            return None
        rows = await self._attach_user_fields([item])
        return rows[0] if rows else None

    async def update(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, data: StaffUpdate
    ) -> dict | None:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(staff, field, value)
        await self.session.flush()
        await self.session.refresh(staff)
        rows = await self._attach_user_fields([staff])
        return rows[0]

    async def delete(self, tenant_id: uuid.UUID, staff_id: uuid.UUID) -> bool:
        staff = await self.get(tenant_id, staff_id)
        if staff is None:
            return False
        await self.session.delete(staff)
        await self.session.flush()
        return True
