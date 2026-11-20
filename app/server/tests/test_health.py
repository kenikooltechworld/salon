"""API tests for health and root endpoints."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.main import create_app


def test_root_endpoint() -> None:
    client = TestClient(create_app())
    response = client.get("/")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["api_prefix"] == "/api/v1"


def test_health_endpoint_db_not_configured() -> None:
    with patch("app.services.health_service.settings.database_url", ""):
        client = TestClient(create_app())
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["status"] == "not_configured"


def test_api_v1_health_endpoint_db_not_configured() -> None:
    with patch("app.services.health_service.settings.database_url", ""):
        client = TestClient(create_app())
        response = client.get("/api/v1/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["status"] == "not_configured"


def test_health_endpoint_db_ok() -> None:
    with patch("app.services.health_service.settings.database_url", "postgresql://user:pass@host/db"), patch(
        "app.services.health_service.ping_db", AsyncMock(return_value=(True, None))
    ):
        client = TestClient(create_app())
        response = client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database"]["status"] == "ok"


def test_health_endpoint_db_error() -> None:
    with patch("app.services.health_service.settings.database_url", "postgresql://user:pass@host/db"), patch(
        "app.services.health_service.ping_db", AsyncMock(return_value=(False, "ConnectionError"))
    ):
        client = TestClient(create_app())
        response = client.get("/health")

    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "degraded"
    assert data["database"]["status"] == "error"