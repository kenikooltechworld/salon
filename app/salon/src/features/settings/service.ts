import type { CommissionSettingsData, FinancialSettingsData, OperationalSettingsData, PaystackSubaccountResponse, TenantSettingsData } from "./types";

export const SETTINGS_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export const DEFAULT_TENANT_SETTINGS: TenantSettingsData = {
  salon_name: "My Salon",
  email: "",
  phone: "",
  address: "",
  tax_rate: 0,
  currency: "NGN",
  timezone: "Africa/Lagos",
  language: "en",
  business_hours: {
    monday: { open_time: "09:00", close_time: "18:00", is_closed: false },
    tuesday: { open_time: "09:00", close_time: "18:00", is_closed: false },
    wednesday: { open_time: "09:00", close_time: "18:00", is_closed: false },
    thursday: { open_time: "09:00", close_time: "18:00", is_closed: false },
    friday: { open_time: "09:00", close_time: "18:00", is_closed: false },
    saturday: { open_time: "10:00", close_time: "16:00", is_closed: false },
    sunday: { open_time: "00:00", close_time: "00:00", is_closed: true },
  },
  notification_email: true,
  notification_sms: false,
  notification_push: false,
  logo_url: null,
  primary_color: "#000000",
  secondary_color: "#FFFFFF",
  appointment_reminder_hours: 24,
  allow_online_booking: true,
  require_customer_approval: false,
  auto_confirm_bookings: true,
};

export const DEFAULT_COMMISSION_SETTINGS: CommissionSettingsData = {
  commissionRules: [],
  balanceEnforcement: { enabled: true, minimumBalance: 0 },
  paymentSettings: { autoSettlement: false, settlementDay: 1 },
};

export const DEFAULT_FINANCIAL_SETTINGS: FinancialSettingsData = {
  balance_enforcement_enabled: true,
  minimum_balance_threshold: 0,
  refund_policy_enabled: true,
  refund_window_days: 30,
  commission_tracking_enabled: true,
  staff_commission_percentage: 10,
  service_commission_percentage: 5,
  invoice_numbering_prefix: "INV",
  invoice_numbering_start: 1000,
};

export const DEFAULT_OPERATIONAL_SETTINGS: OperationalSettingsData = {
  inventory_tracking_enabled: true,
  low_stock_threshold: 10,
  waiting_room_enabled: true,
  waiting_room_max_capacity: 50,
  resource_management_enabled: true,
  notification_preferences_enabled: true,
  sms_provider: "termii",
  email_provider: "smtp",
  backup_enabled: true,
  backup_frequency: "daily",
  cache_optimization_enabled: true,
  cache_ttl_minutes: 60,
};

export function normalizeTenantSettings(data?: Partial<TenantSettingsData> | null): TenantSettingsData {
  return {
    ...DEFAULT_TENANT_SETTINGS,
    ...(data || {}),
    business_hours: { ...DEFAULT_TENANT_SETTINGS.business_hours, ...(data?.business_hours || {}) },
  };
}

export function normalizeCommissionSettings(data?: Partial<CommissionSettingsData> | null): CommissionSettingsData {
  const rules = Array.isArray(data?.commissionRules) ? data!.commissionRules : [];
  return {
    commissionRules: rules.map((r, i) => ({
      id: String(r.id || `rule-${i + 1}`),
      name: String(r.name || "Rule"),
      percentage: Number(r.percentage ?? 0),
      minAmount: Number(r.minAmount ?? 0),
      maxAmount: Number(r.maxAmount ?? 0),
      applicableTo: r.applicableTo === "service" ? "service" : "staff",
    })),
    balanceEnforcement: {
      enabled: data?.balanceEnforcement?.enabled ?? true,
      minimumBalance: Number(data?.balanceEnforcement?.minimumBalance ?? 0),
    },
    paymentSettings: {
      autoSettlement: data?.paymentSettings?.autoSettlement ?? false,
      settlementDay: Math.min(31, Math.max(1, Number(data?.paymentSettings?.settlementDay ?? 1))),
    },
  };
}

export function normalizeFinancialSettings(data?: Partial<FinancialSettingsData> | null): FinancialSettingsData {
  return {
    balance_enforcement_enabled: data?.balance_enforcement_enabled ?? DEFAULT_FINANCIAL_SETTINGS.balance_enforcement_enabled,
    minimum_balance_threshold: Math.max(0, Number(data?.minimum_balance_threshold ?? 0)),
    refund_policy_enabled: data?.refund_policy_enabled ?? DEFAULT_FINANCIAL_SETTINGS.refund_policy_enabled,
    refund_window_days: Math.min(365, Math.max(1, Number(data?.refund_window_days ?? 30))),
    commission_tracking_enabled: data?.commission_tracking_enabled ?? DEFAULT_FINANCIAL_SETTINGS.commission_tracking_enabled,
    staff_commission_percentage: Math.min(100, Math.max(0, Number(data?.staff_commission_percentage ?? 10))),
    service_commission_percentage: Math.min(100, Math.max(0, Number(data?.service_commission_percentage ?? 5))),
    invoice_numbering_prefix: String(data?.invoice_numbering_prefix || "INV").trim() || "INV",
    invoice_numbering_start: Math.max(1, Math.floor(Number(data?.invoice_numbering_start ?? 1000))),
  };
}

export function normalizeOperationalSettings(data?: Partial<OperationalSettingsData> | null): OperationalSettingsData {
  const sms = ["termii", "twilio", "none"] as const;
  const email = ["smtp", "sendgrid", "none"] as const;
  const freq = ["daily", "weekly", "monthly"] as const;
  return {
    inventory_tracking_enabled: data?.inventory_tracking_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.inventory_tracking_enabled,
    low_stock_threshold: Math.max(0, Math.floor(Number(data?.low_stock_threshold ?? 10))),
    waiting_room_enabled: data?.waiting_room_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.waiting_room_enabled,
    waiting_room_max_capacity: Math.max(1, Math.floor(Number(data?.waiting_room_max_capacity ?? 50))),
    resource_management_enabled: data?.resource_management_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.resource_management_enabled,
    notification_preferences_enabled: data?.notification_preferences_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.notification_preferences_enabled,
    sms_provider: sms.includes(data?.sms_provider as any) ? data!.sms_provider! : "termii",
    email_provider: email.includes(data?.email_provider as any) ? data!.email_provider! : "smtp",
    backup_enabled: data?.backup_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.backup_enabled,
    backup_frequency: freq.includes(data?.backup_frequency as any) ? data!.backup_frequency! : "daily",
    cache_optimization_enabled: data?.cache_optimization_enabled ?? DEFAULT_OPERATIONAL_SETTINGS.cache_optimization_enabled,
    cache_ttl_minutes: Math.max(1, Math.floor(Number(data?.cache_ttl_minutes ?? 60))),
  };
}

export function normalizePaystackSubaccount(data?: Partial<PaystackSubaccountResponse> | null): {
  subaccount_code: string | null;
  percentage_charge: number | null;
} {
  return {
    subaccount_code: data?.data?.subaccount_code ?? data?.subaccount_code ?? null,
    percentage_charge: data?.data?.percentage_charge ?? data?.percentage_charge ?? null,
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  const e = error as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail || e?.message || fallback;
}
