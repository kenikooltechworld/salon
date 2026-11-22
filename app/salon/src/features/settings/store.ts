import { create } from "zustand";
import type { TenantSettingsData } from "./types";
import { normalizeTenantSettings } from "./service";

interface SettingsStore {
  settings: TenantSettingsData | null;
  setSettings: (settings: TenantSettingsData | null) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: null,
  setSettings: (settings) => set({ settings: settings ? normalizeTenantSettings(settings) : null }),
}));
