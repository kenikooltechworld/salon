"""Availability service."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.availability import Availability
from app.models.service import Service

BLOCKING_STATUSES = {"scheduled", "confirmed", "in_progress"}


def _time_to_str(t: time | str) -> str:
    if isinstance(t, str):
        return t if len(t) == 8 else f"{t}:00"
    return t.strftime("%H:%M:%S")


def _str_to_time(value: str) -> time:
    v = str(value)[:8]
    if len(v) == 5:
        v = f"{v}:00"
    return datetime.strptime(v, "%H:%M:%S").time()


class AvailabilityService:
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_response(self, a: Availability) -> dict:
        return {
            "id": str(a.id),
            "staff_id": a.staff_id,
            "day_of_week": a.day_of_week,
            "start_time": a.start_time,
            "end_time": a.end_time,
            "is_recurring": a.is_recurring,
            "effective_from": a.effective_from.isoformat() if a.effective_from else None,
            "effective_to": a.effective_to.isoformat() if a.effective_to else None,
            "breaks": a.breaks or [],
            "is_active": a.is_active,
            "notes": a.notes,
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        }

    def _validate(self, start_time: time, end_time: time, effective_from: date, effective_to: date | None, is_recurring: bool, day_of_week: int | None, breaks: list[dict] | None):
        if start_time >= end_time:
            raise HTTPException(status_code=400, detail="start_time must be before end_time")
        if effective_to and effective_from > effective_to:
            raise HTTPException(status_code=400, detail="effective_from must be before or equal to effective_to")
        if is_recurring and day_of_week is None:
            raise HTTPException(status_code=400, detail="day_of_week is required for recurring schedules")
        if not is_recurring and day_of_week is not None:
            # legacy tolerated; keep compatible
            pass
        for b in breaks or []:
            bs = _str_to_time(b.get("start_time"))
            be = _str_to_time(b.get("end_time"))
            if bs >= be:
                raise HTTPException(status_code=400, detail="Break start_time must be before end_time")

    async def create(self, tenant_id: uuid.UUID, data) -> dict:
        breaks = [{"start_time": _time_to_str(b.start_time), "end_time": _time_to_str(b.end_time)} for b in (data.breaks or [])]
        self._validate(data.start_time, data.end_time, data.effective_from, data.effective_to, data.is_recurring, data.day_of_week, breaks)
        a = Availability(
            tenant_id=tenant_id,
            staff_id=str(data.staff_id),
            day_of_week=data.day_of_week,
            start_time=_time_to_str(data.start_time),
            end_time=_time_to_str(data.end_time),
            is_recurring=data.is_recurring,
            effective_from=data.effective_from,
            effective_to=data.effective_to,
            breaks=breaks,
            is_active=data.is_active,
            notes=data.notes,
        )
        self.session.add(a)
        await self.session.flush()
        await self.session.refresh(a)
        return self._to_response(a)

    async def get(self, tenant_id: uuid.UUID, availability_id: uuid.UUID) -> dict | None:
        a = (await self.session.execute(select(Availability).where(Availability.tenant_id == tenant_id, Availability.id == availability_id))).scalar_one_or_none()
        return self._to_response(a) if a else None

    async def list(self, tenant_id: uuid.UUID, staff_id: str | None, is_recurring: bool | None, is_active: bool | None, page: int, page_size: int) -> dict:
        stmt = select(Availability).where(Availability.tenant_id == tenant_id)
        cstmt = select(func.count()).select_from(Availability).where(Availability.tenant_id == tenant_id)
        if staff_id:
            stmt = stmt.where(Availability.staff_id == str(staff_id)); cstmt = cstmt.where(Availability.staff_id == str(staff_id))
        if is_recurring is not None:
            stmt = stmt.where(Availability.is_recurring == is_recurring); cstmt = cstmt.where(Availability.is_recurring == is_recurring)
        if is_active is not None:
            stmt = stmt.where(Availability.is_active == is_active); cstmt = cstmt.where(Availability.is_active == is_active)
        total = (await self.session.execute(cstmt)).scalar_one()
        rows = (await self.session.execute(stmt.order_by(Availability.created_at.desc()).offset((page - 1) * page_size).limit(page_size))).scalars().all()
        return {"availabilities": [self._to_response(r) for r in rows], "total": int(total), "page": page, "page_size": page_size}

    async def update(self, tenant_id: uuid.UUID, availability_id: uuid.UUID, data) -> dict | None:
        a = (await self.session.execute(select(Availability).where(Availability.tenant_id == tenant_id, Availability.id == availability_id))).scalar_one_or_none()
        if not a:
            return None
        payload = data.model_dump(exclude_unset=True)
        start = payload.get("start_time", _str_to_time(a.start_time))
        end = payload.get("end_time", _str_to_time(a.end_time))
        effective_from = payload.get("effective_from", a.effective_from)
        effective_to = payload.get("effective_to", a.effective_to)
        is_recurring = payload.get("is_recurring", a.is_recurring)
        day_of_week = payload.get("day_of_week", a.day_of_week)
        breaks = payload.get("breaks", a.breaks or [])
        if breaks and breaks and hasattr(breaks[0], "start_time"):
            breaks = [{"start_time": _time_to_str(b.start_time), "end_time": _time_to_str(b.end_time)} for b in breaks]
        self._validate(start, end, effective_from, effective_to, is_recurring, day_of_week, breaks)
        for k, v in payload.items():
            if k in {"start_time", "end_time"} and v is not None:
                setattr(a, k, _time_to_str(v))
            elif k == "breaks" and v is not None:
                if v and hasattr(v[0], "start_time"):
                    a.breaks = [{"start_time": _time_to_str(b.start_time), "end_time": _time_to_str(b.end_time)} for b in v]
                else:
                    a.breaks = v
            else:
                setattr(a, k, v)
        await self.session.flush()
        await self.session.refresh(a)
        return self._to_response(a)

    async def delete(self, tenant_id: uuid.UUID, availability_id: uuid.UUID) -> bool:
        a = (await self.session.execute(select(Availability).where(Availability.tenant_id == tenant_id, Availability.id == availability_id))).scalar_one_or_none()
        if not a:
            return False
        await self.session.delete(a)
        await self.session.flush()
        return True

    async def get_available_slots(self, tenant_id: uuid.UUID, staff_id: uuid.UUID, service_id: uuid.UUID, booking_date: date) -> list[dict]:
        service = (await self.session.execute(select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id, Service.is_active.is_(True)))).scalar_one_or_none()
        if service is None:
            raise HTTPException(status_code=404, detail="Service not found")
        records = await self._get_staff_availability(tenant_id, str(staff_id), booking_date)
        booked = await self._get_booked_slots(tenant_id, str(staff_id), booking_date)
        now_utc = datetime.now(timezone.utc)
        slots = []
        for avail in records:
            for slot_time in self._generate_slots(avail, int(service.duration_minutes)):
                slot_dt = datetime.combine(booking_date, slot_time, tzinfo=timezone.utc)
                if slot_dt <= now_utc:
                    continue
                is_booked = self._is_slot_booked(slot_time, booked, int(service.duration_minutes), int(avail.buffer_time_minutes or 0), int(avail.concurrent_bookings_allowed or 1))
                slots.append({
                    "start_time": slot_time.strftime("%H:%M"),
                    "end_time": (datetime.combine(booking_date, slot_time) + timedelta(minutes=int(service.duration_minutes))).strftime("%H:%M"),
                    "staff_id": str(staff_id),
                    "duration_minutes": int(service.duration_minutes),
                    "isAvailable": not is_booked,
                })
        by_start = {}
        for s in slots:
            by_start[s["start_time"]] = by_start.get(s["start_time"], False) or s["isAvailable"]
        out = []
        for s in sorted(slots, key=lambda x: x["start_time"]):
            if any(o["start_time"] == s["start_time"] for o in out):
                continue
            s["isAvailable"] = by_start[s["start_time"]]
            out.append(s)
        return out

    async def _get_staff_availability(self, tenant_id: uuid.UUID, staff_id: str, booking_date: date):
        dow = booking_date.weekday()
        recurring = (await self.session.execute(select(Availability).where(Availability.tenant_id == tenant_id, Availability.staff_id == staff_id, Availability.is_active.is_(True), Availability.is_recurring.is_(True), Availability.day_of_week == dow, Availability.effective_from <= booking_date, (Availability.effective_to.is_(None) | (Availability.effective_to >= booking_date))))).scalars().all()
        specific = (await self.session.execute(select(Availability).where(Availability.tenant_id == tenant_id, Availability.staff_id == staff_id, Availability.is_active.is_(True), Availability.is_recurring.is_(False), Availability.effective_from <= booking_date, (Availability.effective_to.is_(None) | (Availability.effective_to >= booking_date))))).scalars().all()
        return list(recurring) + list(specific)

    async def _get_booked_slots(self, tenant_id: uuid.UUID, staff_id: str, booking_date: date):
        start = datetime.combine(booking_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(booking_date, time.max, tzinfo=timezone.utc)
        result = await self.session.execute(select(Appointment).where(Appointment.tenant_id == tenant_id, Appointment.staff_id == staff_id, Appointment.status.in_(BLOCKING_STATUSES), Appointment.start_time < end, Appointment.end_time > start))
        booked = []
        for appt in result.scalars().all():
            st = appt.start_time.astimezone(timezone.utc).time().replace(tzinfo=None)
            mins = int((appt.end_time - appt.start_time).total_seconds() // 60)
            booked.append((st, max(mins, 1)))
        return booked

    def _generate_slots(self, availability: Availability, service_duration: int):
        try:
            start_t = _str_to_time(availability.start_time)
            end_t = _str_to_time(availability.end_time)
        except Exception:
            return []
        start_m = start_t.hour * 60 + start_t.minute
        end_m = end_t.hour * 60 + end_t.minute
        interval = max(int(availability.slot_interval_minutes or 30), 5)
        slots = []
        cur = start_m
        while cur + service_duration <= end_m:
            slot_t = time(hour=cur // 60, minute=cur % 60)
            if not self._is_in_break(slot_t, availability.breaks or [], service_duration):
                slots.append(slot_t)
            cur += interval
        return slots

    def _is_in_break(self, slot_time: time, breaks: list[dict], service_duration: int):
        slot_start = slot_time.hour * 60 + slot_time.minute
        slot_end = slot_start + service_duration
        for b in breaks:
            try:
                bs = _str_to_time(b.get("start_time")); be = _str_to_time(b.get("end_time"))
            except Exception:
                continue
            b_start = bs.hour * 60 + bs.minute; b_end = be.hour * 60 + be.minute
            if slot_start < b_end and slot_end > b_start:
                return True
        return False

    def _is_slot_booked(self, slot_time: time, booked: list[tuple[time, int]], service_duration: int, buffer_minutes: int, concurrent_limit: int):
        slot_start = slot_time.hour * 60 + slot_time.minute
        slot_end = slot_start + service_duration + max(buffer_minutes, 0)
        overlap_count = 0
        for booked_time, booked_dur in booked:
            b_start = booked_time.hour * 60 + booked_time.minute
            b_end = b_start + booked_dur + max(buffer_minutes, 0)
            if slot_start < b_end and slot_end > b_start:
                overlap_count += 1
                if overlap_count >= max(concurrent_limit, 1):
                    return True
        return False
