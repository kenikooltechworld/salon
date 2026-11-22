import { apiClient } from "@/lib/api";

export interface BusinessHours { open_time: string; close_time: string; is_closed: boolean }
export interface TenantSettingsData {
  tenant_id?: string; tenant_name?: string; subdomain?: string; subdomain_url?: string; region?: string; subscription_tier?: string; status?: string;
  salon_name: string; email: string; phone: string; address: string; tax_rate: number; currency: string; timezone: string; language: string;
  business_hours: Record<string, BusinessHours>; notification_email: boolean; notification_sms: boolean; notification_push: boolean;
  logo_url?: string | null; primary_color: string; secondary_color: string; appointment_reminder_hours: number; allow_online_booking: boolean; require_customer_approval: boolean; auto_confirm_bookings: boolean;
}

export const settingsApi = {
  get: () => apiClient.get<{ data: TenantSettingsData }>("/settings"),
  update: (payload: TenantSettingsData) => apiClient.put<{ data: TenantSettingsData }>("/settings", payload),
  reset: () => apiClient.post<{ data: TenantSettingsData }>("/settings/reset"),
  uploadMedia: (payload: { base64_data: string; media_type?: string; folder?: string }) => apiClient.post<{ url: string; message: string }>("/media/upload", payload),
};
