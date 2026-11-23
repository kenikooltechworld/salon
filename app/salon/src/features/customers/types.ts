export interface Customer {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string | null;
  date_of_birth?: string | null;
  preferred_staff_id?: string | null;
  preferred_services?: string[];
  communication_preference: "email" | "sms" | "phone" | "none";
  status: "active" | "inactive";
  outstanding_balance: string | number;
  is_guest: boolean;
  email_verified?: boolean;
  phone_verified?: boolean;
  has_portal_access?: boolean;
  notification_preferences?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
  page: number;
  page_size: number;
}

export interface CustomerPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address?: string | null;
  date_of_birth?: string | null;
  preferred_staff_id?: string | null;
  preferred_services?: string[];
  communication_preference: "email" | "sms" | "phone" | "none";
  status: "active" | "inactive";
  notification_preferences?: Record<string, unknown> | null;
}

export interface CustomerPreference {
  id: string;
  tenant_id: string;
  customer_id: string;
  preferred_staff_ids: string[];
  preferred_service_ids: string[];
  communication_methods: string[];
  preferred_time_slots: string[];
  language: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerPreferenceUpdate {
  preferred_staff_ids?: string[];
  preferred_service_ids?: string[];
  communication_methods?: string[];
  preferred_time_slots?: string[];
  language?: string;
  notes?: string | null;
}

export interface CustomerBalance {
  customer_id: string;
  customer_name: string;
  outstanding_balance: number;
  unpaid_invoice_count: number;
  unpaid_invoices: Array<{
    invoice_id: string;
    amount: number;
    status: string;
    due_date?: string | null;
    created_at: string;
  }>;
}

export interface BookingEligibility {
  customer_id: string;
  customer_name: string;
  outstanding_balance: number;
  is_eligible_to_book: boolean;
  reason: string;
}

export interface CustomerHistoryItem {
  id: string;
  appointment_id: string;
  service_id: string;
  staff_id: string;
  service_name: string;
  staff_name: string;
  appointment_date: string | null;
  appointment_time: string;
  notes: string;
  rating: number;
  feedback: string;
  status?: string;
}

export interface CustomerHistoryResponse {
  history: CustomerHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}
