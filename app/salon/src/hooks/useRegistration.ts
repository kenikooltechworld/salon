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

export function useRegisterSalon() {
  return useMutation({
    mutationFn: async (data: RegistrationData) => {
      const { data: response } = await api.post("/auth/register", data);
      return response;
    },
  });
}

export function useVerifyRegistrationCode() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const { data } = await api.post("/auth/verify-code", { email, code });
      await authService.loadSession();
      return data;
    },
  });
}

export function useResendVerificationCode() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post("/auth/resend-code", { email });
      return data;
    },
  });
}
