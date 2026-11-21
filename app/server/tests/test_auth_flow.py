"""Integration tests for auth endpoints (require DATABASE_URL)."""
from __future__ import annotations

import os
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


def test_register_login_me_flow() -> None:
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
    data = r.json()
    assert data["tenant"]["subdomain"] == reg["tenant"]["subdomain"]
    assert data["user"]["email"] == reg["user"]["email"]

    login = {"email": reg["user"]["email"], "password": reg["user"]["password"]}
    r = client.post("/api/v1/auth/login", json=login)
    assert r.status_code == 200, r.text

    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200, r.text
    assert r.json()["user"]["email"] == reg["user"]["email"]


def test_login_invalid_credentials() -> None:
    client = TestClient(app)
    r = client.post(
        "/api/v1/auth/login",
        json={"email": f"nope-{unique()}@test.com", "password": "wrong"},
    )
    assert r.status_code == 401
