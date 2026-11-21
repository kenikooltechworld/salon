import { useState } from "react";
import { Box, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import QRCode from "react-qr-code";
import { api } from "@/lib/api";

export default function MfaPage() {
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const setup = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/mfa/setup");
      setSecret(res.data.secret);
      setQr(res.data.otpauth_uri);
      setBackupCodes(res.data.backup_codes ?? []);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Setup failed");
    } finally {
      setLoading(false);
    }
  };

  const verify = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/mfa/verify", { code });
      setMessage(res.data.message);
      setEnabled(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Verify failed");
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/mfa/disable", { password: "", code });
      setMessage(res.data.message);
      setEnabled(false);
      setSecret("");
      setQr("");
      setBackupCodes([]);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Disable failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={6}>
      <Heading mb={4}>Two-factor authentication</Heading>
      {!secret && !enabled && (
        <Button onClick={setup} loading={loading}>Set up MFA</Button>
      )}
      {secret && !enabled && (
        <Stack gap={3}>
          <Text>Scan this QR code with your authenticator app:</Text>
          {qr && <QRCode value={qr} size={200} />}
          <Text fontSize="sm" color="gray.500">Secret: {secret}</Text>
          {backupCodes.length > 0 && (
            <Box>
              <Text fontWeight="bold">Backup codes (save these):</Text>
              <Text fontSize="sm" fontFamily="mono">{backupCodes.join(", ")}</Text>
            </Box>
          )}
          <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          <Button onClick={verify} loading={loading}>Verify & enable</Button>
        </Stack>
      )}
      {enabled && (
        <Stack gap={3}>
          <Text color="green.500">MFA is enabled.</Text>
          <Input placeholder="6-digit code to disable" value={code} onChange={(e) => setCode(e.target.value)} />
          <Button colorPalette="red" onClick={disable} loading={loading}>Disable MFA</Button>
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
        </Stack>
      )}
    </Box>
  );
}
