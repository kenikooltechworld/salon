import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Text, VStack, Dialog, HStack } from "@chakra-ui/react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { VerificationCodeInput } from "@/components/auth/VerificationCodeInput";
import { toaster } from "@/components/ui/toaster";
import { useResendVerificationCode, useVerifyRegistrationCode } from "@/hooks/useRegistration";
import { getApiErrorMessage } from "@/lib/utils/auth-validation";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [successData, setSuccessData] = useState<{ subdomain: string; full_url: string; tenant_id: string } | null>(null);
  const verifyMutation = useVerifyRegistrationCode();
  const resendMutation = useResendVerificationCode();

  useEffect(() => { if (!email) navigate("/auth/register"); }, [email, navigate]);
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  const handleVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^\d{6}$/.test(code)) { setError("Enter a valid 6-digit code"); return; }
    setError("");
    try {
      const response = await verifyMutation.mutateAsync({ email, code });
      const data = (response as any)?.data;
      setSuccessData({
        subdomain: data?.subdomain || "",
        full_url: data?.full_url || data?.subdomain || "",
        tenant_id: data?.tenant_id || "",
      });
      toaster.create({ title: "Registration verified", description: "Your account has been created successfully.", type: "success" });
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to verify code. Please try again.");
      setError(msg);
      toaster.create({ title: "Verification Failed", description: msg, type: "error" });
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await resendMutation.mutateAsync(email);
      setCode("");
      setResendCountdown(60);
      toaster.create({ title: "Code sent", description: "Verification code resent to your email.", type: "success" });
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to resend code.");
      setError(msg);
      toaster.create({ title: "Failed to resend code", description: msg, type: "error" });
    }
  };

  return (
    <>
      <Card.Root shadow="lg">
        <Card.Body p={{ base: "6", md: "10" }}>
          <AuthHeader title="Verify Your Email" subtitle={`We sent a 6-digit code to ${email}`} />
          {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
          <Box as="form" onSubmit={handleVerify}>
            <VStack gap="4" align="stretch">
              <VerificationCodeInput value={code} onChange={setCode} disabled={verifyMutation.isPending} error={error && code.length !== 6 ? error : undefined} />
              <Button type="submit" colorPalette="brand" w="full" loading={verifyMutation.isPending} disabled={verifyMutation.isPending || code.length !== 6}>Verify Email</Button>
              <Button variant="outline" w="full" onClick={handleResend} disabled={resendMutation.isPending || resendCountdown > 0}>
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

      <Dialog.Root open={!!successData} onOpenChange={(e) => { if (!e.open) navigate("/auth/register-success", { state: successData }); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header><Dialog.Title>Your salon domain is ready</Dialog.Title></Dialog.Header>
            <Dialog.Body>
              <VStack align="stretch" gap="3">
                <Text color="fg.muted">Your account has been created. Share this domain with customers.</Text>
                <Box bg="bg.muted" p="4" rounded="md" fontFamily="mono" fontWeight="semibold">{successData?.full_url}</Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <HStack gap="3">
                <Button variant="outline" onClick={() => { navigator.clipboard?.writeText(successData?.full_url || ""); toaster.create({ title: "Copied", type: "success" }); }}>Copy Domain</Button>
                <Button colorPalette="brand" onClick={() => navigate("/auth/register-success", { state: successData })}>Continue</Button>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </>
  );
}
