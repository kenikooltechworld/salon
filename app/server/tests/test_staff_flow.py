"""Integration tests for staff endpoints (require DATABASE_URL)."""
from __future__ import annotations

import uuid

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


def _register_and_login(client: TestClient) -> tuple[None, str]:
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Staff Salon {suffix}",
            "subdomain": f"staff-salon-{suffix}",
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
    return None, user_id


def test_staff_flow() -> None:
    client = TestClient(app)
    _, user_id = _register_and_login(client)

    payload = {
        "user_id": user_id,
        "specialties": ["haircut"],
        "payment_type": "hourly",
        "payment_rate": "20.00",
        "bio": "Experienced stylist",
        "is_available_for_public_booking": True,
    }
    r = client.post("/api/v1/staff", json=payload)
    assert r.status_code == 201, r.text
    sid = r.json()["id"]

    r = client.get(f"/api/v1/staff/{sid}")
    assert r.status_code == 200
    assert r.json()["user_id"] == user_id

    r = client.put(f"/api/v1/staff/{sid}", json={"bio": "Updated bio"})
    assert r.status_code == 200
    assert r.json()["bio"] == "Updated bio"

    r = client.delete(f"/api/v1/staff/{sid}")
    assert r.status_code == 204
