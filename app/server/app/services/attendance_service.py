from __future__ import annotations
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException
from app.models.attendance import AttendanceRecord
from app.models.shift import Shift
from app.models.staff import Staff

class AttendanceService:
    def __init__(self, session: AsyncSession): self.session=session
    async def list(self, tenant_id, staff_id=None, start_date=None, end_date=None, status=None):
        stmt=select(AttendanceRecord).where(AttendanceRecord.tenant_id==tenant_id)
        if staff_id: stmt=stmt.where(AttendanceRecord.staff_id==str(staff_id))
        if status: stmt=stmt.where(AttendanceRecord.status==status)
        if start_date:
            try: stmt=stmt.where(AttendanceRecord.date >= datetime.fromisoformat(start_date.replace('Z','+00:00')))
            except Exception: pass
        if end_date:
            try: stmt=stmt.where(AttendanceRecord.date <= datetime.fromisoformat(end_date.replace('Z','+00:00')))
            except Exception: pass
        rows=(await self.session.execute(stmt.order_by(AttendanceRecord.date.desc()))).scalars().all()
        return rows
    async def current(self, tenant_id, staff_id):
        if not staff_id: raise HTTPException(status_code=400, detail='staff_id is required')
        return (await self.session.execute(select(AttendanceRecord).where(AttendanceRecord.tenant_id==tenant_id, AttendanceRecord.staff_id==str(staff_id), AttendanceRecord.status.in_(['checked_in','on_break'])).order_by(AttendanceRecord.check_in_time.desc()))).scalars().first()
    async def clock_in(self, tenant_id, staff_id, notes=None):
        if not staff_id: raise HTTPException(status_code=400, detail='staff_id is required')
        try: sid=uuid.UUID(str(staff_id))
        except Exception: raise HTTPException(status_code=400, detail='Invalid staff ID')
        staff=(await self.session.execute(select(Staff).where(Staff.tenant_id==tenant_id, Staff.id==sid))).scalar_one_or_none()
        if not staff: raise HTTPException(status_code=404, detail='Staff member not found')
        existing=await self.current(tenant_id, str(sid))
        if existing: raise HTTPException(status_code=400, detail='Already clocked in')
        now=datetime.now(timezone.utc)
        shift=(await self.session.execute(select(Shift).where(Shift.tenant_id==tenant_id, Shift.staff_id==str(sid), Shift.start_time <= now, Shift.end_time >= now, Shift.status.in_(['scheduled','in_progress'])).order_by(Shift.start_time.asc()))).scalars().first()
        is_late=False
        if shift:
            grace=timedelta(minutes=15)
            st=shift.start_time
            if st.tzinfo is None: st=st.replace(tzinfo=timezone.utc)
            is_late = now > (st + grace)
        rec=AttendanceRecord(tenant_id=tenant_id, staff_id=str(sid), shift_id=str(shift.id) if shift else None, check_in_time=now, date=now, status='checked_in', is_late=is_late, notes=notes)
        self.session.add(rec); await self.session.flush(); await self.session.refresh(rec); return rec
    async def clock_out(self, tenant_id, staff_id, notes=None):
        if not staff_id: raise HTTPException(status_code=400, detail='staff_id is required')
        rec=(await self.session.execute(select(AttendanceRecord).where(AttendanceRecord.tenant_id==tenant_id, AttendanceRecord.staff_id==str(staff_id), AttendanceRecord.status=='checked_in').order_by(AttendanceRecord.check_in_time.desc()))).scalars().first()
        if not rec: raise HTTPException(status_code=400, detail='Not currently clocked in')
        now=datetime.now(timezone.utc)
        rec.check_out_time=now; rec.status='completed'
        ci=rec.check_in_time
        if ci.tzinfo is None: ci=ci.replace(tzinfo=timezone.utc)
        rec.hours_worked=round((now-ci).total_seconds()/3600.0,2)
        if rec.shift_id:
            try: shid=uuid.UUID(str(rec.shift_id))
            except Exception: shid=None
            shift=(await self.session.execute(select(Shift).where(Shift.tenant_id==tenant_id, Shift.id==shid))).scalar_one_or_none() if shid else None
            if shift and shift.end_time:
                end=shift.end_time
                if end.tzinfo is None: end=end.replace(tzinfo=timezone.utc)
                rec.is_early_departure = now < (end - timedelta(minutes=15))
        if notes: rec.notes = ((rec.notes or '') + "\nClock-out: " + str(notes)).strip()
        await self.session.flush(); await self.session.refresh(rec); return rec
    async def summary(self, tenant_id, staff_id, period='month'):
        now=datetime.now(timezone.utc)
        days=7 if period=='week' else 365 if period=='year' else 30
        start=now-timedelta(days=days)
        rows=(await self.session.execute(select(AttendanceRecord).where(AttendanceRecord.tenant_id==tenant_id, AttendanceRecord.staff_id==str(staff_id), AttendanceRecord.date >= start, AttendanceRecord.date <= now))).scalars().all()
        total_hours=sum(float(r.hours_worked or 0) for r in rows)
        count=len(rows)
        return {
            'total_hours': round(total_hours,2),
            'total_days': count,
            'late_arrivals': sum(1 for r in rows if r.is_late),
            'early_departures': sum(1 for r in rows if r.is_early_departure),
            'average_hours_per_day': round(total_hours/count,2) if count else 0.0,
        }
