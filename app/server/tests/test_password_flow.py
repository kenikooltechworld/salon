"""Integration tests for password management (require DATABASE_URL)."""
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


def _register_and_login(client: TestClient) -> None:
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Pwd Salon {suffix}",
            "subdomain": f"pwd-salon-{suffix}",
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
    login = {"email": reg["user"]["email"], "password": reg["user"]["password"]}
    r = client.post("/api/v1/auth/login", json=login)
    assert r.status_code == 200, r.text
    return reg["user"]["email"]


def test_change_password_flow() -> None:
    client = TestClient(app)
    email = _register_and_login(client)

    # wrong current password
    r = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrong", "new_password": "NewPassword123!"},
    )
    assert r.status_code == 400

    # correct
    r = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "Password123!", "new_password": "NewPassword123!"},
    )
    assert r.status_code == 200, r.text

    # old password no longer works
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    assert r.status_code == 401

    # new password works
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "NewPassword123!"})
    assert r.status_code == 200


def test_forgot_and_reset_password_flow() -> None:
    client = TestClient(app)
    email = _register_and_login(client)

    # forgot password (debug mode returns token)
    r = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert r.status_code == 200, r.text
    token = r.json().get("reset_code")
    assert token is not None

    # reset with invalid token
    r = client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "code": "000000", "new_password": "ResetPassword123!"},
    )
    assert r.status_code == 400

    # reset with valid token
    r = client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "code": token, "new_password": "ResetPassword123!"},
    )
    assert r.status_code == 200, r.text

    # new password works
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "ResetPassword123!"})
    assert r.status_code == 200

    # token cannot be reused
    r = client.post(
        "/api/v1/auth/reset-password",
        json={"email": email, "code": token, "new_password": "AnotherPassword123!"},
    )
    assert r.status_code == 400
