import { useState } from "react";
import { Alert, Box, Button, Card, Heading , Input, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import QRCode from "react-qr-code";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";

export default function MfaPage() {
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState<"idle" | "verify" | "complete">("idle");

  const setup = async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      const res = await api.post("/auth/mfa/setup");
      setSecret(res.data.secret); setQr(res.data.qr_code || res.data.otpauth_uri); setBackupCodes(res.data.backup_codes ?? []);
      setStep("verify");
    } catch (err: any) { setError(err?.response?.data?.detail || "Setup failed"); }
    finally { setLoading(false); }
  };

  const verify = async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      await api.post("/auth/mfa/verify", { code });
      setEnabled(true); setStep("complete"); setMessage("MFA enabled successfully.");
    } catch (err: any) { setError(err?.response?.data?.detail || "Invalid code"); }
    finally { setLoading(false); }
  };

  const disable = async () => {
    setLoading(true); setError(""); setMessage("");
    try {
      const password = window.prompt("Enter your password to disable MFA") || "";
      await api.post("/auth/mfa/disable", { password, code });
      setEnabled(false); setStep("idle"); setQr(""); setSecret(""); setBackupCodes([]); setCode(""); setMessage("MFA disabled.");
    } catch (err: any) { setError(err?.response?.data?.detail || "Disable failed"); }
    finally { setLoading(false); }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Two-Factor Authentication" subtitle="Secure your account with an additional verification step" />
        {error && <Alert.Root status="error" mb="4"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
        {message && <Alert.Root status="success" mb="4"><Alert.Indicator /><Alert.Description>{message}</Alert.Description></Alert.Root>}
        {step === "idle" && !enabled && <Button colorPalette="brand" onClick={setup} loading={loading}>Set up MFA</Button>}
        {step === "verify" && (
          <VStack align="stretch" gap="4">
            <Text>Scan this QR code with your authenticator app, then enter the 6-digit code.</Text>
            {qr && <Box bg="white" p="3" rounded="md" alignSelf="center"><QRCode value={qr} size={180} /></Box>}
            <Text fontSize="xs" color="fg.muted">Secret: {secret}</Text>
            {backupCodes.length > 0 && (
              <Box>
                <Heading size="sm" mb="2">Backup codes (save these)</Heading>
                <SimpleGrid columns={2} gap="2">{backupCodes.map((c) => <Box key={c} fontFamily="mono" fontSize="sm" bg="bg.muted" p="2" rounded="md">{c}</Box>)}</SimpleGrid>
              </Box>
            )}
            <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
            <Button colorPalette="brand" onClick={verify} loading={loading} disabled={code.length !== 6}>Verify & Enable</Button>
          </VStack>
        )}
        {(step === "complete" || enabled) && (
          <VStack align="stretch" gap="4">
            <Text color="green.600" fontWeight="medium">MFA is enabled on your account.</Text>
            <Input placeholder="6-digit code to disable" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} />
            <Button colorPalette="red" variant="outline" onClick={disable} loading={loading}>Disable MFA</Button>
          </VStack>
        )}
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}

