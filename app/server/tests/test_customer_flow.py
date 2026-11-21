"""Integration tests for customer endpoints (require DATABASE_URL)."""
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


def _register_and_login(client: TestClient) -> str:
    suffix = unique()
    reg = {
        "tenant": {
            "name": f"Cust Salon {suffix}",
            "subdomain": f"cust-salon-{suffix}",
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
    return r.json()["access_token"]


def test_customer_flow() -> None:
    client = TestClient(app)
    token = _register_and_login(client)
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "first_name": "Jane",
        "last_name": "Doe",
        "email": f"jane-{unique()}@test.com",
        "phone": "555-0100",
        "communication_preference": "email",
    }
    r = client.post("/api/v1/customers", json=payload, headers=headers)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]

    r = client.get(f"/api/v1/customers/{cid}", headers=headers)
    assert r.status_code == 200
    assert r.json()["first_name"] == "Jane"

    r = client.put(f"/api/v1/customers/{cid}", json={"phone": "555-0200"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["phone"] == "555-0200"

    r = client.delete(f"/api/v1/customers/{cid}", headers=headers)
    assert r.status_code == 204
