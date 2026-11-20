"""Database engine, session, and health helpers."""
from __future__ import annotations

import logging
from collections.abc import AsyncGenerator
from typing import Optional

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from .config import settings

logger = logging.getLogger(__name__)

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def get_engine() -> Optional[AsyncEngine]:
    return _engine


def get_session_factory() -> Optional[async_sessionmaker[AsyncSession]]:
    return _session_factory


def init_engine() -> Optional[AsyncEngine]:
    """Create the async engine/session factory if DATABASE_URL is configured."""
    global _engine, _session_factory

    if _engine is not None:
        return _engine

    if not settings.database_configured:
        logger.info("DATABASE_URL not configured; database features disabled")
        return None

    url = settings.database_url_async
    # Neon + psycopg async: prefer pool_pre_ping; keep pool modest for serverless Postgres.
    _engine = create_async_engine(
        url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=5,
        pool_recycle=300,
    )
    _session_factory = async_sessionmaker(
        bind=_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    logger.info("Database engine initialized")
    return _engine


async def close_engine() -> None:
    """Dispose the engine and clear globals."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        logger.info("Database engine disposed")
    _engine = None
    _session_factory = None


async def ping_db() -> tuple[bool, Optional[str]]:
    """Check database connectivity. Returns (ok, error_message)."""
    if not settings.database_configured:
        return True, None

    engine = get_engine() or init_engine()
    if engine is None:
        return False, "database engine not initialized"

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True, None
    except Exception as exc:  # pragma: no cover - exercised via integration
        logger.warning("Database ping failed: %s", exc)
        return False, exc.__class__.__name__


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    factory = get_session_factory()
    if factory is None:
        raise RuntimeError("Database is not configured")

    async with factory() as session:
        yield session
