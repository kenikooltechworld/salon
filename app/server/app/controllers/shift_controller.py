from __future__ import annotations
import uuid
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.shift_service import ShiftService
from app.schemas.shift import ShiftCreate, ShiftUpdate, ShiftRead, ShiftListResponse

class ShiftController:
    def __init__(self, session: AsyncSession): self.service=ShiftService(session); self.session=session
    async def list(self, tenant_id, staff_id=None, status=None, page=1, page_size=10):
        rows,total=await self.service.list(tenant_id, staff_id, status, page, page_size)
        return ShiftListResponse(shifts=[ShiftRead.model_validate(r) for r in rows], total=total, page=page, page_size=page_size)
    async def get(self, tenant_id, shift_id):
        row=await self.service.get(tenant_id, shift_id)
        if not row: raise HTTPException(status_code=404, detail='Shift not found')
        return ShiftRead.model_validate(row)
    async def create(self, tenant_id, data: ShiftCreate):
        row=await self.service.create(tenant_id,data); await self.session.commit(); return ShiftRead.model_validate(row)
    async def update(self, tenant_id, shift_id, data: ShiftUpdate):
        row=await self.service.update(tenant_id,shift_id,data)
        if not row: raise HTTPException(status_code=404, detail='Shift not found')
        await self.session.commit(); return ShiftRead.model_validate(row)
    async def delete(self, tenant_id, shift_id):
        ok=await self.service.delete(tenant_id,shift_id)
        if not ok: raise HTTPException(status_code=404, detail='Shift not found')
        await self.session.commit(); return {'message':'Shift deleted successfully'}
