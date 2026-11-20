"""Application configuration."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
        default="http://localhost:3000,http://localhost:5173,https://kenikoolsalon.com,https://www.kenikoolsalon.com,https://api.kenikoolsalon.com",
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


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
