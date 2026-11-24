import { apiClient } from "@/lib/api";
import type { Staff, StaffListResponse, StaffPayload } from "./types";

const asParams = (obj: Record<string, unknown>) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = v as any;
  }
  return p;
};

export const staffApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiClient.get<StaffListResponse>("/staff", { params: asParams(params) }),
  get: (id: string) => apiClient.get<Staff>(`/staff/${id}`),
  create: (payload: StaffPayload) => apiClient.post<Staff>("/staff", payload),
  update: (id: string, payload: Partial<StaffPayload>) => apiClient.put<Staff>(`/staff/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/staff/${id}`),
  getByUser: (userId: string) => apiClient.get<Staff>(`/staff/user/${userId}`),
  metrics: (id: string) => apiClient.get(`/staff/${id}/metrics`),
  activityFeed: (id: string, limit = 10) => apiClient.get(`/staff/${id}/activity-feed`, { params: { limit } }),
  performance: (id: string) => apiClient.get(`/staff/${id}/performance-metrics`),
  reviews: (id: string, limit = 25) => apiClient.get(`/staff/${id}/reviews`, { params: { limit } }),
  paymentStructure: (id: string) => apiClient.get(`/staff/${id}/payment-structure`),
};
