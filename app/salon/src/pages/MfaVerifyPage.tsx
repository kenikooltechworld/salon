import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text, Tabs } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { toaster } from "@/components/ui/toaster";

export default function MfaVerifyPage() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const email = localStorage.getItem("mfaEmail") || "";

  useEffect(() => { if (!email) navigate("/auth/login"); }, [email, navigate]);

  const handleVerify = async () => {
    setError("");
    if (method !== "backup" && code.length !== 6) { setError("Please enter a 6-digit code"); return; }
    if (method === "backup" && !code) { setError("Please enter a backup code"); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/mfa/validate", { email, code });
      localStorage.removeItem("mfaEmail");
      await authService.loadSession();
      toaster.create({ title: "Verified", type: "success" });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Invalid code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) return null;
  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Verify Your Identity" subtitle="Enter the code from your authentication method" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        <Tabs.Root value={method} onValueChange={(e) => { setMethod(e.value as any); setCode(""); setError(""); }}>
          <Tabs.List mb="4">
            <Tabs.Trigger value="totp">Authenticator</Tabs.Trigger>
            <Tabs.Trigger value="backup">Backup Code</Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="totp">
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">6-Digit Code</Text>
                <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} inputMode="numeric" />
              </Box>
              <Button colorPalette="brand" w="full" onClick={handleVerify} loading={isLoading} disabled={isLoading || code.length !== 6}>Verify</Button>
            </Stack>
          </Tabs.Content>
          <Tabs.Content value="backup">
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">Backup Code</Text>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter backup code" />
              </Box>
              <Button colorPalette="brand" w="full" onClick={handleVerify} loading={isLoading} disabled={isLoading || !code}>Verify</Button>
            </Stack>
          </Tabs.Content>
        </Tabs.Root>
        <Text mt="6" pt="6" borderTopWidth="1px" textAlign="center" fontSize="sm">
          <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem("mfaEmail"); navigate("/auth/login"); }}>Back to Sign In</Button>
        </Text>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
