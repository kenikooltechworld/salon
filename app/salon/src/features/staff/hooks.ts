import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "./api";
import type { StaffPayload } from "./types";

export const staffKeys = {
  all: ["staff"] as const,
  list: (params: Record<string, unknown>) => [...staffKeys.all, "list", params] as const,
  detail: (id: string) => [...staffKeys.all, "detail", id] as const,
  metrics: (id: string) => [...staffKeys.all, "metrics", id] as const,
  activity: (id: string) => [...staffKeys.all, "activity", id] as const,
  performance: (id: string) => [...staffKeys.all, "performance", id] as const,
  reviews: (id: string) => [...staffKeys.all, "reviews", id] as const,
  payment: (id: string) => [...staffKeys.all, "payment", id] as const,
};

export function useStaff(params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: staffKeys.list(params), queryFn: async () => (await staffApi.list(params)).data });
}

export function useStaffMember(id?: string) {
  return useQuery({ queryKey: staffKeys.detail(id || ""), queryFn: async () => (await staffApi.get(id!)).data, enabled: !!id });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: StaffPayload) => staffApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<StaffPayload> }) => staffApi.update(id, payload),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: staffKeys.all });
      qc.invalidateQueries({ queryKey: staffKeys.detail(v.id) });
    },
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useTerminateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => staffApi.terminate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffKeys.all }),
  });
}

export function useStaffMetrics(id?: string) {
  return useQuery({ queryKey: staffKeys.metrics(id || ""), queryFn: async () => (await staffApi.metrics(id!)).data, enabled: !!id });
}
export function useStaffActivity(id?: string, limit = 10) {
  return useQuery({ queryKey: staffKeys.activity(id || ""), queryFn: async () => (await staffApi.activityFeed(id!, limit)).data, enabled: !!id });
}
export function useStaffPerformance(id?: string) {
  return useQuery({ queryKey: staffKeys.performance(id || ""), queryFn: async () => (await staffApi.performance(id!)).data, enabled: !!id });
}
export function useStaffReviews(id?: string, limit = 25) {
  return useQuery({ queryKey: staffKeys.reviews(id || ""), queryFn: async () => (await staffApi.reviews(id!, limit)).data, enabled: !!id });
}
export function useStaffPaymentStructure(id?: string) {
  return useQuery({ queryKey: staffKeys.payment(id || ""), queryFn: async () => (await staffApi.paymentStructure(id!)).data, enabled: !!id });
}
