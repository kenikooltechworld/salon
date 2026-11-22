import { authApi } from "./api";
import { useAuthStore } from "./store";

export const authService = {
  async loadSession() {
    try {
      const { data } = await authApi.me();
      useAuthStore.getState().setSession(data.user, data.tenant);
    } catch {
      useAuthStore.getState().clearSession();
    }
  },
  async logout() {
    try {
      await authApi.logout();
    } finally {
      useAuthStore.getState().clearSession();
    }
  },
};