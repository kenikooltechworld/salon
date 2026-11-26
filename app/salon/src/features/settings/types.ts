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
  subscription_status?: string;
  trial_end?: string | null;
  next_billing_date?: string | null;
  current_period_end?: string | null;
  is_trial?: boolean;
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

export interface OperationalSettingsData {
  inventory_tracking_enabled: boolean;
  low_stock_threshold: number;
  waiting_room_enabled: boolean;
  waiting_room_max_capacity: number;
  resource_management_enabled: boolean;
  notification_preferences_enabled: boolean;
  sms_provider: "termii" | "twilio" | "none";
  email_provider: "smtp" | "sendgrid" | "none";
  backup_enabled: boolean;
  backup_frequency: "daily" | "weekly" | "monthly";
  cache_optimization_enabled: boolean;
  cache_ttl_minutes: number;
}

export interface OperationalSettingsResponse {
  data: OperationalSettingsData;
}

export interface PaystackSubaccountResponse {
  data?: {
    subaccount_code?: string | null;
    percentage_charge?: number | null;
    tenant_id?: string | null;
  } | null;
  subaccount_code?: string | null;
  percentage_charge?: number | null;
  message?: string;
}

export interface PaystackSubaccountRegisterPayload {
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
}
