# Paystack Integration Reference — Salon Backend (`app/server`)

Comprehensive documentation for the Paystack payment gateway integration, gathered from
Paystack's public OpenAPI specification (v1.0.0, base URL `https://api.paystack.co`) and
industry research (Nigeria salon/booking platforms).

---

## 1. Overview

| Item | Value |
|---|---|
| Base URL | `https://api.paystack.co` |
| Auth scheme | `Authorization: Bearer <secret_key>` |
| Secret key format | `sk_live_...` (live) or `sk_test_...` (test) |
| Webhook signature | HMAC-SHA512 hex digest of raw body, keyed with secret key, header `X-Paystack-Signature` |
| Payment events | `charge.success`, `charge.failed`, `charge.cancelled`, `charge.abandoned`, `refund.success`, … |
| Response envelope | `{ status: bool, message: string, data: object }` |
| Default currency | `NGN` |
| Split model | Subaccounts + `percentage_charge` / `bearer` parameter |

---

## 2. Industry: Who Pays Transaction Fees? (Nigeria)

Paystack fees (local NGN transactions): **1.5% + ₦100**, capped at **₦2,000** per transaction.
₦100 waived for transactions under ₦2,500.

| Source | Policy |
|---|---|
| **Paystack Dashboard** | Nigerian merchants toggle "Pass fees to customers" in `Settings → Preferences`. When off (default): merchant absorbs. When on: Paystack auto-calculates fee and adds to customer's total at checkout. |
| **Bookdara** (Nigerian salon platform) | "You choose in Settings: your business, from your share, or your customer, as a booking fee added at checkout." |
| **Glown** (Nigerian salon platform) | "Add the fee to your client's bill, or cover it yourself." |
| **Paystack split `bearer` parameter** | `account` = platform pays the fee (deducted from platform's share). <br>`subaccount` = vendor/subaccount pays the fee (deducted from vendor's share). <br>`all` = customer pays the fee as a surcharge on top of product price. |

**Bottom line**: There is **no industry mandate** — most Nigerian platforms let the business owner choose who pays. You can offer it as a per-tenant setting.

---

## 3. Industry: Pay-now / Pay-later Options (Nigeria)

| Platform | Pay-now / Pay-later options |
|---|---|
| **Bookdara** | Deposit due now OR Pay at studio. Full price or 30%/50%/fixed naira deposit. |
| **JustBookMe** | Full payment, deposit, or pay later per service. |
| **Qorelly** | Choose: no payment, deposit %, or full price per service. |
| **Musskart** | Deposit or full payment per service. Free consultations stay pay-later. |
| **Salonipy** | Part payment or none; balance stays on client record until cleared. |
| **DMly** | Deposit holds chair; balance paid on day of service. |

**Bottom line**: 7-step flow (Customer → Service → Staff → Add-ons → Packages → Date&Time → Confirm) is standard; deposit/upfront payment is the most effective no-show reduction. Full "pay later" after booking is also common.

---

## 4. Your Subscription Payment Model

| Tenant Type | Platform Fee | Who Pays Paystack Tx Fee | Money Flow | Bearer Setting |
|---|---|---|---|---|
| **Subscriber** (monthly/yearly paid tenant) | ₦0 (you take nothing) | You decide per-tenant (industry default: tenant or customer) | Customer → Paystack → **tenant gets 100%** of service amount (minus Paystack fee, determined by `bearer`) | `percentage_charge: 0` on tenant subaccount, or no subaccount needed (pass-through). |
| **Free user** (no subscription) | Your % cut (e.g., 10%) | You decide per-tenant | Customer pays total (service + your fee) → Paystack splits: your % → you, remainder → tenant | `percentage_charge: <your_fee>%` on tenant's subaccount → at settlement, Paystack auto-routes: your % to you, 90% to tenant. |

**Key mechanism**: Paystack subaccounts + `percentage_charge` + `bearer` parameter.

- **Per-tenant**: each tenant registers their bank account once via `POST /subaccount`. Paystack returns a subaccount code (`ACCT_xxxxx`). You store it in the tenant model and set `percentage_charge` (0 for subscribers, your fee % for free users).
- **At booking**: when `payment_option == "now"`, call `POST /transaction/initialize` with `subaccount: <tenant_code>`, `bearer: "subaccount"` (or `"account"` if you want platform to pay fee), and the per-tenant `percentage_charge`.
- **At settlement**: Paystack automatically splits the settled amount according to the `percentage_charge` on the subaccount. No manual transfers, no payout scheduling needed on your side.
- **Webhook `charge.success`**: verify signature → update payment status → the split happens automatically at next Paystack settlement (T+1/T+2).

**Free plan detection**: check customer's plan status (from your DB) before initializing transaction. Free plan → skip Paystack init, handle manually or mark payment as pending.

---

## 5. Paystack Split Mechanics (from OpenAPI spec)

| Parameter | Value | Effect |
|---|---|---|
| `subaccount` | string (e.g. `ACCT_xxxxx`) | Subaccount that owns the payment |
| `bearer` | `account` / `subaccount` / `all` | Who pays the Paystack processing fee |
| `percentage_charge` | float | Set on the **subaccount** (via `POST /subaccount`). At transaction initialize time, the split uses this percentage to determine how much of the settled amount goes to each party. |

**Flow:**

1. **Tenant registers subaccount** (once):
   ```bash
   POST /subaccount
   {
     "business_name": "Salon Name",
     "settlement_bank": "044",  # example GTBank
     "account_number": "1234567890",
     "percentage_charge": 10.0  # your platform fee % (0 for subscribers)
   }
   ```
   → Paystack returns `subaccount_code: "ACCT_xxxxx"`

2. **Initialize transaction** (per booking):
   ```bash
   POST /transaction/initialize
   {
     "email": "customer@example.com",
     "amount": 25000,  # kobo (₦250.00)
     "subaccount": "ACCT_xxxxx",
     "bearer": "subaccount",  # or "account"
     "metadata": { "payment_type": "booking", "tenant_id": "...", "user_type": "free|subscriber" }
   }
   ```

3. **Settlement**: Paystack auto-splits at next payout (T+1/T+2):
   - If `percentage_charge: 10` on subaccount, and `bearer: "subaccount"`: 10% goes to subaccount (tenant), remainder goes to your main account.
   - If `percentage_charge: 0` and `bearer: "subaccount"`: 100% goes to tenant (subscriber model).

4. **Webhook `charge.success`**:
   - Verify `X-Paystack-Signature` (HMAC-SHA512).
   - Parse `event` and `data.reference`.
   - Look up `Payment` by reference → update `status`, mark invoice/appointment paid.
   - The split already happened at Paystack settlement; your backend just records the outcome.

---

## 6. Reference Prefix Strategy (from paystack-router)

| Prefix | Example reference | Webhook target |
|---|---|---|
| `salon_` | `salon_<booking_id>_<hex>` | `https://api.kenikool.com/api/v1/webhooks/paystack` |
| `pp_` | `pp_wallet_<user_id>_<hex>` | `https://pagepay-fff6.onrender.com/api/v1/payouts/webhook` |

All projects use **one Paystack webhook URL** → the Cloudflare Worker router (`KenikoolSalon/paystack-router`) inspects the reference prefix and forwards the raw payload + signature to the correct project backend.

---

## 7. Implementation Status — Rebuild (`app/server`)

### 7.1 Already present
- `Payment` ORM model with fields: `customer_id`, `invoice_id`, `amount` (Numeric 10,2), `status`, `reference`, `gateway`, `payment_method`, `idempotency_key`, `retry_count`, `max_retries`, `last_retry_at`, `next_retry_at`, `metadata_`.
- `PaymentCreate` / `PaymentUpdate` / `PaymentRead` / `PaymentListResponse` schemas (`PaymentStatus = pending|success|failed|cancelled`, `PaymentMethod = paystack|cash|card|mobile_money|check|bank_transfer`).
- `Appointment.payment_option` (`now|later`) and `Appointment.payment_status` (`pending|paid|failed|refunded|completed`).
- `PublicBookingCreate` / `PublicBookingRead` — `addon_ids`, `package_id`, `total_price`, `service_name`, `service_price`, `staff_name`, `addon_names`, `addon_prices`, `package_name`, `package_price`; notes JSON marker `[booking_meta:...]` in `PublicBookingCreate.notes` / `PublicBookingRead.notes`.
- `PublicBookingService.create_booking` — computes `total_price`, stores booking metadata, sets `payment_option` and `payment_status`.

### 7.2 In progress / to implement
1. **Tenant subaccount registration**: one-time setup per tenant via `POST /subaccount`. Store `subaccount_code` and `percentage_charge` in tenant model. (You may need to add `subaccount_code`, `percentage_charge` columns to your tenant model, or use metadata.)
2. **PaystackService** (`app.server.app.services.paystack_service.PaystackService`): async client with methods:
   - `initialize_transaction(email, amount, reference, subaccount, bearer, metadata)` → returns `authorization_url`
   - `verify_transaction(reference)` → returns transaction data
   - `verify_webhook_signature(body, signature)` → bool (HMAC-SHA512)
   - `extract_webhook_data(webhook_body)` → dict with `event`, `reference`, `status`, `amount`, `customer_email`, `transaction_id`, `paid_at`
   - `create_subscription`, `create_customer`, etc. (optional)
3. **Webhook route** (`app.server.app.api.v1.routes.webhooks`): `POST /webhooks/paystack`
   - Verify `X-Paystack-Signature` → `401` on failure.
   - Parse event → `charge.success` / `charge.failed`.
   - Extract `metadata.user_type` → subscriber vs free user.
   - Look up `Payment` by reference (no tenant context — webhook from Paystack).
   - Derive tenant → update payment status → Paystack auto-splits at next settlement.
4. Register webhooks router under `settings.api_prefix` in `app.api.v1.router`.
5. Public booking "Pay now" flow: when `payment_option == "now"` → check user_type → if subscriber → init tx with `percentage_charge: 0`, `bearer: "subaccount"`; if free user → init tx with tenant's `percentage_charge`, `bearer: "subaccount"`, return `authorization_url` → redirect customer.

**Note**: The actual `percentage_charge` value on the subaccount is set once when the tenant registers their bank account. It does not change per-booking unless you want to adjust the platform fee mid-stream.

---

## 8. Source References

- Paystack OpenAPI: `https://api.paystack.co` (`openapi: 3.0.1`)
- Paystack webhook router: `KenikoolSalon/paystack-router/src/index.ts`, `KenikoolSalon/paystack-router/README.md`
- Legacy Paystack service: `KenikoolSalon/backend/app/services/paystack_service.py`
- Legacy webhook handler: `KenikoolSalon/backend/app/routes/webhooks.py`
- Industry platforms: Bookdara, Glown, JustBookMe, Qorelly, Salonipy, Musskart (websearch findings)
- Paystack fees (Nigeria): 1.5% + ₦100, capped at ₦2,000; ₦100 waived under ₦2,500
- Split `bearer` options: `account`, `subaccount`, `all` (from Paystack docs/mctaba guide)
- Paystack dashboard: "Pass fees to customers" toggle (`Settings → Preferences`)