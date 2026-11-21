import { create } from "zustand";
import { api } from "@/lib/api";

interface User { id: string; email: string; first_name: string; last_name: string }
interface Tenant { id: string; name: string; subdomain: string }

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  load: () => Promise<void>;
  setAuth: (user: User | null, tenant: Tenant | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  load: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, tenant: data.tenant, isAuthenticated: true });
    } catch {
      set({ user: null, tenant: null, isAuthenticated: false });
    }
  },
  setAuth: (user, tenant) => set({ user, tenant, isAuthenticated: !!user }),
  logout: async () => {
    try { await api.post("/auth/logout"); } catch {}
    set({ user: null, tenant: null, isAuthenticated: false });
  },
}));
