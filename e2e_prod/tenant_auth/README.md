# Production Tenant Auth E2E (Playwright)

Production-only Playwright checks for tenant registration/auth flows. No local backend/frontend/DB.

## Environment

- Loads repo-root `.env.test` automatically (keys only; secrets not printed).
- Required for live registration tests: `TEST_EMAIL` (real inbox owner/monitor), `TEST_PASSWORD`.
- Optional:
  - `E2E_FRONTEND_URL` (default `https://kenikoolsalon.com`)
  - `E2E_API_URL` (default `https://api.kenikoolsalon.com/api/v1`)
  - `E2E_VERIFICATION_CODE` (6-digit code for current run; needed for verify-code tests)
  - `E2E_RUN_ID` (stable run id; default generated)

## Safety

- Runs against production. Creates real temp registrations/tenants when registration tests execute.
- Uses unique `pw-<timestamp>-<rand>` identities. Do not point at customer data.
- OTP-dependent tests skip unless `E2E_VERIFICATION_CODE` is provided.

## Run

```powershell
cd C:\Users\kenik\OneDrive\Pictures\salon
$env:PYTHONPATH='app\server'
C:\Users\kenik\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe -m pytest e2e_prod/tenant_auth -q
```

Targeted:

```powershell
C:\Users\kenik\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe -m pytest e2e_prod/tenant_auth/test_tenant_auth_smoke.py -q
```
