"""Integration tests for appointment endpoints (require DATABASE_URL)."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app

pytestmark = pytest.mark.skipif(
    not settings.database_configured,
    reason="DATABASE_URL not configured",
)


def unique() -> str:
    return uuid.uuid4().hex[:8]


def _setup(client: TestClient) -> tuple[str, str, str]:
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Appt Salon {suffix}",
            "subdomain": f"appt-salon-{suffix}",
            "email": f"owner-{suffix}@test.com",
        },
        "user": {
            "email": f"owner-{suffix}@test.com",
            "password": "Password123!",
            "first_name": "Test",
            "last_name": "Owner",
        },
    }
    r = client.post("/api/v1/auth/register", json=reg)
    assert r.status_code == 201, r.text
    user_id = r.json()["user"]["id"]
    login = {"email": reg["user"]["email"], "password": reg["user"]["password"]}
    r = client.post("/api/v1/auth/login", json=login)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # service
    svc = {"name": "Haircut", "duration_minutes": 30, "price": "25.00", "category": "Hair"}
    r = client.post("/api/v1/services", json=svc, headers=headers)
    assert r.status_code == 201, r.text
    service_id = r.json()["id"]

    # staff
    st = {"user_id": user_id, "payment_type": "hourly", "payment_rate": "20.00"}
    r = client.post("/api/v1/staff", json=st, headers=headers)
    assert r.status_code == 201, r.text
    staff_id = r.json()["id"]

    return token, service_id, staff_id


def test_appointment_flow() -> None:
    client = TestClient(app)
    token, service_id, staff_id = _setup(client)
    headers = {"Authorization": f"Bearer {token}"}

    start = datetime.now(timezone.utc) + timedelta(days=1)
    end = start + timedelta(minutes=30)
    payload = {
        "staff_id": staff_id,
        "service_id": service_id,
        "start_time": start.isoformat(),
        "end_time": end.isoformat(),
        "price": "25.00",
    }
    r = client.post("/api/v1/appointments", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    aid = r.json()["id"]

    r = client.get(f"/api/v1/appointments/{aid}", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "scheduled"

    r = client.put(f"/api/v1/appointments/{aid}", json={"status": "confirmed"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"

    r = client.delete(f"/api/v1/appointments/{aid}", headers=headers)
    assert r.status_code == 204
