"""Integration tests for email verification (require DATABASE_URL)."""
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


def test_email_verification_flow() -> None:
    client = TestClient(app)
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Ver Salon {suffix}",
            "subdomain": f"ver-salon-{suffix}",
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

    # login (cookies set)
    login = {"email": reg["user"]["email"], "password": reg["user"]["password"]}
    r = client.post("/api/v1/auth/login", json=login)
    assert r.status_code == 200, r.text

    # send verification
    r = client.post("/api/v1/auth/send-verification")
    assert r.status_code == 200, r.text
    token = r.json().get("verification_token")
    assert token is not None

    # verify with invalid token
    r = client.post("/api/v1/auth/verify-email", json={"token": "invalid"})
    assert r.status_code == 400

    # verify with valid token
    r = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert r.status_code == 200, r.text
    assert r.json()["email_verified"] is True

    # token cannot be reused
    r = client.post("/api/v1/auth/verify-email", json={"token": token})
    assert r.status_code == 400
