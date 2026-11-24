import { apiClient } from "@/lib/api";
import type { Booking, BookingCreate, BookingDetail, BookingListResponse, BookingUpdate } from "./types";
const asParams = (obj: Record<string, unknown>) => { const p: Record<string, string | number | boolean> = {}; for (const [k, v] of Object.entries(obj)) { if (v === undefined || v === null || v === "") continue; p[k] = v as any; } return p; };
const normalizeList = (data: any, params: Record<string, unknown>): BookingListResponse => {
  if (Array.isArray(data)) {
    const page = Number(params.page || 1); const page_size = Number(params.page_size || data.length || 50);
    return { appointments: data, total: data.length, page, page_size };
  }
  if (data?.appointments) return data as BookingListResponse;
  return { appointments: [], total: 0, page: 1, page_size: 50 };
};
export const bookingsApi = {
  list: async (params: Record<string, unknown> = {}) => { const res = await apiClient.get("/appointments", { params: asParams(params) }); return { ...res, data: normalizeList(res.data, params) }; },
  get: (id: string) => apiClient.get<Booking>(`/appointments/${id}`),
  detail: async (id: string) => {
    try { return await apiClient.get<BookingDetail>(`/appointments/${id}/detail`); }
    catch { return await apiClient.get<BookingDetail>(`/appointments/${id}`); }
  },
  create: (payload: BookingCreate) => apiClient.post<Booking>("/appointments", payload),
  update: (id: string, payload: BookingUpdate) => apiClient.put<Booking>(`/appointments/${id}`, payload),
  remove: (id: string) => apiClient.delete(`/appointments/${id}`),
  confirm: async (id: string) => { try { return await apiClient.post<Booking>(`/appointments/${id}/confirm`); } catch { return await apiClient.put<Booking>(`/appointments/${id}`, { status: "confirmed" }); } },
  complete: async (id: string) => { try { return await apiClient.post<Booking>(`/appointments/${id}/complete`); } catch { return await apiClient.put<Booking>(`/appointments/${id}`, { status: "completed" }); } },
  start: async (id: string) => { try { return await apiClient.post<Booking>(`/appointments/${id}/start`); } catch { return await apiClient.put<Booking>(`/appointments/${id}`, { status: "in_progress" }); } },
  cancel: async (id: string, reason?: string) => { try { return await apiClient.post<Booking>(`/appointments/${id}/cancel`, { reason }); } catch { return await apiClient.put<Booking>(`/appointments/${id}`, { status: "cancelled", cancellation_reason: reason || "Cancelled" }); } },
  noShow: async (id: string, reason?: string) => { try { return await apiClient.post<Booking>(`/appointments/${id}/no-show`, { reason }); } catch { return await apiClient.put<Booking>(`/appointments/${id}`, { status: "no_show", no_show_reason: reason || "Marked as no-show" }); } },
};
