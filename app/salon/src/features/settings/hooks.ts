import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi, type TenantSettingsData } from "./api";

export const SETTINGS_KEY = ["tenant-settings"];

export function useTenantSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: async () => (await settingsApi.get()).data.data, staleTime: 5 * 60 * 1000 });
}
export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async (payload: TenantSettingsData) => (await settingsApi.update(payload)).data.data, onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }) });
}
export function useResetTenantSettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: async () => (await settingsApi.reset()).data.data, onSuccess: () => qc.invalidateQueries({ queryKey: SETTINGS_KEY }) });
}
