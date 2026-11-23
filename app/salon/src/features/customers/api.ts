import { apiClient } from "@/lib/api";
import type { Customer, CustomerListResponse, CustomerPayload } from "./types";

const asParams = (obj: Record<string, unknown>) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = v as any;
  }
  return p;
};

export const customersApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiClient.get<CustomerListResponse>("/customers", { params: asParams(params) }),
  get: (id: string) => apiClient.get<Customer>(`/customers/${id}`),
  create: (payload: Partial<CustomerPayload>) => apiClient.post<Customer>("/customers", payload),
  update: (id: string, payload: Partial<CustomerPayload>) =>
    apiClient.put<Customer>(`/customers/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/customers/${id}`),
  resendPortalInvitation: (id: string) =>
    apiClient.post<{ message: string }>(`/customers/${id}/resend-portal-invitation`),
};
