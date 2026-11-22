import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { settingsApi } from "./api";
import { normalizeTenantSettings } from "./service";
import { useSettingsStore } from "./store";
import type { TenantSettingsData } from "./types";

export const SETTINGS_KEY = ["tenant-settings"] as const;

function syncAuthTenant(data: TenantSettingsData) {
  const { tenant, user, setSession } = useAuthStore.getState();
  if (!tenant || !user) return;
  setSession(user, {
    ...tenant,
    name: data.tenant_name || data.salon_name || tenant.name,
    email: data.email ?? tenant.email,
    phone: data.phone ?? tenant.phone,
    address: data.address ?? tenant.address,
    logo_url: data.logo_url ?? null,
    primary_color: data.primary_color ?? tenant.primary_color,
    secondary_color: data.secondary_color ?? tenant.secondary_color,
  });
}

export function useTenantSettings() {
  const setSettings = useSettingsStore((s) => s.setSettings);
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const data = normalizeTenantSettings((await settingsApi.get()).data.data);
      setSettings(data);
      syncAuthTenant(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  const setSettings = useSettingsStore((s) => s.setSettings);
  return useMutation({
    mutationFn: async (payload: TenantSettingsData) => normalizeTenantSettings((await settingsApi.update(payload)).data.data),
    onSuccess: (data) => {
      setSettings(data);
      syncAuthTenant(data);
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}

export function useResetTenantSettings() {
  const qc = useQueryClient();
  const setSettings = useSettingsStore((s) => s.setSettings);
  return useMutation({
    mutationFn: async () => normalizeTenantSettings((await settingsApi.reset()).data.data),
    onSuccess: (data) => {
      setSettings(data);
      syncAuthTenant(data);
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}
