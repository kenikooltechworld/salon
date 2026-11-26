"""Application configuration."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(url: str, *, async_driver: bool = True) -> str:
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

    resend_api_key: str = Field(default="", alias="RESEND_API_KEY")
    email_from: str = Field(default="Kenikool Salon <noreply@localhost>", alias="EMAIL_FROM")

    cloudflare_account_id: str = Field(default="", alias="CLOUDFLARE_ACCOUNT_ID")
    cloudflare_access_key: str = Field(default="", alias="CLOUDFLARE_ACCESS_KEY")
    cloudflare_secret_access_key: str = Field(default="", alias="CLOUDFLARE_SECRET_ACCESS_KEY")
    cloudflare_s3_api_endpoint: str = Field(default="", alias="CLOUDFLARE_S3_API_ENDPOINT")
    cloudflare_r2_public_url: str = Field(default="", alias="CLOUDFLARE_R2_PUBLIC_URL")
    cloudflare_r2_bucket: str = Field(default="kenikool-salon", alias="CLOUDFLARE_R2_BUCKET")

    cloudinary_cloud_name: str = Field(default="", alias="CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str = Field(default="", alias="CLOUDINARY_API_KEY")
    cloudinary_api_secret: str = Field(default="", alias="CLOUDINARY_API_SECRET")

    jwt_secret_key: str = Field(
        default="dev-jwt-secret-change-in-production",
        alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field(default="HS256", alias="JWT_ALGORITHM")
    jwt_access_token_expire_minutes: int = Field(
        default=1440, alias="JWT_ACCESS_TOKEN_EXPIRE_MINUTES"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=30, alias="JWT_REFRESH_TOKEN_EXPIRE_DAYS"
    )

    paystack_secret_key: str = Field(default="", alias="PAYSTACK_LIVE_SECRET_KEY")
    paystack_public_key: str = Field(default="", alias="PAYSTACK_LIVE_PUBLIC_KEY")
    paystack_webhook_secret: str = Field(default="", alias="PAYSTACK_WEBHOOK_SECRET")
    paystack_base_url: str = Field(default="https://api.paystack.co", alias="PAYSTACK_BASE_URL")
    paystack_callback_url: str = Field(default="https://kenikoolsalon.com/paystack/callback", alias="PAYSTACK_CALLBACK_URL")
    platform_fee_percentage: float = Field(default=15.0, alias="PLATFORM_FEE_PERCENTAGE")

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
    def cors_origin_regex(self) -> str | None:
        """Allow tenant subdomain origins on the configured platform domain."""
        domain = (self.platform_domain or "").strip().lower().strip(".")
        if not domain:
            return None
        escaped = ".".join(part.replace("-", r"\-") for part in domain.split(".") if part)
        if not escaped:
            return None
        # Allow https://<label>.platform.domain and nested tenant labels.
        return rf"^https://([a-z0-9](?:[a-z0-9\-]{{0,61}}[a-z0-9])?\.)+{escaped}$"

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
