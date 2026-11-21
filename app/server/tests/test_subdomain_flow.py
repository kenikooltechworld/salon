"""Integration tests for subdomain generation (require DATABASE_URL)."""
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


def test_auto_generated_subdomain() -> None:
    client = TestClient(app)
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Beauty Salon {suffix}",
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
    subdomain = r.json()["tenant"]["subdomain"]
    assert subdomain
    assert subdomain.startswith("beauty-salon")
    # full domain form
    assert f"{subdomain}.kenikoolsalon.com"


def test_custom_subdomain() -> None:
    client = TestClient(app)
    suffix = unique()
    custom = f"custom-{suffix}"
    reg = {
        "tenant": {
            "name": f"Custom Salon {suffix}",
            "subdomain": custom,
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
    assert r.json()["tenant"]["subdomain"] == custom


def test_invalid_subdomain_rejected() -> None:
    client = TestClient(app)
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Bad Salon {suffix}",
            "subdomain": "INVALID SUBDOMAIN!",
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
    assert r.status_code == 422


def test_reserved_subdomain_rejected() -> None:
    client = TestClient(app)
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Reserved Salon {suffix}",
            "subdomain": "www",
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
    assert r.status_code == 422
