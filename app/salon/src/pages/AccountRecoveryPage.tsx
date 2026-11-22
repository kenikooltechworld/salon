import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Spinner, Stack, Text, VStack } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";

export default function AccountRecoveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(!!token);
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (!token) return;
    const run = async () => {
      try {
        await api.post("/tenants/recover", { recovery_token: token });
        setRecovered(true);
        setSuccess("Your account has been recovered successfully. Redirecting to login...");
        setTimeout(() => navigate("/auth/login"), 2500);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to recover account");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [token, navigate]);

  const requestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setRequestLoading(true);
    try {
      const res = await api.post("/tenants/request-recovery", { email });
      setSuccess(res?.data?.message || "If the account exists, a recovery link has been sent");
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to request recovery");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Account Recovery" subtitle={token ? "Processing your account recovery..." : "Request an account recovery link"} />
        {isLoading && <VStack py="8"><Spinner /><Text color="fg.muted">Recovering account...</Text></VStack>}
        {success && <Alert.Root status="success" mb="4"><Alert.Indicator /><Box><Alert.Title>Success</Alert.Title><Alert.Description>{success}</Alert.Description></Box></Alert.Root>}
        {error && <Alert.Root status="error" mb="4"><Alert.Indicator /><Box><Alert.Title>Recovery</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}

        {!token && (
          <Box as="form" onSubmit={requestRecovery}>
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">Owner Email</Text>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
              </Box>
              <Button type="submit" colorPalette="brand" loading={requestLoading}>Send Recovery Link</Button>
              <Button variant="outline" onClick={() => navigate("/auth/login")}>Back to Login</Button>
            </Stack>
          </Box>
        )}

        {token && !isLoading && !recovered && (
          <Stack gap="3">
            <Button variant="outline" onClick={() => navigate("/auth/login")}>Return to Login</Button>
            <Button colorPalette="brand" onClick={() => navigate("/auth/account-recovery")}>Request New Recovery Link</Button>
          </Stack>
        )}
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
