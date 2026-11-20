# Salon Backend (`app/server`)

Production-first FastAPI backend for the rebuilt salon platform.

## Endpoints
- `GET /health` - service health; reports database status when `DATABASE_URL` is configured
- `GET /` - basic service info

## Configuration
- Copy `.env.example` to `.env` for reference; set runtime env vars in Render/production.
- `DATABASE_URL` - Neon PostgreSQL URL (e.g. `postgresql://...` or `postgresql+psycopg://...`). Normalized to async psycopg with `sslmode=require` at runtime.
- `PLATFORM_DOMAIN`, `FRONTEND_URL`, `CORS_ORIGINS` - production domain settings.

## Run tests
```bash
pip install -r requirements.txt
pytest
```

## Migrations
Alembic is configured in `alembic/`. `entrypoint.py` runs `alembic upgrade head` on startup when `DATABASE_URL` is set, then starts uvicorn.

## Container
Builds with `Dockerfile`. `CMD` runs `python entrypoint.py` (migrate-on-start, binds to `$PORT`).
