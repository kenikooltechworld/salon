import { apiClient } from "@/lib/api";
import type { Tenant, User } from "./types";

export const authApi = {
  me: () => apiClient.get<{ user: User; tenant: Tenant }>("/auth/me"),
  logout: () => apiClient.post("/auth/logout"),
};