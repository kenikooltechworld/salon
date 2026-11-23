# Customer Management Parity Gaps (Legacy `KenikoolSalon` -> `app` rebuild)

Audit baseline: `KenikoolSalon/salon/src` customer-management pages/components/hooks/types + `KenikoolSalon/backend/app/routes|schemas|models|services` customer domain.  
Scope: **admin/customer management only** (list, detail, appointments/history drill-in, balance, preferences, resend portal invite as admin action). Customer portal/auth/public self-service UI is out of scope except where linked from admin management.

Status legend: `[ ]` missing, `[~]` partial, `[x]` done, `[!]` blocked by missing backend/domain.

## 0. Cross-cutting
- [x] **Legacy contract matrix** - admin customer management routes/components audited; app has matching admin endpoints/UI surfaces.
- [x] **UI parity pass** - list/detail/balance/preferences/history/appointments drill-in/resend invite/create-edit/delete implemented in app Chakra UI.
- [x] **Backend parity pass** - CRUD, preferences, invoice-backed balance/eligibility, AppointmentHistory-backed history/item, resend invite, and app-model customer deletion cascade implemented; legacy-only missing domains remain N/A until modeled.
- [x] **RBAC/UI guards** - manage roles owner/admin/manager/staff; delete owner/admin/manager in UI; backend role guards on mutating routes.
- [x] **Toasts/errors/loading/empty states** - list/detail/forms/history/balance/preferences covered.
- [~] **Realtime/refresh** - query invalidation/refetch after mutations; no realtime socket parity.
- [x] **Responsive/mobile parity** - desktop table + mobile compact/expand card view on customers list.
- [x] **Tests/smoke** - `cd app/salon && npm run build` passes; `cd app/server && python -m py_compile ...` passes for customer/invoice/payment/history backend files; `alembic heads` shows `c1d2e3f4a5b6`.

## 1. Customers List (`/customers`)
- [x] **Page shell** - title, total count, Add Customer.
- [x] **Search/filter** - search name/email/phone; status filter all/active/inactive; resets page.
- [x] **Desktop table parity** - Name/Email/Phone/Status/Created/Actions; row click opens detail.
- [x] **Badges parity** - active/inactive, outstanding balance, guest.
- [x] **Actions parity** - Edit modal; inline delete confirm with warning/cancel/confirm/loading.
- [x] **Mobile view parity** - compact cards, expand/collapse full table toggle.
- [x] **Pagination parity** - rows-per-page 10/25/50/100, showing X-Y of total, first/prev/numbers/next/last, ellipsis.
- [x] **Error state** - load failure banner.
- [x] **Create/Edit modals** - modal form, refresh after success, toasts.
- [x] **No image/avatar** - legacy admin customer management has no image field; none added.

## 2. Customer Create/Edit Form
- [x] **Fields** - first/last/email/phone/address/date_of_birth/preferred_staff/preferred_services/communication_preference/status.
- [x] **Legacy validation/messages** - required fields, email format, phone required, save failure toast.
- [x] **Optional fields parity** - preferred_staff_id and preferred_services exposed in form UI and payload.
- [x] **Modal behavior** - loading/disabled submit, cancel, edit prefill.
- [x] **Post-save behavior** - close modal, refetch, toast.

## 3. Customer Detail (`/customers/:id`)
- [x] **Header/actions** - back, name, customer id; Edit, Delete; resend portal invite when no portal access.
- [x] **Delete confirmation modal** - destructive confirmation, loading, navigate back on success.
- [x] **Tabs parity** - Profile, Balance, Preferences, History.
- [x] **Profile tab** - contact info, member since, preferred staff, preferred services.
- [x] **Sidebar/status card** - account status, total appointments, last appointment, communication, guest, portal access, outstanding balance.
- [x] **Loading/not-found states** - skeleton and not-found card.

## 4. Balance (admin customer management)
- [x] **Backend endpoint** - `GET/PUT /customers/{id}/balance` uses `Invoice` records (`issued`/`overdue`) and syncs `Customer.outstanding_balance`.
- [x] **Frontend display** - outstanding balance, eligible/cannot book badge, reason, recalculate action.
- [x] **Unpaid invoices list parity** - renders invoice rows when present; empty state shown.
- [~] **True invoice parity** - `Invoice`/`Payment` models, schemas, services, controllers, routes, and migration added in app; live parity still depends on deployed API/data and broader invoice/payment workflows.

## 5. Booking Eligibility
- [x] **Backend endpoint** - `GET /customers/{id}/booking-eligibility` exists and uses invoice-backed balance.
- [x] **UI parity** - shown in balance tab.
- [~] **True eligibility parity** - uses real invoice balance in app; deployment/data parity still external.

## 6. Preferences
- [x] **Backend endpoints** - `GET/PUT /customers/{id}/preferences` exist in app.
- [x] **Basic UI** - communication methods, time slots, language, notes.
- [x] **Legacy panel parity** - preferred staff/service checkboxes, read-only badges, edit/cancel/save.
- [~] **Data sources** - uses `/services` and `/staff` queries; staff labels fallback to user_id/id until richer staff-user shape available.
- [~] **Full parity** - depends on richer staff identity and any missing legacy preference semantics.

## 7. History / Appointments drill-in
- [x] **Backend history endpoint** - `GET /customers/{id}/history` uses `AppointmentHistory` with appointment fallback for pre-history records; returns rating/feedback/status/amount_paid.
- [x] **History item endpoint** - `GET /customers/{id}/history/{historyId}` added (supports history entry or appointment fallback id).
- [x] **Detail tab history preview** - recent history with View All Appointments.
- [x] **View All Appointments route** - `/customers/:id/appointments` page added.
- [x] **Appointment detail route** - `/customers/:id/appointments/:appointmentId` page added; uses history-item endpoint with list fallback.
- [~] **History item parity** - service/staff/date/time/notes/rating/feedback/status displayed when available; creating/updating ratings/feedback UI/workflow not yet exposed.

## 8. Resend Portal Invitation (admin action)
- [x] **Backend endpoint** - `POST /customers/{id}/resend-portal-invitation` exists.
- [x] **Detail button** - shown when no portal access.
- [x] **Parity behavior** - loading state, success/error toast messages.

## 9. Customer Deletion
- [x] **Backend delete** - deletes customer and cascades existing app models: appointment_history, customer_preferences, invoices, payments, appointments, customer notifications; returns deleted counts.
- [~] **Cascade parity** - covers models present in app; cannot delete legacy-only domains not modeled in app rebuild.
- [~] **Full cascade parity** - depends on future app domain parity (memberships, carts, receipts, etc., if/when added).

## 10. Files touched
- `app/salon/src/pages/customers/CustomersPage.tsx`
- `app/salon/src/pages/customers/CustomerDetailPage.tsx`
- `app/salon/src/pages/customers/CustomerFormDialog.tsx`
- `app/salon/src/pages/customers/CustomerAppointmentsPage.tsx`
- `app/salon/src/pages/customers/AppointmentDetailPage.tsx`
- `app/salon/src/features/customers/{types,api,hooks}.ts`
- `app/salon/src/App.tsx`
- `app/server/app/api/v1/routes/customers.py`
- `app/server/app/controllers/customer_controller.py`
- `app/server/app/services/customer_service.py`
- `app/server/app/schemas/customer.py`
- `app/server/app/models/customer.py`
- `app/server/app/models/customer_preference.py`
- `app/server/app/api/v1/routes/customer_preferences.py`
- `app/CUSTOMER_MANAGEMENT_PARITY_GAPS.md`

## 11. Remaining
1. Broader invoice/payment workflows (issue/send/payment recording/refunds) if legacy admin parity requires them beyond customer balance/history surfaces.
2. Rating/feedback capture/edit UI and endpoints if legacy customer management exposes them.
3. Rich staff display names in pickers when staff-user join/API available.
4. Legacy-only deletion domains remain N/A until corresponding app models exist.
5. Live deployment verification against `https://api.kenikoolsalon.com/api/v1` with `.env.test` creds after deploy/migration.
