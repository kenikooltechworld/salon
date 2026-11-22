import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";

const validatePassword = (pwd: string) => {
  if (pwd.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pwd)) return "Password must contain an uppercase letter";
  if (!/[a-z]/.test(pwd)) return "Password must contain a lowercase letter";
  if (!/[0-9]/.test(pwd)) return "Password must contain a number";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Password must contain a special character";
  return null;
};

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwdErr = validatePassword(newPassword);
    if (pwdErr) { setError(pwdErr); return; }
    if (newPassword !== confirmPassword) { setError("New passwords do not match"); return; }
    if (currentPassword === newPassword) { setError("New password must be different from current password"); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to change password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Change Password" subtitle="Update your account password" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        {success && <Alert.Root status="success" mb="6"><Alert.Indicator /><Box><Alert.Title>Success</Alert.Title><Alert.Description>Password changed successfully. Redirecting...</Alert.Description></Box></Alert.Root>}
        {!success && (
          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap="4">
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Current Password</Text><Input type={show ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isLoading} /></Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text><Input type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isLoading} /></Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm New Password</Text><Input type={show ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} /></Box>
              <Button variant="ghost" size="sm" alignSelf="flex-start" onClick={() => setShow((v) => !v)}>{show ? "Hide passwords" : "Show passwords"}</Button>
              <Button type="submit" colorPalette="brand" w="full" loading={isLoading}>Change Password</Button>
            </Stack>
          </Box>
        )}
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
