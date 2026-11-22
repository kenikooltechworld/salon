import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Text, VStack } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";
import { toaster } from "@/components/ui/toaster";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (code.length !== 6) { setError("Please enter all 6 digits"); return; }
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/verify-email", { code, email: email || undefined });
      toaster.create({ title: "Email verified", description: "Your email has been verified.", type: "success" });
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to verify code. Please try again.";
      setError(msg);
      toaster.create({ title: "Verification Failed", description: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await api.post("/auth/send-verification", email ? { email } : undefined);
      setCode("");
      setResendCountdown(60);
      toaster.create({ title: "Code sent", description: "Verification code resent to your email.", type: "success" });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to resend code.";
      setError(msg);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Verify Your Email" subtitle={email ? `We sent a 6-digit code to ${email}` : "Enter the 6-digit code sent to your email"} />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        <Box as="form" onSubmit={handleVerify}>
          <VStack gap="4" align="stretch">
            <VerificationCodeInput value={code} onChange={setCode} disabled={isLoading} error={error && code.length !== 6 ? error : undefined} />
            <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || code.length !== 6}>Verify Email</Button>
            <Button variant="outline" w="full" onClick={handleResend} disabled={isLoading || resendCountdown > 0}>
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
            </Button>
          </VStack>
        </Box>
        <Text mt="6" pt="6" borderTopWidth="1px" textAlign="center" fontSize="sm">
          <Link to="/auth/register"><Text as="span" color="brand.500">Back to Register</Text></Link>
        </Text>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
