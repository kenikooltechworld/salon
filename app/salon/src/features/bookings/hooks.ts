import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookingsApi } from "./api";
import type { BookingCreate, BookingUpdate } from "./types";

export const bookingKeys = {
  all: ["bookings"] as const,
  list: (params: Record<string, unknown>) => [...bookingKeys.all, "list", params] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
};

export function useBookings(params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: bookingKeys.list(params), queryFn: async () => (await bookingsApi.list(params)).data });
}

export function useBooking(id?: string) {
  return useQuery({ queryKey: bookingKeys.detail(id || ""), queryFn: async () => (await bookingsApi.get(id!)).data, enabled: !!id });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (payload: BookingCreate) => bookingsApi.create(payload), onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.all }) });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: BookingUpdate }) => bookingsApi.update(id, payload), onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: bookingKeys.all }); qc.invalidateQueries({ queryKey: bookingKeys.detail(v.id) }); } });
}

export function useDeleteBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => bookingsApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: bookingKeys.all }) });
}
