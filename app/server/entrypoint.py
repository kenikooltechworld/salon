"""Entrypoint: run migrations (if configured) then start the server."""
from __future__ import annotations

import logging
import os
import subprocess
import sys
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("entrypoint")


def run_migrations() -> None:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        logger.info("DATABASE_URL not set; skipping migrations")
        return

    logger.info("Running database migrations (alembic upgrade head)")
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=str(Path(__file__).resolve().parent),
        check=False,
    )
    if result.returncode != 0:
        logger.error("Alembic migration failed with exit code %s", result.returncode)
        raise SystemExit(result.returncode)
    logger.info("Migrations completed successfully")


def start_server() -> None:
    host = os.getenv("HOST", "0.0.0.0")
    port = os.getenv("PORT", "8000")
    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        host,
        "--port",
        port,
    ]
    logger.info("Starting server on %s:%s", host, port)
    os.execvp(cmd[0], cmd)


if __name__ == "__main__":
    run_migrations()
    start_server()
