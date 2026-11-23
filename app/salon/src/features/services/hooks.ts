import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "./api";

export const serviceKeys = {
  all: ["services"] as const,
  categories: () => [...serviceKeys.all, "categories"] as const,
  list: (params: Record<string, unknown>) => [...serviceKeys.all, "list", params] as const,
  detail: (id: string) => [...serviceKeys.all, "detail", id] as const,
  addons: (params: Record<string, unknown>) => [...serviceKeys.all, "addons", params] as const,
  packages: (params: Record<string, unknown>) => [...serviceKeys.all, "packages", params] as const,
  commissions: (staffId: string, params: Record<string, unknown>) => [...serviceKeys.all, "commissions", staffId, params] as const,
  summary: (staffId: string, params: Record<string, unknown>) => [...serviceKeys.all, "commission-summary", staffId, params] as const,
};

export function useServiceCategories() {
  return useQuery({ queryKey: serviceKeys.categories(), queryFn: async () => (await servicesApi.listCategories()).data });
}
export function useCreateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: servicesApi.createCategory, onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) });
}
export function useUpdateServiceCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => servicesApi.updateCategory(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) });
}
export function useDeleteServiceCategory() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => servicesApi.deleteCategory(id), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) });
}

export function useServices(params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: serviceKeys.list(params), queryFn: async () => (await servicesApi.list(params)).data });
}
export function useService(id?: string) {
  return useQuery({ queryKey: serviceKeys.detail(id || ""), queryFn: async () => (await servicesApi.get(id!)).data, enabled: !!id });
}
export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: servicesApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) });
}
export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => servicesApi.update(id, payload), onSuccess: (_, v) => { qc.invalidateQueries({ queryKey: serviceKeys.all }); qc.invalidateQueries({ queryKey: serviceKeys.detail(v.id) }); } });
}
export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id: string) => servicesApi.remove(id), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) });
}

export function useServiceAddons(params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: serviceKeys.addons(params), queryFn: async () => (await servicesApi.listAddons(params)).data });
}
export function useCreateServiceAddon() { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.createAddon, onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }
export function useUpdateServiceAddon() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => servicesApi.updateAddon(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }
export function useDeleteServiceAddon() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.removeAddon(id), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }

export function useServicePackages(params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: serviceKeys.packages(params), queryFn: async () => (await servicesApi.listPackages(params)).data });
}
export function useCreateServicePackage() { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.createPackage, onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }
export function useUpdateServicePackage() { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: { id: string; payload: any }) => servicesApi.updatePackage(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }
export function useDeleteServicePackage() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.removePackage(id), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }

export function useStaffCommissions(staffId?: string, params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: serviceKeys.commissions(staffId || "", params), queryFn: async () => (await servicesApi.listStaffCommissions(staffId!, params)).data, enabled: !!staffId });
}
export function useCommissionSummary(staffId?: string, params: Record<string, unknown> = {}) {
  return useQuery({ queryKey: serviceKeys.summary(staffId || "", params), queryFn: async () => (await servicesApi.commissionSummary(staffId!, params)).data, enabled: !!staffId });
}
export function useMarkCommissionPaid() { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.markCommissionPaid(id), onSuccess: () => qc.invalidateQueries({ queryKey: serviceKeys.all }) }); }
