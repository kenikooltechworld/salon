import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { toaster } from "@/components/ui/toaster";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { getApiErrorMessage, validatePassword } from "@/lib/utils/auth-validation";

export default function ChangePasswordRequiredPage() {
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setFieldError = (name: string, value: string) => {
    let msg = "";
    if (name === "newPassword") msg = !value ? "Password is required" : validatePassword(value) || "";
    if (name === "confirmPassword") msg = !value ? "Please confirm your password" : value !== newPassword ? "Passwords do not match" : "";
    setErrors((p) => { const n = { ...p }; if (msg) n[name] = msg; else delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    const pwErr = validatePassword(newPassword);
    if (!newPassword) next.newPassword = "Password is required"; else if (pwErr) next.newPassword = pwErr;
    if (!confirmPassword) next.confirmPassword = "Please confirm your password"; else if (confirmPassword !== newPassword) next.confirmPassword = "Passwords do not match";
    if (Object.keys(next).length) { setErrors(next); setError("Please fix the highlighted fields."); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/change-password-required", { new_password: newPassword });
      toaster.create({ title: "Success", description: "Password changed successfully.", type: "success" });
      await authService.loadSession();
      navigate("/dashboard");
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to change password");
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
        <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
          <Stack gap="4">
            <Box><Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text><Input type={show ? "text" : "password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFieldError("newPassword", e.target.value); if (confirmPassword) setFieldError("confirmPassword", confirmPassword); }} onBlur={(e) => setFieldError("newPassword", e.target.value)} required disabled={isLoading} borderColor={errors.newPassword ? "red.500" : undefined} aria-invalid={!!errors.newPassword} /><PasswordStrengthIndicator password={newPassword} />{errors.newPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.newPassword}</Text>}</Box>
            <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm Password</Text><Input type={show ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldError("confirmPassword", e.target.value); }} onBlur={(e) => setFieldError("confirmPassword", e.target.value)} required disabled={isLoading} borderColor={errors.confirmPassword ? "red.500" : undefined} aria-invalid={!!errors.confirmPassword} />{errors.confirmPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.confirmPassword}</Text>}</Box>
            <Button variant="ghost" size="sm" alignSelf="flex-start" onClick={() => setShow((v) => !v)}>{show ? "Hide passwords" : "Show passwords"}</Button>
            <Button type="submit" colorPalette="brand" w="full" loading={isLoading}>Update Password</Button>
          </Stack>
        </Box>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}

