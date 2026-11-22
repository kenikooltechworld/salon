export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
}

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  initialized: boolean;
}