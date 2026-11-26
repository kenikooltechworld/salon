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

- [~] **Tenant lifecycle/subscription fields parity**. App now has `deleted_at`, `deletion_status`, and `recovery_token` (legacy-shaped) plus existing `recovery_token_hash`/expiry/requested fields. Subscription-tier lifecycle is still only partially coupled to the new subscription domain.
  - Legacy: `KenikoolSalon/backend/app/models/tenant.py` (`deleted_at`, `deletion_status`, `recovery_token`, `recovery_token_expires_at`, `subscription_tier` choices incl. trial/starter/professional/enterprise)
  - App: `app/server/app/models/tenant.py`, `app/server/app/schemas/auth.py`, migration `j4k5l6m7n8o9_model_parity_tenant_user.py`.

- [~] **User model parity for registration/onboarding**. App now has `role_ids`, `specialty`, `last_failed_login`, `password_change_required`; keeps `locked_until` naming (equivalent to legacy account lock timestamp) and email/reset/verification fields.
  - Legacy: `KenikoolSalon/backend/app/models/user.py` has `role_ids`, `specialty`, `last_failed_login`, `account_locked_until`, `password_change_required`
  - App: `app/server/app/models/user.py`, `app/server/app/schemas/auth.py`, migrations `h2i3j4k5l6m7_add_user_role_ids.py`, `j4k5l6m7n8o9_model_parity_tenant_user.py`.

- [~] **Pricing/subscription domain missing**. Core trial bootstrap exists (PricingPlan/Subscription/trial creation + billing fields), but full legacy subscription/pricing lifecycle/admin behavior is not yet complete.
  - Legacy: `KenikoolSalon/backend/app/models/pricing_plan.py`, `KenikoolSalon/backend/app/models/subscription.py`, `KenikoolSalon/backend/app/services/subscription_service.py`
  - App: `app/server/app/models/pricing_plan.py`, `app/server/app/models/subscription.py`, `app/server/app/services/subscription_service.py`, migration `g1h2i3j4k5l6_add_pricing_plans_and_subscriptions.py`.

## 3. Registration Flow / API Contract

- [~] **Verify response contract differs**. App now sends a non-blocking welcome email, includes `access_token`, `refresh_token`, `token_type` in verify response body, sets auth cookies, and sets legacy-compatible `session_id`/`tenant_id`/`user_id` cookies; server-side session records are created and access tokens include `role_ids`/`permissions`. Legacy still has richer session lifecycle/CSRF-hash-per-session validation behavior.
  - Legacy: `KenikoolSalon/backend/app/routes/registration.py` verify returns tokens; sets auth cookies incl. session/csrf-related values via auth service; sends welcome email async.
  - App: `app/server/app/api/v1/routes/registration.py`, `app/server/app/services/registration_service.py`, `app/server/app/services/auth_service.py`, `app/server/app/controllers/auth_controller.py`, `app/server/app/lib/cookies.py`, `app/server/app/lib/security.py`, `app/server/app/models/session.py`, migration `i3j4k5l6m7n8_add_sessions_table.py`.

- [x] **Register endpoint duplication/ambiguity**. `/auth/register` now accepts both contracts in `registration_routes` (included first): two-phase `{salon_name,...}` returns temp-registration response; legacy `{tenant,user}` returns legacy `{tenant,user}` 201 response for backward compatibility. Duplicate auth-router register is hidden from schema.
  - `app/server/app/api/v1/routes/registration.py`: unified contract handling.
  - `app/server/app/api/v1/routes/auth.py`: legacy duplicate hidden (`deprecated`, `include_in_schema=False`).
  - `app/server/app/api/v1/router.py` still includes `registration_routes` before `auth_routes`.

- [~] **Email delivery/error behavior differs**.
  - Legacy: sends verification email async/background; route saves temp reg after background send call.
  - App: sends verification email as required during registration/resend; returns `503` on `EmailDeliveryError`.

- [~] **Existing-user/registration edge behavior differs**.
  - Legacy service has account-exists handling in verify path in inspected snippets; behavior more permissive in specific cases.
  - App: explicit `Email already registered` / `Registration not found or expired` / pending verification errors.

## 4. Security / Auth Integration

- [x] **Server-side session + CSRF cookie parity on verify**. App creates `sessions` records and sets `session_id`, `tenant_id`, `user_id` cookies on login/register/verify/MFA flows. CSRF is validated against cookie/header and active session `csrf_token_hash`; refresh rotates session token/CSRF; logout revokes session.
  - Legacy: `KenikoolSalon/backend/app/routes/registration.py` uses `AuthenticationService.create_session`, `_set_auth_cookies`.
  - App: `app/server/app/models/session.py`, `app/server/app/services/auth_service.py`, `app/server/app/controllers/auth_controller.py`, `app/server/app/lib/cookies.py`, `app/server/app/lib/csrf.py`, `app/server/app/main.py`.

- [x] **RBAC permissions in auth token/session**. Access tokens now include `role_ids` and `permissions` (resolved from tenant roles) for issued auth sessions.

## 5. Referral / Bank Account Business Logic

- [~] **Fields accepted and stored, business effect incomplete**.
  - Legacy: accepts `bank_account`, `referral_code`; stores referral info in temp registration and tenant/user onboarding context.
  - App: accepts/stores `bank_account`, `referral_code`; `referral_tenant_id` is now resolved when `referral_code` matches an existing tenant subdomain and persisted to temp registration and tenant settings on verify. No referral reward/credit/commission side effects yet.

## Priority Order

1. **Trial subscription bootstrap** - required for legacy onboarding parity.
2. **RBAC default roles/permissions + Owner assignment** - structural auth/authorization parity gap.
3. **Verify contract/onboarding side effects** - welcome email, session/CSRF/token response contract.
4. **Model parity** - tenant deletion/recovery, user multi-role/specialty, subscription/pricing domain.
5. **Route contract cleanup** - resolve duplicate `/auth/register` behavior.
