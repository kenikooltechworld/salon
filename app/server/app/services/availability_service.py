"""Availability service."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone
from types import SimpleNamespace
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.availability import Availability
from app.models.service import Service
from app.models.staff import Staff

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
            "slot_interval_minutes": a.slot_interval_minutes,
            "buffer_time_minutes": a.buffer_time_minutes,
            "concurrent_bookings_allowed": a.concurrent_bookings_allowed,
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
            raise HTTPException(status_code=400, detail="day_of_week must not be set for non-recurring schedules")
        previous_end: time | None = None
        ordered_breaks = sorted(breaks or [], key=lambda brk: _str_to_time(brk.get("start_time")))
        for b in ordered_breaks:
            bs = _str_to_time(b.get("start_time"))
            be = _str_to_time(b.get("end_time"))
            if bs >= be:
                raise HTTPException(status_code=400, detail="Break start_time must be before end_time")
            if bs < start_time or be > end_time:
                raise HTTPException(status_code=400, detail="Breaks must be within working hours")
            if previous_end is not None and bs < previous_end:
                raise HTTPException(status_code=400, detail="Breaks must not overlap")
            previous_end = be

    @staticmethod
    def _normalize_breaks(breaks: list) -> list[dict]:
        normalized = []
        for item in breaks:
            if hasattr(item, "start_time"):
                start, end = item.start_time, item.end_time
            else:
                start, end = item.get("start_time"), item.get("end_time")
            normalized.append({
                "start_time": _time_to_str(start),
                "end_time": _time_to_str(end),
            })
        return normalized

    async def _validate_staff(self, tenant_id: uuid.UUID, staff_id: str, require_active: bool = True) -> None:
        try:
            staff_uuid = uuid.UUID(str(staff_id))
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid staff_id") from exc
        stmt = select(Staff.id).where(Staff.id == staff_uuid, Staff.tenant_id == tenant_id).with_for_update()
        if require_active:
            stmt = stmt.where(Staff.status == "active")
        exists = (await self.session.execute(stmt)).scalar_one_or_none()
        if exists is None:
            raise HTTPException(status_code=400, detail="Active staff member not found for tenant")

    @staticmethod
    def _range_intersects_day(start: date, end: date, day_of_week: int) -> bool:
        candidate = start + timedelta(days=(day_of_week - start.weekday()) % 7)
        return candidate <= end

    @classmethod
    def _schedules_overlap(cls, left: Availability, right: Availability) -> bool:
        date_start = max(left.effective_from, right.effective_from)
        date_end = min(left.effective_to or date.max, right.effective_to or date.max)
        if date_start > date_end:
            return False
        if left.start_time >= right.end_time or right.start_time >= left.end_time:
            return False
        if left.is_recurring and right.is_recurring:
            return left.day_of_week == right.day_of_week and cls._range_intersects_day(
                date_start, date_end, int(left.day_of_week)
            )
        if left.is_recurring:
            return cls._range_intersects_day(date_start, date_end, int(left.day_of_week))
        if right.is_recurring:
            return cls._range_intersects_day(date_start, date_end, int(right.day_of_week))
        return True

    async def _validate_no_overlap(
        self,
        tenant_id: uuid.UUID,
        staff_id: str,
        candidate: Availability,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        if not candidate.is_active:
            return
        stmt = select(Availability).where(
            Availability.tenant_id == tenant_id,
            Availability.staff_id == staff_id,
            Availability.is_active.is_(True),
        )
        if exclude_id is not None:
            stmt = stmt.where(Availability.id != exclude_id)
        rows = (await self.session.execute(stmt)).scalars().all()
        if any(self._schedules_overlap(candidate, row) for row in rows):
            raise HTTPException(
                status_code=409,
                detail="Availability overlaps another active schedule for this staff member",
            )

    async def create(self, tenant_id: uuid.UUID, data) -> dict:
        breaks = [{"start_time": _time_to_str(b.start_time), "end_time": _time_to_str(b.end_time)} for b in (data.breaks or [])]
        self._validate(data.start_time, data.end_time, data.effective_from, data.effective_to, data.is_recurring, data.day_of_week, breaks)
        await self._validate_staff(tenant_id, data.staff_id)
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
            slot_interval_minutes=data.slot_interval_minutes,
            buffer_time_minutes=data.buffer_time_minutes,
            concurrent_bookings_allowed=data.concurrent_bookings_allowed,
            is_active=data.is_active,
            notes=data.notes,
        )
        await self._validate_no_overlap(tenant_id, str(data.staff_id), a)
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
        nullable_fields = {"day_of_week", "effective_to", "notes"}
        invalid_nulls = [key for key, value in payload.items() if value is None and key not in nullable_fields]
        if invalid_nulls:
            raise HTTPException(status_code=400, detail=f"{', '.join(invalid_nulls)} cannot be null")
        start = payload.get("start_time", _str_to_time(a.start_time))
        end = payload.get("end_time", _str_to_time(a.end_time))
        effective_from = payload.get("effective_from", a.effective_from)
        effective_to = payload.get("effective_to", a.effective_to)
        is_recurring = payload.get("is_recurring", a.is_recurring)
        day_of_week = payload.get("day_of_week", a.day_of_week)
        breaks = self._normalize_breaks(payload.get("breaks", a.breaks or []))
        self._validate(start, end, effective_from, effective_to, is_recurring, day_of_week, breaks)
        await self._validate_staff(tenant_id, a.staff_id, require_active=False)
        candidate = SimpleNamespace(
            id=a.id,
            tenant_id=a.tenant_id,
            staff_id=a.staff_id,
            day_of_week=day_of_week,
            start_time=_time_to_str(start),
            end_time=_time_to_str(end),
            is_recurring=is_recurring,
            effective_from=effective_from,
            effective_to=effective_to,
            breaks=breaks,
            slot_interval_minutes=payload.get("slot_interval_minutes", a.slot_interval_minutes),
            buffer_time_minutes=payload.get("buffer_time_minutes", a.buffer_time_minutes),
            concurrent_bookings_allowed=payload.get("concurrent_bookings_allowed", a.concurrent_bookings_allowed),
            is_active=payload.get("is_active", a.is_active),
            notes=payload.get("notes", a.notes),
        )
        await self._validate_no_overlap(tenant_id, a.staff_id, candidate, exclude_id=availability_id)
        for k, v in payload.items():
            if k in {"start_time", "end_time"} and v is not None:
                setattr(a, k, _time_to_str(v))
            elif k == "breaks" and v is not None:
                a.breaks = breaks
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

    async def get_available_slots(
        self,
        tenant_id: uuid.UUID,
        staff_id: uuid.UUID,
        service_id: uuid.UUID,
        booking_date: date,
        exclude_id: uuid.UUID | None = None,
        time_zone: str = "UTC",
    ) -> list[dict]:
        try:
            zone = ZoneInfo(time_zone)
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(status_code=400, detail="Invalid time_zone") from exc
        service = (await self.session.execute(select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id, Service.is_active.is_(True)))).scalar_one_or_none()
        if service is None:
            raise HTTPException(status_code=404, detail="Service not found")
        records = await self._get_staff_availability(tenant_id, str(staff_id), booking_date)
        booked = await self._get_booked_slots(
            tenant_id, str(staff_id), booking_date, zone, exclude_id
        )
        now_local = datetime.now(timezone.utc).astimezone(zone)
        slots = []
        for avail in records:
            for slot_time in self._generate_slots(avail, int(service.duration_minutes)):
                slot_dt = datetime.combine(booking_date, slot_time, tzinfo=zone)
                if slot_dt <= now_local:
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

    async def _get_booked_slots(
        self,
        tenant_id: uuid.UUID,
        staff_id: str,
        booking_date: date,
        zone: ZoneInfo,
        exclude_id: uuid.UUID | None = None,
    ):
        local_start = datetime.combine(booking_date, time.min, tzinfo=zone)
        local_end = local_start + timedelta(days=1)
        start = local_start.astimezone(timezone.utc)
        end = local_end.astimezone(timezone.utc)
        stmt = select(Appointment).where(
            Appointment.tenant_id == tenant_id,
            Appointment.staff_id == staff_id,
            Appointment.status.in_(BLOCKING_STATUSES),
            Appointment.start_time < end,
            Appointment.end_time > start,
        )
        if exclude_id is not None:
            stmt = stmt.where(Appointment.id != exclude_id)
        result = await self.session.execute(stmt)
        booked = []
        for appt in result.scalars().all():
            st = appt.start_time.astimezone(zone).time().replace(tzinfo=None)
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
