# Salon Backend (`app/server`)

Production-first FastAPI backend for the rebuilt salon platform.

## Endpoints (Phase 1)
- `GET /health` - service health
- `GET /` - basic service info

## Configuration
- Copy `.env.example` to `.env` and set values as needed.
- `DATABASE_URL` will be set to Neon PostgreSQL in later phases (not used in Phase 1).

## Run tests
```bash
pip install -r requirements.txt
pytest
```

## Container
Builds with `Dockerfile`. Binds to `$PORT` (Render-compatible).
