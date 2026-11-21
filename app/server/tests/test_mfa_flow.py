"""Integration tests for MFA (require DATABASE_URL)."""
from __future__ import annotations

import pyotp
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
            "name": f"Mfa Salon {suffix}",
            "subdomain": f"mfa-salon-{suffix}",
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


def test_mfa_setup_verify_validate_disable() -> None:
    client = TestClient(app)
    email = _register_and_login(client)

    # setup
    r = client.post("/api/v1/auth/mfa/setup")
    assert r.status_code == 200, r.text
    secret = r.json()["secret"]
    assert secret

    # verify with wrong code
    r = client.post("/api/v1/auth/mfa/verify", json={"code": "000000"})
    assert r.status_code == 400

    # verify with correct code
    code = pyotp.TOTP(secret).now()
    r = client.post("/api/v1/auth/mfa/verify", json={"code": code})
    assert r.status_code == 200, r.text
    assert r.json()["mfa_enabled"] is True

    # logout
    client.post("/api/v1/auth/logout")

    # login now requires MFA
    r = client.post("/api/v1/auth/login", json={"email": email, "password": "Password123!"})
    assert r.status_code == 200, r.text
    assert r.json().get("mfa_required") is True

    # validate with wrong code
    r = client.post("/api/v1/auth/mfa/validate", json={"email": email, "code": "000000"})
    assert r.status_code == 401

    # validate with correct code
    code = pyotp.TOTP(secret).now()
    r = client.post("/api/v1/auth/mfa/validate", json={"email": email, "code": code})
    assert r.status_code == 200, r.text

    # me works
    r = client.get("/api/v1/auth/me")
    assert r.status_code == 200

    # disable MFA
    r = client.post(
        "/api/v1/auth/mfa/disable",
        json={"password": "Password123!", "code": pyotp.TOTP(secret).now()},
    )
    assert r.status_code == 200, r.text
