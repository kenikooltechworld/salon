from __future__ import annotations
import uuid
from datetime import date, datetime, timezone
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.time_off_request import TimeOffRequest
from app.models.staff import Staff

class TimeOffRequestService:
    def __init__(self, session: AsyncSession): self.session=session
    async def list(self, tenant_id, staff_id=None, status=None, page=1, page_size=10):
        stmt=select(TimeOffRequest).where(TimeOffRequest.tenant_id==tenant_id)
        cstmt=select(func.count()).select_from(TimeOffRequest).where(TimeOffRequest.tenant_id==tenant_id)
        if staff_id: stmt=stmt.where(TimeOffRequest.staff_id==str(staff_id)); cstmt=cstmt.where(TimeOffRequest.staff_id==str(staff_id))
        if status: stmt=stmt.where(TimeOffRequest.status==status); cstmt=cstmt.where(TimeOffRequest.status==status)
        total=(await self.session.execute(cstmt)).scalar_one()
        rows=(await self.session.execute(stmt.order_by(TimeOffRequest.created_at.desc()).offset((page-1)*page_size).limit(page_size))).scalars().all()
        return rows,total
    async def get(self, tenant_id, request_id):
        return (await self.session.execute(select(TimeOffRequest).where(TimeOffRequest.tenant_id==tenant_id, TimeOffRequest.id==request_id))).scalar_one_or_none()
    async def create(self, tenant_id, data):
        try: sid=uuid.UUID(str(data.staff_id))
        except Exception: raise HTTPException(status_code=400, detail='Invalid staff ID')
        staff=(await self.session.execute(select(Staff).where(Staff.tenant_id==tenant_id, Staff.id==sid))).scalar_one_or_none()
        if not staff: raise HTTPException(status_code=400, detail='Staff member not found')
        if data.start_date < date.today(): raise HTTPException(status_code=400, detail='start_date must be today or in the future')
        if data.start_date > data.end_date: raise HTTPException(status_code=400, detail='start_date must be before end_date')
        item=TimeOffRequest(tenant_id=tenant_id, staff_id=str(sid), start_date=data.start_date, end_date=data.end_date, reason=data.reason, status='pending', requested_at=datetime.now(timezone.utc))
        self.session.add(item); await self.session.flush(); await self.session.refresh(item); return item
    async def approve(self, tenant_id, request_id, reviewer_id):
        item=await self.get(tenant_id,request_id)
        if not item: return None
        item.status='approved'; item.reviewed_at=datetime.now(timezone.utc); item.reviewed_by=str(reviewer_id)
        await self.session.flush(); await self.session.refresh(item); return item
    async def deny(self, tenant_id, request_id, reviewer_id, denial_reason=None):
        item=await self.get(tenant_id,request_id)
        if not item: return None
        item.status='denied'; item.reviewed_at=datetime.now(timezone.utc); item.reviewed_by=str(reviewer_id); item.denial_reason=denial_reason
        await self.session.flush(); await self.session.refresh(item); return item
