import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { availabilityApi } from "./api";
import type { AvailabilityPayload } from "./types";

export const availabilityKeys = {
  all: ["availability"] as const,
  staff: (staffId: string) => [...availabilityKeys.all, staffId] as const,
};

export function useStaffAvailability(staffId?: string) {
  return useQuery({
    queryKey: availabilityKeys.staff(staffId || ""),
    queryFn: async () => (await availabilityApi.list(staffId!)).data,
    enabled: !!staffId,
  });
}

export function useCreateAvailability(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvailabilityPayload) => availabilityApi.create(staffId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKeys.staff(staffId) }),
  });
}

export function useUpdateAvailability(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AvailabilityPayload> }) =>
      availabilityApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKeys.staff(staffId) }),
  });
}

export function useDeleteAvailability(staffId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => availabilityApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKeys.staff(staffId) }),
  });
}
