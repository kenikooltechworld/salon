import { apiClient } from "@/lib/api";
import type { MediaUploadResponse, SettingsResponse, Subscription, TenantSettingsData } from "./types";

export const settingsApi = {
  get: () => apiClient.get<SettingsResponse>("/settings"),
  update: (payload: TenantSettingsData) => apiClient.put<SettingsResponse>("/settings", payload),
  reset: () => apiClient.post<SettingsResponse>("/settings/reset"),
  uploadMedia: (payload: { base64_data: string; media_type?: string; folder?: string }) =>
    apiClient.post<MediaUploadResponse>("/media/upload", payload),
  getSubscription: () => apiClient.get<Subscription>("/billing/subscription"),
};
