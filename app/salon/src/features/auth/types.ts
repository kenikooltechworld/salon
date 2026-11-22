export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  email?: string | null;
  description?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  subscription_tier: string;
  status: string;
  address?: string | null;
  region?: string;
  is_published?: boolean;
  created_at?: string;
  salon_name?: string;
  subdomain_url?: string | null;
  phone?: string | null;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: string;
  status: string;
  email_verified?: boolean;
  mfa_enabled?: boolean;
  last_login?: string | null;
  created_at?: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  initialized: boolean;
}

export interface MeResponse {
  user: User;
  tenant: Tenant;
}

export interface SettingsResponse {
  data: Tenant;
}

export interface DashboardMetrics {
  data: {
    appointments: { thisMonth: number };
    revenue: { current: number };
    customers?: { total: number };
  };
}

export interface DashboardPendingActions {
  data: { total: number };
}

export interface TenantSettingsUpdate {
  salon_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}
