import { create } from "zustand";
import type { AuthState, Tenant, User } from "./types";

interface AuthStore extends AuthState {
  setSession: (user: User | null, tenant: Tenant | null) => void;
  clearSession: () => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  user: null,
  tenant: null,
  isAuthenticated: false,
  initialized: false,
};

export const useAuthStore = create<AuthStore>((set) => ({
  ...initialState,
  setSession: (user, tenant) => set({ user, tenant, isAuthenticated: !!user, initialized: true }),
  clearSession: () => set({ user: null, tenant: null, isAuthenticated: false, initialized: true }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set(initialState),
}));