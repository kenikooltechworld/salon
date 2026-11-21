import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { setAuthToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import CustomersPage from "@/pages/CustomersPage";
import DashboardPage from "@/pages/DashboardPage";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ServicesPage from "@/pages/ServicesPage";

function Protected({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    setAuthToken(token);
  }, [token]);

  return (
    <BrowserRouter>
      <Box minH="100vh">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
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
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Box>
    </BrowserRouter>
  );
}
