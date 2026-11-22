import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";

export interface RegistrationData {
  salon_name: string;
  owner_name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  bank_account?: string;
  referral_code?: string;
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { first_name: parts[0] || "Owner", last_name: parts.slice(1).join(" ") || "Account" };
}

export function useRegisterSalon() {
  return useMutation({
    mutationFn: async (data: RegistrationData) => {
      const { first_name, last_name } = splitName(data.owner_name);
      const { data: response } = await api.post("/auth/register", {
        tenant: { name: data.salon_name, email: data.email },
        user: { email: data.email, password: data.password, first_name, last_name, phone: data.phone, role: "owner" },
      });
      await authService.loadSession();
      return { success: true, data: response };
    },
  });
}

export function useVerifyRegistrationCode() {
  return useMutation({
    mutationFn: async ({ code }: { email: string; code: string }) => {
      const { data } = await api.post("/auth/verify-email", { code });
      return { success: true, data };
    },
  });
}

export function useResendVerificationCode() {
  return useMutation({
    mutationFn: async (_email: string) => {
      const { data } = await api.post("/auth/send-verification");
      return { success: true, data };
    },
  });
}
