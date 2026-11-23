import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth";

export function RoleGuard({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || "").toLowerCase();
  const allowed = roles.map((r) => r.toLowerCase());
  if (!user) return <Navigate to="/auth/login" replace />;
  if (allowed.length > 0 && !allowed.includes(role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export function hasRole(userRole: string | undefined | null, roles: string[]) {
  const role = (userRole || "").toLowerCase();
  return roles.map((r) => r.toLowerCase()).includes(role);
}
