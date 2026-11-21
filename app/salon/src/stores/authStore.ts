import { create } from "zustand";
import { setAuthToken } from "@/lib/api";

interface AuthState {
  token: string | null;
  user: { id: string; email: string; first_name: string; last_name: string } | null;
  tenant: { id: string; name: string; subdomain: string } | null;
  setAuth: (token: string, user: AuthState["user"], tenant: AuthState["tenant"]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("access_token"),
  user: null,
  tenant: null,
  setAuth: (token, user, tenant) => {
    localStorage.setItem("access_token", token);
    setAuthToken(token);
    set({ token, user, tenant });
  },
  logout: () => {
    localStorage.removeItem("access_token");
    setAuthToken(null);
    set({ token: null, user: null, tenant: null });
  },
}));
