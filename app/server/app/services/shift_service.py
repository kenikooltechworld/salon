from __future__ import annotations
import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import func, select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.shift import Shift
from app.models.staff import Staff
from app.models.user import User

class ShiftService:
    def __init__(self, session: AsyncSession): self.session=session
    async def _conflict(self, tenant_id, staff_id, start, end, exclude_id=None):
        stmt=select(func.count()).select_from(Shift).where(Shift.tenant_id==tenant_id, Shift.staff_id==str(staff_id), Shift.status.in_(['scheduled','in_progress']), Shift.start_time < end, Shift.end_time > start)
        if exclude_id: stmt=stmt.where(Shift.id!=exclude_id)
        return (await self.session.execute(stmt)).scalar_one() > 0
    async def _calc_cost(self, tenant_id, staff_id, start, end):
        staff=(await self.session.execute(select(Staff).where(Staff.tenant_id==tenant_id, Staff.id==staff_id))).scalar_one_or_none()
        if not staff: return None
        rate=Decimal(str(staff.payment_rate or 0))
        # only hourly rates used directly; others best-effort hourly equivalent
        if staff.payment_type=='daily': rate = rate/Decimal('8')
        elif staff.payment_type=='weekly': rate = rate/Decimal('40')
        elif staff.payment_type=='monthly': rate = rate/Decimal('160')
        elif staff.payment_type=='commission': rate = Decimal('0')
        hours=Decimal(str((end-start).total_seconds()))/Decimal('3600')
        return (hours*rate).quantize(Decimal('0.01'))
    async def list(self, tenant_id, staff_id=None, status=None, page=1, page_size=10):
        stmt=select(Shift).where(Shift.tenant_id==tenant_id)
        cstmt=select(func.count()).select_from(Shift).where(Shift.tenant_id==tenant_id)
        if staff_id: stmt=stmt.where(Shift.staff_id==str(staff_id)); cstmt=cstmt.where(Shift.staff_id==str(staff_id))
        if status: stmt=stmt.where(Shift.status==status); cstmt=cstmt.where(Shift.status==status)
        total=(await self.session.execute(cstmt)).scalar_one()
        rows=(await self.session.execute(stmt.order_by(Shift.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
        return rows,total
    async def get(self, tenant_id, shift_id):
        return (await self.session.execute(select(Shift).where(Shift.tenant_id==tenant_id, Shift.id==shift_id))).scalar_one_or_none()
    async def create(self, tenant_id, data):
        try: sid=uuid.UUID(str(data.staff_id))
        except Exception: raise HTTPException(status_code=400, detail='Invalid staff ID')
        staff=(await self.session.execute(select(Staff).where(Staff.tenant_id==tenant_id, Staff.id==sid))).scalar_one_or_none()
        if not staff: raise HTTPException(status_code=404, detail='Staff member not found')
        if data.end_time <= data.start_time: raise HTTPException(status_code=400, detail='end_time must be after start_time')
        if await self._conflict(tenant_id,sid,data.start_time,data.end_time): raise HTTPException(status_code=409, detail='Shift conflicts with existing shift for this staff member')
        item=Shift(tenant_id=tenant_id, staff_id=str(sid), start_time=data.start_time, end_time=data.end_time, status=data.status or 'scheduled')
        item.labor_cost=await self._calc_cost(tenant_id,sid,data.start_time,data.end_time)
        self.session.add(item); await self.session.flush(); await self.session.refresh(item); return item
    async def update(self, tenant_id, shift_id, data):
        item=await self.get(tenant_id,shift_id)
        if not item: return None
        start=data.start_time or item.start_time; end=data.end_time or item.end_time
        if end <= start: raise HTTPException(status_code=400, detail='end_time must be after start_time')
        try: sid=uuid.UUID(str(item.staff_id))
        except Exception: raise HTTPException(status_code=400, detail='Invalid staff ID')
        if await self._conflict(tenant_id,sid,start,end,exclude_id=item.id): raise HTTPException(status_code=409, detail='Updated shift conflicts with existing shift for this staff member')
        if data.status is not None: item.status=data.status
        item.start_time=start; item.end_time=end
        item.labor_cost=await self._calc_cost(tenant_id,sid,start,end)
        await self.session.flush(); await self.session.refresh(item); return item
    async def delete(self, tenant_id, shift_id):
        item=await self.get(tenant_id,shift_id)
        if not item: return False
        await self.session.delete(item); await self.session.flush(); return True
