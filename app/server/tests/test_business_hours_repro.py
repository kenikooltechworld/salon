"""Quick reproduction test for business hours settings update."""
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


def test_business_hours_update_persists() -> None:
    client = TestClient(app)
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Test Salon {suffix}",
            "subdomain": f"test-salon-{suffix}",
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

    login = {"email": reg["user"]["email"], "password": "Password123!"}
    r = client.post("/api/v1/auth/login", json=login)
    assert r.status_code == 200, r.text

    # Get CSRF token
    r = client.get("/api/v1/auth/csrf-token")
    assert r.status_code == 200, r.text
    csrf_token = r.json()["csrf_token"]
    print("CSRF token:", csrf_token)

    # Get current settings
    r = client.get(
        "/api/v1/settings",
        headers={"x-csrf-token": csrf_token},
    )
    assert r.status_code == 200, r.text
    original_bh = r.json()["data"]["business_hours"]
    print("Original business hours:", original_bh)

    # Modify Monday open_time
    new_bh = dict(original_bh)
    new_bh["monday"] = dict(original_bh["monday"], open_time="10:00", close_time="20:00", is_closed=False)

    r = client.put(
        "/api/v1/settings",
        json={"salon_name": f"Test Salon {suffix}", "email": reg["user"]["email"], "phone": "", "address": "", "business_hours": new_bh},
        headers={"x-csrf-token": csrf_token},
    )
    assert r.status_code == 200, r.text
    updated_bh = r.json()["data"]["business_hours"]
    print("Updated business hours:", updated_bh)

    assert updated_bh["monday"]["open_time"] == "10:00", updated_bh["monday"]
    assert updated_bh["monday"]["close_time"] == "20:00", updated_bh["monday"]
    assert updated_bh["monday"]["is_closed"] is False, updated_bh["monday"]

    # Verify persistence by GET again
    r = client.get("/api/v1/settings", headers={"x-csrf-token": csrf_token})
    assert r.status_code == 200, r.text
    persisted_bh = r.json()["data"]["business_hours"]
    assert persisted_bh["monday"]["open_time"] == "10:00", persisted_bh["monday"]
    assert persisted_bh["monday"]["close_time"] == "20:00", persisted_bh["monday"]
