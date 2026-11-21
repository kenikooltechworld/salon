"""Integration tests for service endpoints (require DATABASE_URL)."""
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
            "name": f"Svc Salon {suffix}",
            "subdomain": f"svc-salon-{suffix}",
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
    return None


def test_service_category_and_service_flow() -> None:
    client = TestClient(app)
    _register_and_login(client)

    # create category
    cat = {"name": "Hair", "color": "#FF0000", "is_active": True}
    r = client.post("/api/v1/service-categories", json=cat)
    assert r.status_code == 201, r.text
    cat_id = r.json()["id"]

    # list categories
    r = client.get("/api/v1/service-categories")
    assert r.status_code == 200
    assert any(c["id"] == cat_id for c in r.json())

    # create service
    svc = {
        "name": "Haircut",
        "duration_minutes": 30,
        "price": "25.00",
        "category": "Hair",
        "is_active": True,
    }
    r = client.post("/api/v1/services", json=svc)
    assert r.status_code == 201, r.text
    svc_id = r.json()["id"]

    # get service
    r = client.get(f"/api/v1/services/{svc_id}")
    assert r.status_code == 200
    assert r.json()["name"] == "Haircut"

    # update service
    r = client.put(f"/api/v1/services/{svc_id}", json={"price": "30.00"})
    assert r.status_code == 200
    assert r.json()["price"] == "30.00"

    # delete service
    r = client.delete(f"/api/v1/services/{svc_id}")
    assert r.status_code == 204

    # delete category
    r = client.delete(f"/api/v1/service-categories/{cat_id}")
    assert r.status_code == 204
