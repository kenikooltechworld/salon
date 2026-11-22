import type { TenantSettingsData } from "./types";

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

export function normalizeTenantSettings(data?: Partial<TenantSettingsData> | null): TenantSettingsData {
  return {
    ...DEFAULT_TENANT_SETTINGS,
    ...(data || {}),
    business_hours: { ...DEFAULT_TENANT_SETTINGS.business_hours, ...(data?.business_hours || {}) },
  };
}

export function getErrorMessage(error: unknown, fallback: string) {
  const e = error as { response?: { data?: { detail?: string } }; message?: string };
  return e?.response?.data?.detail || e?.message || fallback;
}
