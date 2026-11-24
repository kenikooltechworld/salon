import { apiClient } from "@/lib/api";
import type { Booking, BookingCreate, BookingDetail, BookingListResponse, BookingUpdate } from "./types";

const asParams = (obj: Record<string, unknown>) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = v as any;
  }
  return p;
};

export const bookingsApi = {
  list: (params: Record<string, unknown> = {}) =>
    apiClient.get<BookingListResponse>("/appointments", { params: asParams(params) }),
  get: (id: string) => apiClient.get<Booking>(`/appointments/${id}`),
  detail: (id: string) => apiClient.get<BookingDetail>(`/appointments/${id}/detail`),
  create: (payload: BookingCreate) => apiClient.post<Booking>("/appointments", payload),
  update: (id: string, payload: BookingUpdate) => apiClient.put<Booking>(`/appointments/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/appointments/${id}`),
  confirm: (id: string) => apiClient.post<Booking>(`/appointments/${id}/confirm`),
  complete: (id: string) => apiClient.post<Booking>(`/appointments/${id}/complete`),
  start: (id: string) => apiClient.post<Booking>(`/appointments/${id}/start`),
  cancel: (id: string, reason?: string) => apiClient.post<Booking>(`/appointments/${id}/cancel`, { reason }),
  noShow: (id: string, reason?: string) => apiClient.post<Booking>(`/appointments/${id}/no-show`, { reason }),
  collectPayment: (id: string, payload: { payment_method: string; amount: number; notes?: string }) =>
    apiClient.post<Booking>(`/appointments/${id}/collect-payment`, payload),
  availableSlots: (params: { staff_id: string; service_id: string; date: string }) =>
    apiClient.get<{ date: string; slots: { time: string; available: boolean }[] }>("/appointments/available-slots", { params }),
};
