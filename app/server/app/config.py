"""Application configuration."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str, *, async_driver: bool = True) -> str:
    """Normalize a Postgres URL for SQLAlchemy/Alembic.

    - Converts postgres/postgresql schemes to postgresql+psycopg for async use.
    - Ensures sslmode=require when not explicitly provided (Neon requires TLS).
    """
    raw = (url or "").strip()
    if not raw:
        return ""

    parsed = urlparse(raw)
    scheme = parsed.scheme.lower()

    if async_driver:
        if scheme in {"postgres", "postgresql"}:
            scheme = "postgresql+psycopg"
        elif scheme == "postgresql+psycopg":
            scheme = "postgresql+psycopg"
    else:
        if scheme in {"postgres", "postgresql+psycopg", "postgresql+asyncpg"}:
            scheme = "postgresql"
        elif scheme == "postgres":
            scheme = "postgresql"

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    if "sslmode" not in {k.lower() for k in query.keys()}:
        query["sslmode"] = "require"

    normalized = parsed._replace(scheme=scheme, query=urlencode(query))
    return urlunparse(normalized)


class Settings(BaseSettings):
    """Runtime settings loaded from environment variables."""

    app_name: str = "Salon API"
    environment: str = "development"
    debug: bool = False
    api_prefix: str = "/api/v1"
    port: int = 8000
    log_level: str = "INFO"

    frontend_url: str = Field(
        default="https://kenikoolsalon.com",
        alias="FRONTEND_URL",
    )
    platform_domain: str = Field(
        default="kenikoolsalon.com",
        alias="PLATFORM_DOMAIN",
    )
    cors_origins: str = Field(
        default="https://kenikoolsalon.com,https://www.kenikoolsalon.com,https://api.kenikoolsalon.com",
        alias="CORS_ORIGINS",
    )
    database_url: str = Field(default="", alias="DATABASE_URL")

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        value = self.cors_origins.strip()
        if value == "*":
            return ["*"]
        return [origin.strip() for origin in value.split(",") if origin.strip()]

    @property
    def database_url_async(self) -> str:
        return normalize_database_url(self.database_url, async_driver=True)

    @property
    def database_url_sync(self) -> str:
        return normalize_database_url(self.database_url, async_driver=False)

    @property
    def database_configured(self) -> bool:
        return bool(self.database_url.strip())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
