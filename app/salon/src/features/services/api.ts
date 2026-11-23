import { apiClient } from "@/lib/api";
import type { CommissionListResponse, CommissionSummaryResponse, Service, ServiceAddon, ServiceAddonListResponse, ServiceCategory, ServiceCategoryListResponse, ServiceCommission, ServiceListResponse, ServicePackage, ServicePackageListResponse } from "./types";

const params = (obj: Record<string, unknown>) => { const p: Record<string, any> = {}; for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== "") p[k] = v; return p; };
const normAddon = (p: any) => ({ ...p, applicable_service_ids: p?.applicable_service_ids ?? p?.applicable_services ?? [] });

export const servicesApi = {
  listCategories: () => apiClient.get<ServiceCategoryListResponse>("/service-categories"),
  createCategory: (payload: Partial<ServiceCategory>) => apiClient.post<ServiceCategory>("/service-categories", payload),
  updateCategory: (id: string, payload: Partial<ServiceCategory>) => apiClient.put<ServiceCategory>(`/service-categories/${id}`, payload),
  deleteCategory: (id: string) => apiClient.delete(`/service-categories/${id}`),

  list: (q: Record<string, unknown> = {}) => apiClient.get<ServiceListResponse>("/services", { params: params(q) }),
  get: (id: string) => apiClient.get<Service>(`/services/${id}`),
  create: (payload: any) => apiClient.post<Service>("/services", payload),
  update: (id: string, payload: any) => apiClient.put<Service>(`/services/${id}`, payload),
  remove: (id: string) => apiClient.delete<Service>(`/services/${id}`),

  listAddons: (q: Record<string, unknown> = {}) => apiClient.get<ServiceAddonListResponse>("/service-addons", { params: params(q) }),
  createAddon: (payload: any) => apiClient.post<ServiceAddon>("/service-addons", normAddon(payload)),
  updateAddon: (id: string, payload: any) => apiClient.put<ServiceAddon>(`/service-addons/${id}`, normAddon(payload)),
  removeAddon: (id: string) => apiClient.delete(`/service-addons/${id}`),

  listPackages: (q: Record<string, unknown> = {}) => apiClient.get<ServicePackageListResponse>("/service-packages", { params: params(q) }),
  getPackage: (id: string) => apiClient.get<ServicePackage>(`/service-packages/${id}`),
  createPackage: (payload: any) => apiClient.post<ServicePackage>("/service-packages", payload),
  updatePackage: (id: string, payload: any) => apiClient.put<ServicePackage>(`/service-packages/${id}`, payload),
  removePackage: (id: string) => apiClient.delete(`/service-packages/${id}`),
  togglePackageActive: (id: string) => apiClient.post<ServicePackage>(`/service-packages/${id}/toggle-active`),
  togglePackageFeatured: (id: string) => apiClient.post<ServicePackage>(`/service-packages/${id}/toggle-featured`),

  listStaffCommissions: (staffId: string, q: Record<string, unknown> = {}) => apiClient.get<CommissionListResponse>(`/service-commissions/staff/${staffId}`, { params: params(q) }),
  commissionSummary: (staffId: string, q: Record<string, unknown> = {}) => apiClient.get<CommissionSummaryResponse>(`/service-commissions/staff/${staffId}/summary`, { params: params(q) }),
  pendingCommissions: (staffId: string) => apiClient.get<{ commissions: ServiceCommission[]; total_pending: number }>(`/service-commissions/staff/${staffId}/pending`),
  markCommissionPaid: (id: string) => apiClient.post<ServiceCommission>(`/service-commissions/${id}/mark-paid`),
  markCommissionsPaidBatch: (staffId: string, commissionIds: string[]) => apiClient.post(`/service-commissions/staff/${staffId}/mark-paid-batch`, commissionIds),
};
