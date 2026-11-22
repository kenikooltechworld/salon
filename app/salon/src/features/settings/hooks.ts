import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "./api";
import { normalizeTenantSettings } from "./service";
import { useSettingsStore } from "./store";
import type { TenantSettingsData } from "./types";

export const SETTINGS_KEY = ["tenant-settings"] as const;
export const SUBSCRIPTION_KEY = ["subscription"] as const;

export function useTenantSettings() {
  const setSettings = useSettingsStore((s) => s.setSettings);
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const data = normalizeTenantSettings((await settingsApi.get()).data.data);
      setSettings(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: async () => (await settingsApi.getSubscription()).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  const setSettings = useSettingsStore((s) => s.setSettings);
  return useMutation({
    mutationFn: async (payload: TenantSettingsData) => normalizeTenantSettings((await settingsApi.update(payload)).data.data),
    onSuccess: (data) => {
      setSettings(data);
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
      qc.invalidateQueries({ queryKey: SETTINGS_KEY });
    },
  });
}
