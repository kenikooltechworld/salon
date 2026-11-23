"""Availability and slot calculation service."""
from __future__ import annotations

import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.availability import Availability
from app.models.service import Service

BLOCKING_STATUSES = {"scheduled", "confirmed", "in_progress"}


class AvailabilityService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_available_slots(
        self, tenant_id: uuid.UUID, staff_id: uuid.UUID, service_id: uuid.UUID, booking_date: date
    ) -> list[dict]:
        service = (
            await self.session.execute(
                select(Service).where(Service.id == service_id, Service.tenant_id == tenant_id, Service.is_active.is_(True))
            )
        ).scalar_one_or_none()
        if service is None:
            return []

        records = await self._get_staff_availability(tenant_id, str(staff_id), booking_date)
        if not records:
            return []

        booked = await self._get_booked_slots(tenant_id, str(staff_id), booking_date)
        now_utc = datetime.now(timezone.utc)
        slots: list[dict] = []
        for avail in records:
            generated = self._generate_slots(avail, int(service.duration_minutes))
            for slot_time in generated:
                slot_dt = datetime.combine(booking_date, slot_time, tzinfo=timezone.utc)
                if slot_dt <= now_utc:
                    continue
                is_booked = self._is_slot_booked(slot_time, booked, int(service.duration_minutes), int(avail.buffer_time_minutes or 0), int(avail.concurrent_bookings_allowed or 1))
                slots.append({"time": slot_time.strftime("%H:%M"), "available": not is_booked})
        # dedupe by time, keep available if any
        by_time: dict[str, bool] = {}
        for s in slots:
            by_time[s["time"]] = by_time.get(s["time"], False) or s["available"]
        return [{"time": t, "available": by_time[t]} for t in sorted(by_time.keys())]

    async def _get_staff_availability(self, tenant_id: uuid.UUID, staff_id: str, booking_date: date) -> list[Availability]:
        dow = booking_date.weekday()
        recurring = (
            await self.session.execute(
                select(Availability).where(
                    Availability.tenant_id == tenant_id,
                    Availability.staff_id == staff_id,
                    Availability.is_active.is_(True),
                    Availability.is_recurring.is_(True),
                    Availability.day_of_week == dow,
                    Availability.effective_from <= booking_date,
                    (Availability.effective_to.is_(None) | (Availability.effective_to >= booking_date)),
                )
            )
        ).scalars().all()
        specific = (
            await self.session.execute(
                select(Availability).where(
                    Availability.tenant_id == tenant_id,
                    Availability.staff_id == staff_id,
                    Availability.is_active.is_(True),
                    Availability.is_recurring.is_(False),
                    Availability.effective_from <= booking_date,
                    (Availability.effective_to.is_(None) | (Availability.effective_to >= booking_date)),
                )
            )
        ).scalars().all()
        # specific date records override/add? keep both as legacy-ish simple union
        return list(recurring) + list(specific)

    async def _get_booked_slots(self, tenant_id: uuid.UUID, staff_id: str, booking_date: date) -> list[tuple[time, int]]:
        start = datetime.combine(booking_date, time.min, tzinfo=timezone.utc)
        end = datetime.combine(booking_date, time.max, tzinfo=timezone.utc)
        result = await self.session.execute(
            select(Appointment).where(
                Appointment.tenant_id == tenant_id,
                Appointment.staff_id == staff_id,
                Appointment.status.in_(BLOCKING_STATUSES),
                Appointment.start_time < end,
                Appointment.end_time > start,
            )
        )
        booked = []
        for appt in result.scalars().all():
            st = appt.start_time.astimezone(timezone.utc).time().replace(tzinfo=None)
            mins = int((appt.end_time - appt.start_time).total_seconds() // 60)
            booked.append((st, max(mins, 1)))
        return booked

    def _generate_slots(self, availability: Availability, service_duration: int) -> list[time]:
        try:
            start_t = datetime.strptime(availability.start_time[:8], "%H:%M:%S").time()
            end_t = datetime.strptime(availability.end_time[:8], "%H:%M:%S").time()
        except Exception:
            return []
        start_m = start_t.hour * 60 + start_t.minute
        end_m = end_t.hour * 60 + end_t.minute
        interval = max(int(availability.slot_interval_minutes or 30), 5)
        slots: list[time] = []
        cur = start_m
        while cur + service_duration <= end_m:
            slot_t = time(hour=cur // 60, minute=cur % 60)
            if not self._is_in_break(slot_t, availability.breaks or [], service_duration):
                slots.append(slot_t)
            cur += interval
        return slots

    def _is_in_break(self, slot_time: time, breaks: list[dict], service_duration: int) -> bool:
        slot_start = slot_time.hour * 60 + slot_time.minute
        slot_end = slot_start + service_duration
        for b in breaks:
            try:
                bs = datetime.strptime(str(b.get("start_time", ""))[:8], "%H:%M:%S")
                be = datetime.strptime(str(b.get("end_time", ""))[:8], "%H:%M:%S")
            except Exception:
                continue
            b_start = bs.hour * 60 + bs.minute
            b_end = be.hour * 60 + be.minute
            if slot_start < b_end and slot_end > b_start:
                return True
        return False

    def _is_slot_booked(self, slot_time: time, booked: list[tuple[time, int]], service_duration: int, buffer_minutes: int, concurrent_limit: int) -> bool:
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
