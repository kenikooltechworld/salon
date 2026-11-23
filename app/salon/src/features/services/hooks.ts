import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicesApi } from "./api";
const k = {
  all: ["services"] as const,
  cats: () => [...k.all, "categories"] as const,
  list: (q: any) => [...k.all, "list", q] as const,
  detail: (id: string) => [...k.all, "detail", id] as const,
  addons: (q: any) => [...k.all, "addons", q] as const,
  packages: (q: any) => [...k.all, "packages", q] as const,
  commissions: (staffId: string, q: any) => [...k.all, "commissions", staffId, q] as const,
  summary: (staffId: string, q: any) => [...k.all, "summary", staffId, q] as const,
};
const inv = (qc: any) => qc.invalidateQueries({ queryKey: k.all });
export const useServiceCategories = () => useQuery({ queryKey: k.cats(), queryFn: async () => (await servicesApi.listCategories()).data });
export const useCreateServiceCategory = () => { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.createCategory, onSuccess: () => inv(qc) }); };
export const useUpdateServiceCategory = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: any) => servicesApi.updateCategory(id, payload), onSuccess: () => inv(qc) }); };
export const useDeleteServiceCategory = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.deleteCategory(id), onSuccess: () => inv(qc) }); };
export const useServices = (q: Record<string, unknown> = {}) => useQuery({ queryKey: k.list(q), queryFn: async () => (await servicesApi.list(q)).data });
export const useService = (id?: string) => useQuery({ queryKey: k.detail(id || ""), queryFn: async () => (await servicesApi.get(id!)).data, enabled: !!id });
export const useCreateService = () => { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.create, onSuccess: () => inv(qc) }); };
export const useUpdateService = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: any) => servicesApi.update(id, payload), onSuccess: () => inv(qc) }); };
export const useDeleteService = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.remove(id), onSuccess: () => inv(qc) }); };
export const useServiceAddons = (q: Record<string, unknown> = {}) => useQuery({ queryKey: k.addons(q), queryFn: async () => (await servicesApi.listAddons(q)).data });
export const useCreateServiceAddon = () => { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.createAddon, onSuccess: () => inv(qc) }); };
export const useUpdateServiceAddon = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: any) => servicesApi.updateAddon(id, payload), onSuccess: () => inv(qc) }); };
export const useDeleteServiceAddon = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.removeAddon(id), onSuccess: () => inv(qc) }); };
export const useServicePackages = (q: Record<string, unknown> = {}) => useQuery({ queryKey: k.packages(q), queryFn: async () => (await servicesApi.listPackages(q)).data });
export const useCreateServicePackage = () => { const qc = useQueryClient(); return useMutation({ mutationFn: servicesApi.createPackage, onSuccess: () => inv(qc) }); };
export const useUpdateServicePackage = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ id, payload }: any) => servicesApi.updatePackage(id, payload), onSuccess: () => inv(qc) }); };
export const useDeleteServicePackage = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.removePackage(id), onSuccess: () => inv(qc) }); };
export const useTogglePackageActive = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.togglePackageActive(id), onSuccess: () => inv(qc) }); };
export const useTogglePackageFeatured = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.togglePackageFeatured(id), onSuccess: () => inv(qc) }); };
export const useStaffCommissions = (staffId?: string, q: Record<string, unknown> = {}) => useQuery({ queryKey: k.commissions(staffId || "", q), queryFn: async () => (await servicesApi.listStaffCommissions(staffId!, q)).data, enabled: !!staffId });
export const useCommissionSummary = (staffId?: string, q: Record<string, unknown> = {}) => useQuery({ queryKey: k.summary(staffId || "", q), queryFn: async () => (await servicesApi.commissionSummary(staffId!, q)).data, enabled: !!staffId });
export const usePendingCommissions = (staffId?: string) => useQuery({ queryKey: [...k.all, "pending", staffId], queryFn: async () => (await servicesApi.pendingCommissions(staffId!)).data, enabled: !!staffId });
export const useMarkCommissionPaid = () => { const qc = useQueryClient(); return useMutation({ mutationFn: (id: string) => servicesApi.markCommissionPaid(id), onSuccess: () => inv(qc) }); };
export const useMarkCommissionsPaidBatch = () => { const qc = useQueryClient(); return useMutation({ mutationFn: ({ staffId, commissionIds }: { staffId: string; commissionIds: string[] }) => servicesApi.markCommissionsPaidBatch(staffId, commissionIds), onSuccess: () => inv(qc) }); };
