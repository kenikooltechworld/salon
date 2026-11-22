import { apiClient } from "@/lib/api";
import type { DashboardMetrics, DashboardPendingActions, MeResponse, SettingsResponse, Tenant, TenantSettingsUpdate, User } from "./types";

export const authApi = {
  me: () => apiClient.get<MeResponse>("/auth/me"),
  updateMe: (payload: Partial<Pick<User, "first_name" | "last_name" | "phone">>) => apiClient.put<MeResponse>("/auth/me", payload),
  getSettings: () => apiClient.get<SettingsResponse>("/settings"),
  updateSettings: (payload: TenantSettingsUpdate) => apiClient.put<SettingsResponse>("/settings", payload),
  dashboardMetrics: () => apiClient.get<DashboardMetrics>("/owner/dashboard/metrics"),
  dashboardPendingActions: () => apiClient.get<DashboardPendingActions>("/owner/dashboard/pending-actions"),
  logout: () => apiClient.post("/auth/logout"),
};

export type { Tenant, User };
