"""Tests for configuration helpers."""

from app.config import normalize_database_url


def test_normalize_database_url_empty() -> None:
    assert normalize_database_url("") == ""
    assert normalize_database_url("   ") == ""


def test_normalize_database_url_async_adds_driver_and_ssl() -> None:
    url = "postgresql://user:pass@host/db"
    out = normalize_database_url(url, async_driver=True)
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode=require" in out


def test_normalize_database_url_preserves_existing_sslmode() -> None:
    url = "postgres://user:pass@host/db?sslmode=verify-full"
    out = normalize_database_url(url, async_driver=True)
    assert "sslmode=verify-full" in out
    assert out.count("sslmode=") == 1


def test_normalize_database_url_sync_driver() -> None:
    url = "postgresql+psycopg://user:pass@host/db"
    out = normalize_database_url(url, async_driver=False)
    assert out.startswith("postgresql://")
    assert "+psycopg" not in out.split("?")[0]
