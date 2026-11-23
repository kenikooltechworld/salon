# AGENTS.md

## Repository layout

- Root git repo tracks only `app/`, `.env.test`, `.gitignore`, `README.md`. Most product code lives in untracked/ignored directories.
- `KenikoolSalon/` is a **separate git repo** (`origin: kenikooltechworld/Kenikool-Salon.git`). Run git commands for that codebase inside `KenikoolSalon/`, not the root.
- Two code trees coexist:
  - `KenikoolSalon/` — legacy/active platform: FastAPI+MongoDB backend, React frontend, Cloudflare paystack-router worker.
  - `app/` — rebuild: FastAPI+PostgreSQL backend (`app/server`), React frontend (`app/salon`).

## `KenikoolSalon/` (legacy platform)

### Backend — `KenikoolSalon/backend`
- Stack: FastAPI, Mongoengine/MongoDB Atlas, Redis/Celery/RabbitMQ referenced in docs/config, Socket.IO. Config in `app/config.py`; env template `.env.example`.
- Install/run (from `backend/`): `python -m venv venv` then `venv\Scripts\activate` (Windows), `pip install -r requirements.txt`, `uvicorn app.main:app --reload`.
- Tests: `pytest`; single file `pytest tests/unit/test_config.py -v`; coverage `pytest --cov=app tests/`. Test deps are in `requirements.txt`; no `pytest.ini` found.
- Docker: `docker-compose up -d` from `KenikoolSalon/` starts backend+ngrok (see `docker-compose.yml`). Backend Dockerfile runs `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- Migrations/scripts: `backend/migrations/` contains Python scripts (not Alembic). Many one-off `*.py` scripts at `backend/` root are operational/diagnostic; inspect before running.

### Frontend — `KenikoolSalon/salon`
- Stack: React 19, Vite 7, TypeScript, Tailwind 4, React Router 7, React Query, Zustand, Socket.IO client. Package manager lockfile: `package-lock.json`.
- Commands (from `KenikoolSalon/salon/`): `npm run dev` (port 3000), `npm run build` (`tsc -b && vite build`), `npm run lint` (ESLint), `npm test` (Vitest), `npm test -- <file-or-pattern>` for focused tests, `npm run test:ui`, `npm run test:coverage`, `npm run preview`.
- Vite proxies `/api` and `/socket.io` to `https://api.kenikoolsalon.com` and sets forwarded headers; `server.port` is 3000. Path alias `@/* -> src/*`.
- `KenikoolSalon/CLAUDE.md` exists but contains stale/planned claims (e.g., Zustand/React Query/Axios described as missing/planned while present in `package.json`); verify against code/config before relying on it.

### Other `KenikoolSalon/` components
- `paystack-router/`: Cloudflare Worker (`wrangler dev`, `wrangler deploy`).
- `render.yaml`: Render blueprint for backend Docker web service + static salon build (`cd salon && npm install && npm run build`, publish `salon/dist`).

## `app/` (rebuild)

### Backend — `app/server`
- Stack: FastAPI, SQLAlchemy async + psycopg, Alembic, PostgreSQL/Neon. Config in `app/config.py`; env template `.env.example`. `DATABASE_URL` is normalized to async psycopg and `sslmode=require` when missing.
- Run: `pip install -r requirements.txt`; `python entrypoint.py` runs `alembic upgrade heads` when `DATABASE_URL` is set, then starts uvicorn on `$HOST:$PORT`.
- Migrations: Alembic configured (`alembic.ini`, `alembic/env.py` reads sync URL from settings). Use `python -m alembic upgrade heads` from `app/server/`.
- Tests: `pytest` from `app/server/` (`pytest.ini`: `testpaths=tests`, `pythonpath=.`, `-q`). Focused: `pytest tests/test_health.py -q`.
- API shape: FastAPI app in `app/main.py` mounts root routes and `api/v1` router; DB engine/session in `app/db.py`.

### Frontend — `app/salon`
- Stack: React 19, Vite 8, TypeScript ~7, Tailwind 4, Chakra UI, React Query, Zustand, React Hook Form/Zod, Socket.IO client. Lint uses `oxlint`; lockfile `package-lock.json`.
- Commands (from `app/salon/`): `npm run dev`, `npm run build` (`tsc -b && vite build`), `npm run lint` (`oxlint`), `npm run preview`. No test script/config found.
- TS path alias: `@/* -> ./src/*` (tsconfig). Vite uses `tsconfigPaths: true`.

## Working conventions

- Verify commands against the nearest `package.json`, `requirements.txt`, `pytest.ini`, Dockerfile, or entrypoint before running; docs may be stale.
- Do not assume root npm/python tooling; install/run in the specific subproject directory.
- Keep secrets out of commits; env files/templates exist in subprojects and root `.env.test` is present.