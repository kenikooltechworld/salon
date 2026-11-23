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
import CustomersPage from "@/pages/customers/CustomersPage";
import CustomerDetailPage from "@/pages/customers/CustomerDetailPage";
import DashboardPage from "@/pages/DashboardPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import HomePage from "@/pages/Home";
import FeaturesPage from "@/pages/Features";
import AboutPage from "@/pages/About";
import PricingPage from "@/pages/Pricing";
import LoginPage from "@/pages/LoginPage";
import PublicBookingPage from "@/pages/public/PublicBookingPage";
import { isPublicTenantHost } from "@/lib/domainConfig";
import MfaPage from "@/pages/MfaPage";
import MfaVerifyPage from "@/pages/MfaVerifyPage";
import ProfilePage from "@/pages/ProfilePage";
import RegisterPage from "@/pages/RegisterPage";
import RegisterSuccessPage from "@/pages/RegisterSuccessPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import ServicesPage from "@/pages/services/ServicesPage";
import ServiceDetailPage from "@/pages/services/ServiceDetailPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";
import NotificationsPage from "@/pages/notifications/NotificationsPage";
import NotificationDetailPage from "@/pages/notifications/NotificationDetailPage";
import SettingsPage from "@/pages/settings/SettingsPage";
import GeneralSettings from "@/pages/settings/GeneralSettings";
import CommissionSettings from "@/pages/settings/CommissionSettings";
import FinancialSettings from "@/pages/settings/FinancialSettings";
import OperationalSettings from "@/pages/settings/OperationalSettings";
import BillingSettings from "@/pages/settings/BillingSettings";
import NotificationSettings from "@/pages/settings/NotificationSettings";
import EmailTemplatesSettings from "@/pages/settings/EmailTemplatesSettings";
import LocationsSettings from "@/pages/settings/LocationsSettings";

function Protected({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  if (!isAuthenticated && !user) return <Navigate to="/auth/login" replace />;
  return <>{children}</>;
}

function PublicTenantApp() {
  return (
    <Routes>
      <Route path="/" element={<PublicBookingPage />} />
      <Route path="/public/*" element={<PublicBookingPage />} />
      <Route path="*" element={<PublicBookingPage />} />
    </Routes>
  );
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role || "").toLowerCase();
  if (!user) return <Navigate to="/auth/login" replace />;
  if (roles.length > 0 && !roles.map((r) => r.toLowerCase()).includes(role)) return <Navigate to="/dashboard" replace />;
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

  if (isPublicTenantHost()) {
    return (
      <BrowserRouter>
        <PublicTenantApp />
      </BrowserRouter>
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
            <Route path="/services" element={<RoleRoute roles={["owner","admin","manager","staff"]}><ServicesPage /></RoleRoute>} />
            <Route path="/services/:id" element={<RoleRoute roles={["owner","admin","manager","staff"]}><ServiceDetailPage /></RoleRoute>} />
            <Route path="/customers" element={<RoleRoute roles={["owner","admin","manager","staff"]}><CustomersPage /></RoleRoute>} />
            <Route path="/customers/:id" element={<RoleRoute roles={["owner","admin","manager","staff"]}><CustomerDetailPage /></RoleRoute>} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/:id" element={<NotificationDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<RoleRoute roles={["owner","admin"]}><SettingsPage /></RoleRoute>} />
            <Route path="/settings/general" element={<RoleRoute roles={["owner","admin"]}><GeneralSettings /></RoleRoute>} />
            <Route path="/settings/commission" element={<RoleRoute roles={["owner","admin"]}><CommissionSettings /></RoleRoute>} />
            <Route path="/settings/financial" element={<RoleRoute roles={["owner","admin"]}><FinancialSettings /></RoleRoute>} />
            <Route path="/settings/operational" element={<RoleRoute roles={["owner","admin"]}><OperationalSettings /></RoleRoute>} />
            <Route path="/settings/billing" element={<RoleRoute roles={["owner","admin"]}><BillingSettings /></RoleRoute>} />
            <Route path="/settings/notifications" element={<RoleRoute roles={["owner","admin"]}><NotificationSettings /></RoleRoute>} />
            <Route path="/settings/email-templates" element={<RoleRoute roles={["owner","admin"]}><EmailTemplatesSettings /></RoleRoute>} />
            <Route path="/settings/locations" element={<RoleRoute roles={["owner","admin"]}><LocationsSettings /></RoleRoute>} />
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/mfa" element={<MfaPage />} />
            <Route path="/auth/mfa/setup" element={<MfaPage />} />
          </Route>
        </Routes>
      </Box>
    </BrowserRouter>
  );
}