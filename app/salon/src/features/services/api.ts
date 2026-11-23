import { apiClient } from "@/lib/api";
import type {
  CommissionListResponse, CommissionSummaryResponse,
  Service, ServiceAddon, ServiceAddonListResponse,
  ServiceCategory, ServiceCategoryListResponse,
  ServiceCommission, ServiceListResponse,
  ServicePackage, ServicePackageListResponse,
} from "./types";

const asParams = (obj: Record<string, unknown>) => {
  const p: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    p[k] = v as any;
  }
  return p;
};

export const servicesApi = {
  listCategories: () => apiClient.get<ServiceCategoryListResponse>("/service-categories"),
  createCategory: (payload: Partial<ServiceCategory>) => apiClient.post<ServiceCategory>("/service-categories", payload),
  updateCategory: (id: string, payload: Partial<ServiceCategory>) => apiClient.put<ServiceCategory>(`/service-categories/${id}`, payload),
  deleteCategory: (id: string) => apiClient.delete(`/service-categories/${id}`),

  list: (params: Record<string, unknown> = {}) => apiClient.get<ServiceListResponse>("/services", { params: asParams(params) }),
  get: (id: string) => apiClient.get<Service>(`/services/${id}`),
  create: (payload: Partial<Service>) => apiClient.post<Service>("/services", payload),
  update: (id: string, payload: Partial<Service>) => apiClient.put<Service>(`/services/${id}`, payload),
  remove: (id: string) => apiClient.delete<Service>(`/services/${id}`),

  listAddons: (params: Record<string, unknown> = {}) => apiClient.get<ServiceAddonListResponse>("/service-addons", { params: asParams(params) }),
  createAddon: (payload: Partial<ServiceAddon>) => apiClient.post<ServiceAddon>("/service-addons", payload),
  updateAddon: (id: string, payload: Partial<ServiceAddon>) => apiClient.put<ServiceAddon>(`/service-addons/${id}`, payload),
  removeAddon: (id: string) => apiClient.delete<ServiceAddon>(`/service-addons/${id}`),

  listPackages: (params: Record<string, unknown> = {}) => apiClient.get<ServicePackageListResponse>("/service-packages", { params: asParams(params) }),
  getPackage: (id: string) => apiClient.get<ServicePackage>(`/service-packages/${id}`),
  createPackage: (payload: any) => apiClient.post<ServicePackage>("/service-packages", payload),
  updatePackage: (id: string, payload: any) => apiClient.put<ServicePackage>(`/service-packages/${id}`, payload),
  removePackage: (id: string) => apiClient.delete(`/service-packages/${id}`),

  calculateCommission: (appointmentId: string) => apiClient.post<ServiceCommission>(`/service-commissions/calculate/${appointmentId}`),
  listStaffCommissions: (staffId: string, params: Record<string, unknown> = {}) => apiClient.get<CommissionListResponse>(`/service-commissions/staff/${staffId}`, { params: asParams(params) }),
  commissionSummary: (staffId: string, params: Record<string, unknown> = {}) => apiClient.get<CommissionSummaryResponse>(`/service-commissions/staff/${staffId}/summary`, { params: asParams(params) }),
  markCommissionPaid: (id: string) => apiClient.post<ServiceCommission>(`/service-commissions/${id}/mark-paid`),
  markCommissionsPaidBatch: (staffId: string, commissionIds: string[]) => apiClient.post(`/service-commissions/staff/${staffId}/mark-paid-batch`, commissionIds),
};
