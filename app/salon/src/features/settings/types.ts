export interface BusinessHours {
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface TenantSettingsData {
  tenant_id?: string;
  tenant_name?: string;
  subdomain?: string;
  subdomain_url?: string;
  region?: string;
  subscription_tier?: string;
  status?: string;
  is_published?: boolean;
  plan_name?: string;
  plan_tier?: number;
  billing_cycle?: string;
  salon_name: string;
  email: string;
  phone: string;
  address: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  language: string;
  business_hours: Record<string, BusinessHours>;
  notification_email: boolean;
  notification_sms: boolean;
  notification_push: boolean;
  logo_url?: string | null;
  primary_color: string;
  secondary_color: string;
  appointment_reminder_hours: number;
  allow_online_booking: boolean;
  require_customer_approval: boolean;
  auto_confirm_bookings: boolean;
}

export interface MediaUploadResponse {
  url: string;
  message: string;
}

export interface SettingsResponse {
  data: TenantSettingsData;
}

export interface CommissionRule {
  id: string;
  name: string;
  percentage: number;
  minAmount: number;
  maxAmount: number;
  applicableTo: "staff" | "service";
}

export interface CommissionSettingsData {
  commissionRules: CommissionRule[];
  balanceEnforcement: {
    enabled: boolean;
    minimumBalance: number;
  };
  paymentSettings: {
    autoSettlement: boolean;
    settlementDay: number;
  };
}

export interface CommissionSettingsResponse {
  data: CommissionSettingsData;
}

export interface FinancialSettingsData {
  balance_enforcement_enabled: boolean;
  minimum_balance_threshold: number;
  refund_policy_enabled: boolean;
  refund_window_days: number;
  commission_tracking_enabled: boolean;
  staff_commission_percentage: number;
  service_commission_percentage: number;
  invoice_numbering_prefix: string;
  invoice_numbering_start: number;
}

export interface FinancialSettingsResponse {
  data: FinancialSettingsData;
}
