import { apiClient } from "@/lib/api";
import type { Booking, BookingCreate, BookingUpdate } from "./types";

const asParams = (obj: Record<string, unknown>) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = v as any;
  }
  return p;
};

export const bookingsApi = {
  list: (params: Record<string, unknown> = {}) => apiClient.get<Booking[]>("/appointments", { params: asParams(params) }),
  get: (id: string) => apiClient.get<Booking>(`/appointments/${id}`),
  create: (payload: BookingCreate) => apiClient.post<Booking>("/appointments", payload),
  update: (id: string, payload: BookingUpdate) => apiClient.put<Booking>(`/appointments/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/appointments/${id}`),
};
