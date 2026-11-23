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
  communication_preference: "email" | "sms" | "phone" | "none";
  status: "active" | "inactive";
  notification_preferences?: Record<string, unknown> | null;
}
