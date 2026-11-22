import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Spinner, Text, VStack } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";

export default function AccountRecoveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const run = async () => {
      const token = searchParams.get("token");
      if (!token) { setError("Invalid recovery link. No token provided."); setIsLoading(false); return; }
      try {
        await api.post("/tenants/recover", { recovery_token: token });
        setSuccess(true);
        setTimeout(() => navigate("/auth/login"), 3000);
      } catch (err: any) {
        setError(err?.response?.data?.detail || err?.message || "Failed to recover account");
      } finally {
        setIsLoading(false);
      }
    };
    run();
  }, [searchParams, navigate]);

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Account Recovery" subtitle="Processing your account recovery..." />
        {isLoading && <VStack py="8"><Spinner /><Text color="fg.muted">Recovering account...</Text></VStack>}
        {success && <Alert.Root status="success"><Alert.Indicator /><Box><Alert.Title>Success</Alert.Title><Alert.Description>Your account has been recovered successfully. Redirecting to login...</Alert.Description></Box></Alert.Root>}
        {error && !isLoading && (
          <VStack align="stretch" gap="4">
            <Alert.Root status="error"><Alert.Indicator /><Box><Alert.Title>Recovery Failed</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>
            <Button variant="outline" onClick={() => navigate("/auth/login")}>Return to Login</Button>
            <Button colorPalette="brand" onClick={() => navigate("/auth/forgot-password")}>Request New Recovery Link</Button>
          </VStack>
        )}
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
