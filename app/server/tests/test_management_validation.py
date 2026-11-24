from datetime import date
from types import SimpleNamespace

import pytest
from pydantic import ValidationError

from app.schemas.appointment import AppointmentCreate, AppointmentUpdate
from app.schemas.availability import AvailabilityCreateRequest
from app.services.availability_service import AvailabilityService


def valid_appointment(**overrides):
    payload = {
        "staff_id": "2e272e7f-1244-4888-99bf-7bfbd08cb331",
        "service_id": "b55be61f-c0fb-4b45-9512-93e6c6d2413a",
        "customer_id": "85b66fb9-a1b1-4f18-a303-7155f122fd16",
        "start_time": "2035-05-14T10:00:00+01:00",
        "end_time": "2035-05-14T10:30:00+01:00",
        "time_zone": "Africa/Lagos",
    }
    return {**payload, **overrides}


def valid_availability(**overrides):
    payload = {
        "staff_id": "2e272e7f-1244-4888-99bf-7bfbd08cb331",
        "day_of_week": 0,
        "start_time": "09:00",
        "end_time": "17:00",
        "is_recurring": True,
        "effective_from": date(2035, 1, 1),
    }
    return {**payload, **overrides}


def test_appointment_requires_timezone_and_service_duration():
    appointment = AppointmentCreate(**valid_appointment())
    assert appointment.time_zone == "Africa/Lagos"

    with pytest.raises(ValidationError, match="timezone"):
        AppointmentCreate(**valid_appointment(start_time="2035-05-14T10:00:00"))


def test_guest_booking_can_reference_a_tenant_customer():
    appointment = AppointmentCreate(**valid_appointment(is_guest=True, guest_name="Guest"))
    assert appointment.customer_id is not None


def test_booking_payment_cannot_be_marked_paid_at_creation():
    with pytest.raises(ValidationError, match="must remain pending"):
        AppointmentCreate(**valid_appointment(payment_status="paid"))


def test_appointment_update_requires_a_change():
    with pytest.raises(ValidationError, match="At least one field"):
        AppointmentUpdate()
    with pytest.raises(ValidationError, match="start_time and end_time must be updated together"):
        AppointmentUpdate(start_time="2035-05-14T10:00:00+01:00")


def test_appointment_rejects_unknown_fields():
    with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
        AppointmentCreate(**valid_appointment(status="completed"))


def test_availability_rejects_out_of_hours_and_overlapping_breaks():
    with pytest.raises(ValidationError, match="within working hours"):
        AvailabilityCreateRequest(**valid_availability(breaks=[{"start_time": "08:00", "end_time": "09:30"}]))
    with pytest.raises(ValidationError, match="must not overlap"):
        AvailabilityCreateRequest(**valid_availability(breaks=[
            {"start_time": "12:00", "end_time": "13:00"},
            {"start_time": "12:30", "end_time": "13:30"},
        ]))


def test_weekly_schedules_only_conflict_when_days_and_hours_overlap():
    base = dict(
        effective_from=date(2035, 1, 1),
        effective_to=None,
        is_recurring=True,
        day_of_week=0,
        start_time="09:00:00",
        end_time="12:00:00",
    )
    existing = SimpleNamespace(**base)
    overlapping = SimpleNamespace(**{**base, "start_time": "11:00:00", "end_time": "13:00:00"})
    other_day = SimpleNamespace(**{**base, "day_of_week": 1})
    after_hours = SimpleNamespace(**{**base, "start_time": "12:00:00", "end_time": "14:00:00"})

    assert AvailabilityService._schedules_overlap(existing, overlapping)
    assert not AvailabilityService._schedules_overlap(existing, other_day)
    assert not AvailabilityService._schedules_overlap(existing, after_hours)
