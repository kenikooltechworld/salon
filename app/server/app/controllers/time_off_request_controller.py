from __future__ import annotations
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.time_off_request_service import TimeOffRequestService
from app.schemas.time_off_request import TimeOffRequestCreate, TimeOffRequestRead

class TimeOffRequestController:
    def __init__(self, session: AsyncSession): self.service=TimeOffRequestService(session); self.session=session
    def _to(self, r):
        return {
            'id': str(r.id), 'staff_id': r.staff_id, 'start_date': r.start_date.isoformat(), 'end_date': r.end_date.isoformat(),
            'reason': r.reason, 'status': r.status, 'requested_at': r.requested_at.isoformat(), 'reviewed_at': r.reviewed_at.isoformat() if r.reviewed_at else None,
            'reviewed_by': r.reviewed_by, 'denial_reason': r.denial_reason, 'created_at': r.created_at.isoformat(), 'updated_at': r.updated_at.isoformat()
        }
    async def list(self, tenant_id, staff_id=None, status=None, page=1, page_size=10):
        rows,total=await self.service.list(tenant_id, staff_id, status, page, page_size)
        return {'requests':[self._to(r) for r in rows], 'total': total, 'page': page, 'page_size': page_size}
    async def get(self, tenant_id, request_id):
        row=await self.service.get(tenant_id,request_id)
        if not row: raise HTTPException(status_code=404, detail='Time-off request not found')
        return self._to(row)
    async def create(self, tenant_id, data: TimeOffRequestCreate):
        row=await self.service.create(tenant_id,data); await self.session.commit(); return self._to(row)
    async def approve(self, tenant_id, request_id, reviewer_id):
        row=await self.service.approve(tenant_id,request_id,reviewer_id)
        if not row: raise HTTPException(status_code=404, detail='Time-off request not found')
        await self.session.commit(); return self._to(row)
    async def deny(self, tenant_id, request_id, reviewer_id, denial_reason=None):
        row=await self.service.deny(tenant_id,request_id,reviewer_id,denial_reason)
        if not row: raise HTTPException(status_code=404, detail='Time-off request not found')
        await self.session.commit(); return self._to(row)
