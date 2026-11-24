"""Integration tests for appointment endpoints (require DATABASE_URL)."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="Set TEST_DATABASE_URL to run appointment integration tests against a dedicated test database",
)


def unique() -> str:
    return uuid.uuid4().hex[:8]

def mutate(client: TestClient, method: str, url: str, *, json: dict | None = None):
    csrf_token = client.cookies.get("csrf_token")
    headers = {"X-CSRF-Token": csrf_token} if csrf_token else {}
    return client.request(method, url, json=json, headers=headers)


def _setup(client: TestClient) -> tuple[None, str, str]:
    suffix = unique()
    reg = {
        "salon_name": f"Appt Salon {suffix}",
        "owner_name": "Test Owner",
        "email": f"owner-{suffix}@test.com",
        "phone": "+15555550123",
        "password": "Password123!",
        "address": "123 Test Street",
    }
    with patch("app.services.registration_service.random.randint", return_value=1), patch(
        "app.services.registration_service.send_email", new=AsyncMock()
    ):
        r = client.post("/api/v1/auth/register", json=reg)
    assert r.status_code == 200, r.text
    r = client.post("/api/v1/auth/verify-code", json={"email": reg["email"], "code": "111111"})
    assert r.status_code == 200, r.text
    user_id = r.json()["data"]["user_id"]

    # service
    svc = {"name": "Haircut", "duration_minutes": 30, "price": "25.00", "category": "Hair"}
    r = mutate(client, "POST", "/api/v1/services", json=svc)
    assert r.status_code == 201, r.text
    service_id = r.json()["id"]

    # staff
    st = {"user_id": user_id, "payment_type": "hourly", "payment_rate": "20.00"}
    r = mutate(client, "POST", "/api/v1/staff", json=st)
    assert r.status_code == 201, r.text
    staff_id = r.json()["id"]

    return None, service_id, staff_id


def test_appointment_flow() -> None:
    settings.database_url = TEST_DATABASE_URL or ""
    client = TestClient(app)
    _, service_id, staff_id = _setup(client)

    start = (datetime.now(timezone.utc) + timedelta(days=2)).replace(hour=10, minute=0, second=0, microsecond=0)
    availability = {
        "staff_id": staff_id,
        "day_of_week": start.weekday(),
        "start_time": "09:00",
        "end_time": "17:00",
        "is_recurring": True,
        "effective_from": datetime.now(timezone.utc).date().isoformat(),
    }
    r = mutate(client, "POST", "/api/v1/availability", json=availability)
    assert r.status_code == 200, r.text

    end = start + timedelta(minutes=30)
    payload = {
        "staff_id": staff_id,
        "service_id": service_id,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "price": "25.00",
        "is_guest": True,
        "guest_name": "Test Guest",
    }
    r = mutate(client, "POST", "/api/v1/appointments", json=payload)
    assert r.status_code == 201, r.text
    aid = r.json()["id"]

    rescheduled_start = start + timedelta(minutes=30)
    rescheduled_end = rescheduled_start + timedelta(minutes=30)
    r = mutate(
        client,
        "PUT",
        f"/api/v1/appointments/{aid}",
        json={
            "start_time": rescheduled_start.isoformat(),
            "end_time": rescheduled_end.isoformat(),
            "time_zone": "UTC",
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["start_time"] == rescheduled_start.isoformat()

    r = client.get(f"/api/v1/appointments/{aid}")
    assert r.status_code == 200
    assert r.json()["status"] == "scheduled"

    r = mutate(client, "POST", f"/api/v1/appointments/{aid}/confirm", json={})
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"

    r = mutate(client, "POST", f"/api/v1/appointments/{aid}/start", json={})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"

    r = mutate(client, "POST", f"/api/v1/appointments/{aid}/complete", json={})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    r = mutate(client, "DELETE", f"/api/v1/appointments/{aid}")
    assert r.status_code == 204
