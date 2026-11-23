# Service Management Parity Gaps (Legacy `KenikoolSalon` -> `app` rebuild)

Audit baseline: `KenikoolSalon/salon/src` service pages/components/hooks + `KenikoolSalon/backend/app/routes|schemas|models` service domain.  
Goal: full feature parity for service management (backend + frontend), no half implementations, production-ready, Chakra UI v3 + `motion/react` in `app/salon`.

Status legend: `[ ]` missing / incomplete, `[~]` partial, `[x]` done.

## 0. Cross-cutting

- [ ] **Legacy contract matrix** - Create/confirm field-by-field matrix for service, category, addon, package, commission endpoints (request, response, status codes, query params, errors).
- [ ] **Image upload flow** - Service/addon/package image upload must work end-to-end (upload endpoint, media URL, preview, remove, progress, validation, persisted `image_url/public_image_url`).
- [ ] **RBAC/UI parity** - Backend `require_roles` enforced; frontend hides/disables unauthorized actions and handles 403 gracefully.
- [ ] **Realtime updates** - `notification:new` / domain mutations refresh service/category/addon/package/commission queries where relevant.
- [ ] **Validation/toasts/errors** - Form validation, duplicate checks, API error display, success/error toasts, confirmation modals.
- [ ] **Responsive design** - Mobile/tablet/desktop parity with legacy service UX; skeleton/loading/empty states.
- [~] **Tests** - `python -m compileall app/server/app`, `npx tsc -b --pretty false`, and `npm run build` pass; backend pytest blocked locally by missing `boto3`; no new service-domain pytest/live Render smoke yet.

## 1. Backend - Services (`/api/v1/services`)

- [~] **Model fields present** - `name,description,duration_minutes,price,category,color,icon,is_active,is_published,public_description,public_image_url,allow_public_booking,allow_pay_now,tags,benefits,commission_percentage,staff_ids`. Verify defaults/nullability/indexes match intended behavior.
- [~] **List endpoint parity** - Supports `category,is_active/active_only,page,page_size,search,published_only`; legacy default excluded inactive - confirm exact semantics and response shape.
- [ ] **Create/update validation parity** - Duplicate name handling policy, category existence/normalization, staff_ids tenant validation, commission bounds, price/duration bounds, tags/benefits sanitization, image URL validation.
- [ ] **Soft delete parity** - DELETE returns expected shape/status; deactivates and preserves history; clears/confirms `allow_public_booking`; staff sync behavior confirmed.
- [ ] **Detail/get parity** - Response includes all fields used by legacy detail UI (image, icon/color, staff, tags, benefits, public fields).
- [ ] **Service-staff sync** - Bidirectional consistency on service create/update/delete and on staff update/service assignment changes.
- [ ] **Public service parity** - Host-based and UUID-based public endpoints return published+active+tenant-published services; field shape matches frontend/public booking needs.
- [ ] **Service image management** - Dedicated upload or media integration path; old image cleanup policy defined; accepts common image types/sizes.

## 2. Backend - Service Categories (`/api/v1/service-categories`)

- [~] **CRUD parity** - Create/list/get/update/delete implemented.
- [~] **Unique name/cascade/delete guard** - Case-insensitive unique per tenant; rename propagates to services; delete blocked when in use.
- [ ] **Response enrichment** - Consider `service_count`/usage metadata if UI needs it; ordering if legacy/UI expects it.
- [ ] **Validation** - Color/icon/description normalization; active toggle behavior.

## 3. Backend - Service Add-ons (`/api/v1/service-addons`, public)

- [~] **CRUD parity** - List/get/create/update/delete implemented; delete is soft-deactivate.
- [~] **Legacy field aliases** - `applicable_services` alias added in schema serializer; confirm request accepts both and response includes both where needed.
- [~] **Public path parity** - Added `/public/service-addons/{service_id}`; confirm legacy response shape (list vs wrapped response).
- [ ] **List filters/pagination parity** - Legacy admin supports `is_active,category,search,page,limit`; rebuild currently has `is_active,category,service_id` without pagination/search. Add missing filters/pagination or document deliberate contract.
- [ ] **Validation** - `applicable_service_ids` must belong to tenant; category enum/values; image URL; display order; active toggle.
- [ ] **Image upload** - Addon image upload/preview/remove parity.

## 4. Backend - Service Packages (`/api/v1/service-packages`, public)

- [~] **CRUD parity** - Create/list/get/update/delete implemented.
- [~] **Toggle endpoints** - `POST /{id}/toggle-active`, `POST /{id}/toggle-featured` added.
- [~] **Response parity** - `total_pages`, `savings`, `total_duration` aliases added; confirm exact legacy field names/shape.
- [ ] **Validation parity** - Legacy required min 2 services; rebuild currently allows min 1. Confirm and enforce intended rule. Validate service IDs belong to tenant, quantities, package price < original price, validity dates, booking limits.
- [ ] **List filters/pagination parity** - `page,page_size,is_active,is_featured,include_expired`; confirm `total_pages` calculation and empty behavior.
- [ ] **Public package parity** - Active/valid/featured filters; legacy public routes/fields; booking count/limits enforcement when public booking uses packages.
- [ ] **Image upload** - Package image upload/preview/remove parity.

## 5. Backend - Service Commissions (`/api/v1/service-commissions`)

- [~] **Endpoints present** - Calculate, staff list, summary, mark-paid POST, batch mark-paid POST.
- [x] **Legacy parity patches added** - `PATCH /{id}/mark-paid` alias, `GET /staff/{id}/pending` added.
- [ ] **Response shape parity** - Legacy fields/casing may differ (`staffId` vs `staff_id`, dates/decimals). Confirm frontend compatibility and legacy contract.
- [ ] **Commission lifecycle** - Auto-calc on appointment completion idempotent; manual calculate permissions; paid/pending transitions; notifications.
- [ ] **Summary/breakdown parity** - Breakdown by service name/id/count/amount; date filtering; totals.

## 6. Backend - Public / Booking-adjacent service behavior

- [~] **Host-based public catalog** - `/public/salon-info`, categories/services/addons/packages endpoints exist.
- [~] **Public addon-by-service** - `/public/service-addons/{service_id}` added.
- [ ] **Public booking parity** - Availability CRUD missing; booking flow needs slots/staff/service/addon/package alignment. Service management must expose required data for booking UI.
- [ ] **Rate-limit/abuse parity** - Public endpoints need legacy-equivalent protection where appropriate.

## 7. Frontend - Service Management UX (`app/salon/src`)

### 7.1 Feature layer
- [~] **Types/API/hooks** - `features/services/{types,api,hooks}.ts` exists but needs full legacy coverage and field alias normalization.
- [ ] **Query keys/invalidation** - Consistent keys for categories/services/addons/packages/commissions; invalidate on mutations and socket notifications.
- [ ] **Image upload hook** - Reuse/implement `useImageUpload` for service/addon/package images with progress/error/preview/remove.

### 7.2 Services page/list
- [ ] **Legacy layout parity** - Header, description, Manage Add-ons + Add Service actions, search bar, responsive card grid.
- [ ] **Service cards** - Image/placeholder, name/category, description, duration/price formatting, staff assigned count, edit/delete actions, click-through to detail.
- [ ] **Loading/empty/error states** - Skeleton grid, empty state, API error handling.
- [ ] **Delete confirmation** - Modal confirm with loading state and toast.

### 7.3 Service form (create/edit)
- [ ] **All fields** - name, description, category select + create-category modal, duration, price, color picker, icon picker, image upload/preview/remove/progress, staff multi-select, active, published, public booking/pay now/public description as needed, tags, benefits, commission percentage.
- [ ] **Validation/UX** - Duplicate name check, required fields, numeric bounds, upload errors, submit loading state.
- [ ] **Modal behavior** - Open/close/reset, edit prefill, refetch on success.

### 7.4 Service detail page
- [ ] **Legacy detail parity** - Back nav, icon/color, image/lightbox, description, details grid (duration/price/status/published/category), quick info (public booking/pay now/commission), staff assigned list, tags/benefits, edit/delete actions.
- [ ] **Edit flow** - Edit modal/form from detail; refetch after update.
- [ ] **Delete flow** - Confirm, delete, navigate back, toast.

### 7.5 Categories
- [ ] **Category management UI** - Create/edit/delete modal, color/icon pickers, active flag, list display, usage/delete-block feedback.
- [ ] **Category integration** - Service form category select refreshes after category create.

### 7.6 Add-ons
- [ ] **Dedicated add-ons page/parity** - Search, category filter, status filter, grid/cards with image/category badge/active badge/duration/price/edit/delete.
- [ ] **Addon form parity** - name, description, price, duration, category, image upload, applicable services, display order, active.
- [ ] **Public/applicability behavior** - Applicable services saved/displayed correctly; legacy field alias handled.

### 7.7 Packages
- [ ] **Dedicated packages page/parity** - Filters (all/active/inactive/featured), package cards/list, pagination/total pages, create/edit/delete/toggle active/toggle featured.
- [ ] **Package form parity** - name, description, services+quantity builder, package price, validity dates, active/featured, booking limits, image upload, display order.
- [ ] **Computed display** - Original price, discount amount/percentage, savings, total duration, validity badge.

### 7.8 Commissions
- [ ] **Commissions UI** - Staff commission list/summary/pending, filters/date range, mark paid, batch mark paid, breakdown by service.
- [ ] **Integration point** - Surface in service/settings/staff context per legacy/admin expectation; at minimum accessible and wired to backend.

### 7.9 Routing/navigation
- [ ] **Routes** - `/services`, `/services/:id`, `/services/addons`, `/services/packages` (and commission/settings path as decided) with role guards.
- [ ] **Navigation** - Dashboard/sidebar links; breadcrumbs/back links; legacy-equivalent entry points.

## 8. Live verification checklist (after deploy)

- [ ] Auth with `.env.test` owner.
- [ ] Category CRUD, duplicate 409, delete blocked when in use.
- [ ] Service CRUD with image, icon/color, tags/benefits, staff assignment, publish/active/public booking flags.
- [ ] Addon CRUD with image, applicable services, filters.
- [ ] Package CRUD with services/quantities, validity, limits, toggle active/featured.
- [ ] Commission calculate/list/summary/pending/mark-paid/batch.
- [ ] Public host-based catalog endpoints return expected fields.
- [ ] Socket `notification:new` received for service-domain actions.
- [ ] `DEBUG=false` and Resend config confirmed after verification.

## Implementation order (recommended)

1. Backend contract/field parity for services/categories/addons/packages/commissions + image/media flow.
2. Frontend feature layer (types/api/hooks/upload/query keys) aligned to backend.
3. Services list + ServiceForm + ServiceDetail parity.
4. Categories modal/integration.
5. Add-ons page/form parity.
6. Packages page/form/toggles parity.
7. Commissions UI parity.
8. Tests, build, deploy, live smoke.