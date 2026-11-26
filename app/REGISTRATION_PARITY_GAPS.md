# Tenant Registration Parity Gaps

Comparison: `KenikoolSalon/backend` (legacy) vs `app/server` (rebuild). Focus: tenant/owner registration flow.

## Status Legend
- `[ ]` Missing in app
- `[~]` Partial / different behavior
- `[x]` Present

## 1. Post-Verify Bootstrap

- [x] **Trial subscription creation**. App now creates Free/tier-0 pricing plan if needed and a 30-day trial subscription during registration verify.
  - Legacy: `KenikoolSalon/backend/app/routes/registration.py`, `KenikoolSalon/backend/app/services/registration_service.py`, `KenikoolSalon/backend/app/services/subscription_service.py`, `KenikoolSalon/backend/app/models/subscription.py`, `KenikoolSalon/backend/app/models/pricing_plan.py`
  - App: `app/server/app/services/registration_service.py`, `app/server/app/services/subscription_service.py`, `app/server/app/models/subscription.py`, `app/server/app/models/pricing_plan.py`, migration `g1h2i3j4k5l6_add_pricing_plans_and_subscriptions.py`. Live `/billing/subscription` now exposes trial fields.

- [ ] **Default RBAC roles/permissions bootstrap**. Legacy creates default permissions/roles for the tenant and assigns Owner role.
  - Legacy: `KenikoolSalon/backend/app/services/rbac_service.py` (`create_default_roles`, permission/resource/action seeding), `KenikoolSalon/backend/app/services/registration_service.py`
  - App: `app/server/app/models/role.py` exists, but registration does not create default roles/permissions; no equivalent RBAC permission model/service bootstrap in registration path.

- [ ] **Owner role assignment via `role_ids`**. Legacy user has `role_ids` and registration assigns Owner role.
  - Legacy: `KenikoolSalon/backend/app/models/user.py` (`role_ids = ListField(ObjectIdField())`), registration assigns `[role.id]`
  - App: `app/server/app/models/user.py` has single `role: str`; no multi-role assignment.

## 2. Data Model Gaps

- [~] **TempRegistration fields mostly present**. App includes `bank_account`, `referral_code`, `referral_tenant_id`, attempt/lock/expiry/code hash fields.
  - Legacy: `KenikoolSalon/backend/app/models/temp_registration.py`
  - App: `app/server/app/models/temp_registration.py`
  - Gap: `referral_tenant_id` is stored as column but not populated/validated by business logic in inspected app flow.

- [ ] **Tenant lifecycle/subscription fields parity**. Legacy tenant includes deletion/recovery and subscription-tier lifecycle tied to subscription domain.
  - Legacy: `KenikoolSalon/backend/app/models/tenant.py` (`deleted_at`, `deletion_status`, `recovery_token`, `recovery_token_expires_at`, `subscription_tier` choices incl. trial/starter/professional/enterprise)
  - App: `app/server/app/models/tenant.py` has `is_published`, `settings`, paystack subaccount fields, `recovery_token_hash`; missing legacy deletion lifecycle fields and subscription domain coupling.

- [ ] **User model parity for registration/onboarding**. 
  - Legacy: `KenikoolSalon/backend/app/models/user.py` has `role_ids`, `specialty`, `last_failed_login`, `account_locked_until`, `password_change_required`
  - App: `app/server/app/models/user.py` has single `role`, lock/reset/verification fields, `password_change_required`; missing `role_ids`, `specialty`, legacy lock timestamp naming/shape differences.

- [ ] **Pricing/subscription domain missing**.
  - Legacy: `KenikoolSalon/backend/app/models/pricing_plan.py`, `KenikoolSalon/backend/app/models/subscription.py`, `KenikoolSalon/backend/app/services/subscription_service.py`
  - App: no equivalent pricing plan/subscription models/services found in `app/server/app/models` or registration flow.

## 3. Registration Flow / API Contract

- [~] **Verify response contract differs**. Legacy returns account data plus tokens and sets auth/session cookies; sends welcome email.
  - Legacy: `KenikoolSalon/backend/app/routes/registration.py` verify returns `access_token`, `refresh_token`, `token_type`; sets auth cookies incl. session/csrf-related values via auth service; sends welcome email async.
  - App: `app/server/app/api/v1/routes/registration.py` verify returns `success/message/data` with `tenant_id/subdomain/full_url/user_id`; sets `access_token`/`refresh_token` cookies; no body tokens, no session creation, no welcome email.

- [~] **Register endpoint duplication/ambiguity**. App exposes two `/auth/register` implementations.
  - `app/server/app/api/v1/routes/registration.py`: two-phase temp registration (`RegisterResponse` with `data`).
  - `app/server/app/api/v1/routes/auth.py`: direct register (`RegisterResponse` with `tenant/user`).
  - `app/server/app/api/v1/router.py` includes `registration_routes` before `auth_routes`; contract should be clarified to avoid client ambiguity.

- [~] **Email delivery/error behavior differs**.
  - Legacy: sends verification email async/background; route saves temp reg after background send call.
  - App: sends verification email as required during registration/resend; returns `503` on `EmailDeliveryError`.

- [~] **Existing-user/registration edge behavior differs**.
  - Legacy service has account-exists handling in verify path in inspected snippets; behavior more permissive in specific cases.
  - App: explicit `Email already registered` / `Registration not found or expired` / pending verification errors.

## 4. Security / Auth Integration

- [ ] **Server-side session + CSRF cookie parity on verify**. Legacy verify creates session and sets session-related cookies. App verify issues JWT cookies only; no session record/cookie in inspected verify flow.
  - Legacy: `KenikoolSalon/backend/app/routes/registration.py` uses `AuthenticationService.create_session`, `_set_auth_cookies`.
  - App: `app/server/app/api/v1/routes/registration.py` sets JWT cookies via `AuthController._issue`/`set_auth_cookies`.

- [ ] **RBAC permissions in auth token/session**. Legacy computes user permissions from roles and includes role/permission context in token creation. App token includes role string only.

## 5. Referral / Bank Account Business Logic

- [~] **Fields accepted and stored, business effect incomplete**.
  - Legacy: accepts `bank_account`, `referral_code`; stores referral info in temp registration and tenant/user onboarding context.
  - App: accepts/stores `bank_account`, `referral_code`; `referral_tenant_id` column exists but is not populated/used in inspected registration service. No referral reward/linking side effects observed.

## Priority Order

1. **Trial subscription bootstrap** - required for legacy onboarding parity.
2. **RBAC default roles/permissions + Owner assignment** - structural auth/authorization parity gap.
3. **Verify contract/onboarding side effects** - welcome email, session/CSRF/token response contract.
4. **Model parity** - tenant deletion/recovery, user multi-role/specialty, subscription/pricing domain.
5. **Route contract cleanup** - resolve duplicate `/auth/register` behavior.