import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { toaster } from "@/components/ui/toaster";

export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (newPassword.length < 8) { setError("Password must be at least 8 characters long"); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/change-password-required", { new_password: newPassword });
      toaster.create({ title: "Success", description: "Password changed successfully.", type: "success" });
      await authService.loadSession();
      navigate("/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to change password";
      setError(msg);
      toaster.create({ title: "Error", description: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Change Password Required" subtitle="Set a new password to continue" />
        <Alert.Root status="warning" mb="6"><Alert.Indicator /><Box><Alert.Title>Required Action</Alert.Title><Alert.Description>For security reasons, you must set a new password before continuing.</Alert.Description></Box></Alert.Root>
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap="4">
            <Box><Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text><Input type={show ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isLoading} /></Box>
            <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm Password</Text><Input type={show ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} /></Box>
            <Button variant="ghost" size="sm" alignSelf="flex-start" onClick={() => setShow((v) => !v)}>{show ? "Hide passwords" : "Show passwords"}</Button>
            <Button type="submit" colorPalette="brand" w="full" loading={isLoading}>Update Password</Button>
          </Stack>
        </Box>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
