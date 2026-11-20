"""FastAPI application entrypoint."""
from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# psycopg async is not compatible with ProactorEventLoop on Windows.
if sys.platform == "win32":
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    except Exception:  # pragma: no cover
        pass

from .config import settings
from .db import close_engine, init_engine, ping_db

logging.basicConfig(level=getattr(logging, settings.log_level.upper(), logging.INFO))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize and dispose database resources."""
    init_engine()
    yield
    await close_engine()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        lifespan=lifespan,
    )

    origins = settings.cors_origins_list
    allow_credentials = origins != ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health():
        payload = {
            "service": settings.app_name,
            "environment": settings.environment,
        }

        if not settings.database_configured:
            payload["status"] = "ok"
            payload["database"] = {"status": "not_configured"}
            return payload

        ok, error = await ping_db()
        if ok:
            payload["status"] = "ok"
            payload["database"] = {"status": "ok"}
            return payload

        payload["status"] = "degraded"
        payload["database"] = {"status": "error"}
        if settings.debug and error:
            payload["database"]["error"] = error
        return JSONResponse(status_code=503, content=payload)

    @app.get("/")
    async def root() -> dict:
        return {
            "message": settings.app_name,
            "status": "ok",
            "api_prefix": settings.api_prefix,
        }

    return app


app = create_app()
