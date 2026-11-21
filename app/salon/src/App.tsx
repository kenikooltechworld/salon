import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, Spinner } from "@chakra-ui/react";
import { useAuthStore } from "@/stores/authStore";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import LoginPage from "@/pages/LoginPage";
import MfaPage from "@/pages/MfaPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ServicesPage from "@/pages/ServicesPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated && !user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const load = useAuthStore((s) => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load().finally(() => setReady(true));
  }, [load]);

  if (!ready) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Spinner />
      </Box>
    );
  }

  return (
    <BrowserRouter>
      <Box minH="100vh">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <DashboardPage />
              </Protected>
            }
          />
          <Route
            path="/services"
            element={
              <Protected>
                <ServicesPage />
              </Protected>
            }
          />
          <Route
            path="/customers"
            element={
              <Protected>
                <CustomersPage />
              </Protected>
            }
          />
          <Route
            path="/profile"
            element={
              <Protected>
                <ProfilePage />
              </Protected>
            }
          />
          <Route
            path="/change-password"
            element={
              <Protected>
                <ChangePasswordPage />
              </Protected>
            }
          />
          <Route
            path="/verify-email"
            element={
              <Protected>
                <VerifyEmailPage />
              </Protected>
            }
          />
          <Route
            path="/mfa"
            element={
              <Protected>
                <MfaPage />
              </Protected>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
