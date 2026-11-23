import { apiClient, TIMEOUTS } from "@/lib/api";
import type { CommissionSettingsData, CommissionSettingsResponse, FinancialSettingsData, FinancialSettingsResponse, MediaUploadResponse, OperationalSettingsData, OperationalSettingsResponse, SettingsResponse, TenantSettingsData } from "./types";

export const settingsApi = {
  get: () => apiClient.get<SettingsResponse>("/settings"),
  update: (payload: TenantSettingsData) => apiClient.put<SettingsResponse>("/settings", payload),
  reset: () => apiClient.post<SettingsResponse>("/settings/reset"),
  uploadMedia: (payload: { base64_data: string; media_type?: string; folder?: string }) =>
    apiClient.post<MediaUploadResponse>("/media/upload", payload, { timeout: TIMEOUTS.UPLOAD }),
  getCommission: () => apiClient.get<CommissionSettingsResponse>("/settings/commission"),
  updateCommission: (payload: CommissionSettingsData) => apiClient.put<CommissionSettingsResponse>("/settings/commission", payload),
  getFinancial: () => apiClient.get<FinancialSettingsResponse>("/settings/financial"),
  updateFinancial: (payload: FinancialSettingsData) => apiClient.put<FinancialSettingsResponse>("/settings/financial", payload),
  getOperational: () => apiClient.get<OperationalSettingsResponse>("/settings/operational"),
  updateOperational: (payload: OperationalSettingsData) => apiClient.put<OperationalSettingsResponse>("/settings/operational", payload),
};
