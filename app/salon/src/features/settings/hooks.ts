import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/store";
import { settingsApi } from "./api";
import { getErrorMessage, normalizeCommissionSettings, normalizeFinancialSettings, normalizeOperationalSettings, normalizePaystackSubaccount, normalizeTenantSettings } from "./service";
import { useSettingsStore } from "./store";
import type { CommissionSettingsData, FinancialSettingsData, OperationalSettingsData, PaystackSubaccountRegisterPayload, TenantSettingsData } from "./types";

export const SETTINGS_KEY = ["tenant-settings"] as const;
export const COMMISSION_SETTINGS_KEY = ["commission-settings"] as const;
export const FINANCIAL_SETTINGS_KEY = ["financial-settings"] as const;
export const OPERATIONAL_SETTINGS_KEY = ["operational-settings"] as const;
export const PAYSTACK_SUBACCOUNT_KEY = ["paystack-subaccount"] as const;

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

export function useCommissionSettings() {
  return useQuery({
    queryKey: COMMISSION_SETTINGS_KEY,
    queryFn: async () => normalizeCommissionSettings((await settingsApi.getCommission()).data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateCommissionSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CommissionSettingsData) => normalizeCommissionSettings((await settingsApi.updateCommission(payload)).data.data),
    onSuccess: (data) => {
      qc.setQueryData(COMMISSION_SETTINGS_KEY, data);
    },
  });
}

export function useFinancialSettings() {
  return useQuery({
    queryKey: FINANCIAL_SETTINGS_KEY,
    queryFn: async () => normalizeFinancialSettings((await settingsApi.getFinancial()).data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateFinancialSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: FinancialSettingsData) => normalizeFinancialSettings((await settingsApi.updateFinancial(payload)).data.data),
    onSuccess: (data) => {
      qc.setQueryData(FINANCIAL_SETTINGS_KEY, data);
    },
  });
}

export function usePaystackSubaccount() {
  return useQuery({
    queryKey: PAYSTACK_SUBACCOUNT_KEY,
    queryFn: async () => {
      const res = await settingsApi.getPaystackSubaccount();
      return normalizePaystackSubaccount(res.data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useRegisterPaystackSubaccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: PaystackSubaccountRegisterPayload) => {
      const res = await settingsApi.registerPaystackSubaccount(payload);
      return normalizePaystackSubaccount(res.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAYSTACK_SUBACCOUNT_KEY });
    },
  });
}

export function useOperationalSettings() {
  return useQuery({
    queryKey: OPERATIONAL_SETTINGS_KEY,
    queryFn: async () => normalizeOperationalSettings((await settingsApi.getOperational()).data.data),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateOperationalSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: OperationalSettingsData) => normalizeOperationalSettings((await settingsApi.updateOperational(payload)).data.data),
    onSuccess: (data) => {
      qc.setQueryData(OPERATIONAL_SETTINGS_KEY, data);
    },
  });
}

export { getErrorMessage };
