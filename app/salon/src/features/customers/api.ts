import { apiClient } from "@/lib/api";
import type {
  BookingEligibility,
  Customer,
  CustomerBalance,
  CustomerHistoryResponse,
  CustomerListResponse,
  CustomerPayload,
  CustomerPreference,
  CustomerPreferenceUpdate,
} from "./types";

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
  getPreferences: (id: string) =>
    apiClient.get<CustomerPreference>(`/customers/${id}/preferences`),
  updatePreferences: (id: string, payload: CustomerPreferenceUpdate) =>
    apiClient.put<CustomerPreference>(`/customers/${id}/preferences`, payload),
  getBalance: (id: string) => apiClient.get<CustomerBalance>(`/customers/${id}/balance`),
  updateBalance: (id: string) =>
    apiClient.put<{ customer_id: string; updated_balance: number; message: string }>(`/customers/${id}/balance`),
  getBookingEligibility: (id: string) =>
    apiClient.get<BookingEligibility>(`/customers/${id}/booking-eligibility`),
  getHistory: (id: string, params: Record<string, unknown> = {}) =>
    apiClient.get<CustomerHistoryResponse>(`/customers/${id}/history`, { params: asParams(params) }),
  getHistoryItem: (id: string, historyId: string) =>
    apiClient.get(`/customers/${id}/history/${historyId}`),
};
