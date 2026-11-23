# Customer Management Parity Gaps (Legacy `KenikoolSalon` -> `app` rebuild)

Audit baseline: `KenikoolSalon/salon/src` customer-management pages/components/hooks/types + `KenikoolSalon/backend/app/routes|schemas|models|services` customer domain.  
Scope: **admin/customer management only** (list, detail, appointments/history drill-in, balance, preferences, resend portal invite as admin action). Customer portal/auth/public self-service UI is out of scope except where linked from admin management.

Status legend: `[ ]` missing, `[~]` partial, `[x]` done, `[!]` blocked by missing backend/domain.

## 0. Cross-cutting
- [ ] **Legacy contract matrix** - confirm field/status/shape for customer, preference, balance, eligibility, history, resend-invite endpoints.
- [~] **UI parity pass** - major admin-management screens wired in Chakra UI; needs visual/polish pass against legacy behavior.
- [~] **Backend parity pass** - app has basic CRUD/preferences/balance/history/eligibility endpoints; legacy semantics incomplete where Invoice/Payment/AppointmentHistory models missing.
- [~] **RBAC/UI guards** - manage roles owner/admin/manager/staff; delete owner/admin/manager in UI.
- [x] **Toasts/errors/loading/empty states** - added for list/detail/forms/history/balance/preferences.
- [~] **Realtime/refresh** - query invalidation/refetch after mutations; no realtime socket parity.
- [x] **Responsive/mobile parity** - desktop table + mobile compact/expand card view on customers list.
- [~] **Tests/smoke** - `app/salon` build passes; py_compile/live smoke still needed.

## 1. Customers List (`/customers`)
- [x] **Page shell** - title, description with total count, Add Customer button.
- [x] **Search/filter** - search by name/email/phone; status filter all/active/inactive; reset page on filter.
- [x] **Desktop table parity** - Name/Email/Phone/Status/Created/Actions; row click opens detail.
- [x] **Badges parity** - status, outstanding balance, guest badges.
- [x] **Actions parity** - Edit modal; delete inline confirm with warning/cancel/confirm/loading.
- [x] **Mobile view parity** - compact cards, expand/collapse full table toggle.
- [x] **Pagination parity** - rows-per-page 10/25/50/100, showing X-Y of total, first/prev/numbers/next/last, ellipsis.
- [x] **Error state** - load failure banner.
- [x] **Create/Edit modals** - modal form, refresh after success, toasts.
- [x] **No image/avatar** - legacy admin customer management has no image field; none added.

## 2. Customer Create/Edit Form
- [x] **Fields** - first/last/email/phone/address/date_of_birth/communication_preference/status.
- [x] **Legacy validation/messages** - required fields, email format, phone required, save failure toast.
- [~] **Optional fields parity** - preferred_staff_id/preferred_services exist in API/types; not exposed in form UI yet.
- [x] **Modal behavior** - loading/disabled submit, cancel, edit prefill.
- [x] **Post-save behavior** - close modal, refetch, toast.

## 3. Customer Detail (`/customers/:id`)
- [x] **Header/actions** - back, name, customer id; Edit, Delete; resend portal invite when no portal access.
- [x] **Delete confirmation modal** - destructive confirmation, loading, navigate back on success.
- [x] **Tabs parity** - Profile, Balance, Preferences, History tabs.
- [x] **Profile tab** - contact info/member since.
- [x] **Sidebar/status card** - account status, total appointments, last appointment, communication, guest, portal access, outstanding balance.
- [x] **Loading/not-found states** - skeleton and not-found card.

## 4. Balance (admin customer management)
- [~] **Backend endpoint** - `GET/PUT /customers/{id}/balance` exists; approximation without Invoice model.
- [x] **Frontend display** - outstanding balance, eligible/cannot book badge, reason, recalculate action.
- [x] **Unpaid invoices list parity** - renders invoice rows when present; empty state shown.
- [!] **True invoice parity** - requires Invoice/Payment domain in app.

## 5. Booking Eligibility
- [~] **Backend endpoint** - `GET /customers/{id}/booking-eligibility` exists.
- [x] **UI parity** - shown in balance tab.
- [!] **True eligibility parity** - depends on real outstanding balance/invoice logic.

## 6. Preferences
- [~] **Backend endpoints** - `GET/PUT /customers/{id}/preferences` exist in app.
- [x] **Basic UI** - communication methods, time slots, language, notes.
- [x] **Legacy panel parity** - preferred staff/service checkboxes from loaded staff/services, read-only badges, edit/cancel/save.
- [~] **Data sources** - uses `/services` and `/staff` queries directly; may need dedicated staff feature hooks/shape hardening.
- [!] **Full parity** - depends on staff/services data completeness.

## 7. History / Appointments drill-in
- [~] **Backend history endpoint** - `GET /customers/{id}/history` exists; mapped from appointments, no rating/feedback/history model.
- [x] **Detail tab history preview** - recent history with View All Appointments.
- [x] **View All Appointments route** - `/customers/:id/appointments` page added.
- [x] **Appointment detail route** - `/customers/:id/appointments/:appointmentId` page added.
- [~] **History item parity** - service/staff/date/time/notes/rating/feedback/status displayed when available.
- [!] **True history parity** - legacy uses AppointmentHistory/rating/feedback; app lacks those models.

## 8. Resend Portal Invitation (admin action)
- [~] **Backend endpoint** - `POST /customers/{id}/resend-portal-invitation` exists.
- [x] **Detail button** - shown when no portal access.
- [x] **Parity behavior** - loading state, success/error toast messages.

## 9. Customer Deletion
- [~] **Backend delete** - app deletes customer row; legacy cascades related records via `CustomerDeletionService`.
- [ ] **Cascade parity** - define app-equivalent cascade across existing models; report deleted counts where possible.
- [!] **Full cascade parity** - blocked for domains/models not present in app.

## 10. Files touched in this pass
- `app/salon/src/pages/customers/CustomersPage.tsx`
- `app/salon/src/pages/customers/CustomerDetailPage.tsx`
- `app/salon/src/pages/customers/CustomerFormDialog.tsx` (new)
- `app/salon/src/pages/customers/CustomerAppointmentsPage.tsx` (new)
- `app/salon/src/pages/customers/AppointmentDetailPage.tsx` (new)
- `app/salon/src/features/customers/{types,api,hooks}.ts`
- `app/salon/src/App.tsx`
- `app/CUSTOMER_MANAGEMENT_PARITY_GAPS.md`

## 11. Next implementation order
1. Backend response/behavior hardening where possible (deletion cascade, history detail endpoint/shape, balance semantics).
2. Preferred staff/service pickers data hardening and form parity.
3. Visual QA against legacy screenshots/flows; mobile polish.
4. Py_compile/build/smoke, commit, push.
