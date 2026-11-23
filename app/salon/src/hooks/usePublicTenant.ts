import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { getCurrentTenantSubdomain } from "@/lib/domainConfig";

export interface PublicTenant {
  id: string;
  name: string;
  subdomain: string;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  status: string;
  is_published: boolean;
}

export function usePublicTenant() {
  const subdomain = getCurrentTenantSubdomain();
  return useQuery({
    queryKey: ["public-tenant", subdomain],
    queryFn: async () => {
      const { data } = await apiClient.get<PublicTenant>("/public/salon-info");
      return data;
    },
    enabled: !!subdomain,
    staleTime: 60_000,
    retry: 1,
  });
}

export function usePublicServices() {
  const subdomain = getCurrentTenantSubdomain();
  return useQuery({
    queryKey: ["public-services", subdomain],
    queryFn: async () => {
      const { data } = await apiClient.get("/public/services", { params: { page: 1, page_size: 100 } });
      return data;
    },
    enabled: !!subdomain,
  });
}

export function usePublicServicePackages() {
  const subdomain = getCurrentTenantSubdomain();
  return useQuery({
    queryKey: ["public-service-packages", subdomain],
    queryFn: async () => {
      const { data } = await apiClient.get("/public/service-packages", { params: { page: 1, page_size: 100 } });
      return data;
    },
    enabled: !!subdomain,
  });
}

export function usePublicServiceAddons(serviceId?: string) {
  const subdomain = getCurrentTenantSubdomain();
  return useQuery({
    queryKey: ["public-service-addons", subdomain, serviceId],
    queryFn: async () => {
      const { data } = await apiClient.get("/public/service-addons", { params: serviceId ? { service_id: serviceId } : undefined });
      return data;
    },
    enabled: !!subdomain,
  });
}
