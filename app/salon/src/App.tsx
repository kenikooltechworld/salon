import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box, Spinner } from "@chakra-ui/react";
import { authService, useAuthStore } from "@/features/auth";
import { AuthLayout } from "@/layouts/AuthLayout";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import AccountRecoveryPage from "@/pages/AccountRecoveryPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ChangePasswordRequiredPage from "@/pages/ChangePasswordRequiredPage";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HomePage from "@/pages/Home";
import FeaturesPage from "@/pages/Features";
import AboutPage from "@/pages/About";
import PricingPage from "@/pages/Pricing";
import LoginPage from "@/pages/LoginPage";
import MfaPage from "@/pages/MfaPage";
import MfaVerifyPage from "@/pages/MfaVerifyPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import RegisterSuccessPage from "@/pages/RegisterSuccessPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ServicesPage from "@/pages/ServicesPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated && !user) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    authService.loadSession().finally(() => setReady(true));
  }, []);

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
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pricing" element={<PricingPage />} />
          </Route>

          <Route path="/auth" element={<AuthLayout />}>
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="register-success" element={<RegisterSuccessPage />} />
            <Route path="verify" element={<VerifyEmailPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />
            <Route path="account-recovery" element={<AccountRecoveryPage />} />
            <Route path="mfa/verify" element={<MfaVerifyPage />} />
            <Route path="change-password-required" element={<ChangePasswordRequiredPage />} />
          </Route>

          <Route path="/login" element={<Navigate to="/auth/login" replace />} />
          <Route path="/register" element={<Navigate to="/auth/register" replace />} />
          <Route path="/forgot-password" element={<Navigate to="/auth/forgot-password" replace />} />
          <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
          <Route path="/verify-email" element={<Navigate to="/auth/verify" replace />} />

          <Route element={<Protected><DashboardLayout /></Protected>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/mfa" element={<MfaPage />} />
            <Route path="/auth/mfa/setup" element={<MfaPage />} />
          </Route>
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
