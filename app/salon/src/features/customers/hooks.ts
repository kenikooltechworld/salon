import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customersApi } from "./api";

export const customerKeys = {
  all: ["customers"] as const,
  list: (params: Record<string, unknown>) => [...customerKeys.all, "list", params] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
};

export function useCustomers(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: customerKeys.list(params),
    queryFn: async () => (await customersApi.list(params)).data,
  });
}

export function useCustomer(id?: string) {
  return useQuery({
    queryKey: customerKeys.detail(id || ""),
    queryFn: async () => (await customersApi.get(id!)).data,
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      customersApi.update(id, payload),
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.invalidateQueries({ queryKey: customerKeys.detail(v.id) });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useResendCustomerPortalInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customersApi.resendPortalInvitation(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: customerKeys.all });
      qc.invalidateQueries({ queryKey: customerKeys.detail(id) });
    },
  });
}
