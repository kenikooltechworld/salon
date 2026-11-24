from __future__ import annotations
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.attendance_service import AttendanceService
from app.schemas.attendance import AttendanceRead

class AttendanceController:
    def __init__(self, session: AsyncSession): self.service=AttendanceService(session); self.session=session
    def _to(self,r):
        return {
            'id': str(r.id), 'staff_id': r.staff_id, 'shift_id': r.shift_id,
            'check_in_time': r.check_in_time.isoformat(), 'check_out_time': r.check_out_time.isoformat() if r.check_out_time else None,
            'date': r.date.isoformat(), 'hours_worked': float(r.hours_worked or 0), 'status': r.status,
            'is_late': bool(r.is_late), 'is_early_departure': bool(r.is_early_departure), 'notes': r.notes,
            'created_at': r.created_at.isoformat(), 'updated_at': r.updated_at.isoformat() if r.updated_at else None,
        }
    async def list(self, tenant_id, staff_id=None, start_date=None, end_date=None, status=None):
        rows=await self.service.list(tenant_id, staff_id, start_date, end_date, status)
        return [self._to(r) for r in rows]
    async def current(self, tenant_id, staff_id):
        row=await self.service.current(tenant_id, staff_id)
        if not row: return None
        return {'id':str(row.id),'staff_id':row.staff_id,'check_in_time':row.check_in_time.isoformat(),'status':row.status,'is_late':bool(row.is_late)}
    async def clock_in(self, tenant_id, staff_id, notes=None):
        row=await self.service.clock_in(tenant_id, staff_id, notes); await self.session.commit()
        return {'id':str(row.id),'staff_id':row.staff_id,'check_in_time':row.check_in_time.isoformat(),'status':row.status,'is_late':bool(row.is_late)}
    async def clock_out(self, tenant_id, staff_id, notes=None):
        row=await self.service.clock_out(tenant_id, staff_id, notes); await self.session.commit()
        return {'id':str(row.id),'staff_id':row.staff_id,'check_in_time':row.check_in_time.isoformat(),'check_out_time':row.check_out_time.isoformat() if row.check_out_time else None,'hours_worked':float(row.hours_worked or 0),'status':row.status,'is_early_departure':bool(row.is_early_departure)}
    async def summary(self, tenant_id, staff_id, period='month'):
        return await self.service.summary(tenant_id, staff_id, period)
