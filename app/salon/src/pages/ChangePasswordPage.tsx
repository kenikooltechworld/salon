import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { getApiErrorMessage, validatePassword } from "@/lib/utils/auth-validation";

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [show, setShow] = useState(false);

  const setFieldError = (name: string, value: string) => {
    let msg = "";
    if (name === "currentPassword") msg = !value ? "Current password is required" : "";
    if (name === "newPassword") msg = !value ? "New password is required" : validatePassword(value) || (value === currentPassword ? "New password must be different from current password" : "");
    if (name === "confirmPassword") msg = !value ? "Please confirm your new password" : value !== newPassword ? "New passwords do not match" : "";
    setErrors((p) => { const n = { ...p }; if (msg) n[name] = msg; else delete n[name]; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "Current password is required";
    const pwErr = validatePassword(newPassword);
    if (!newPassword) next.newPassword = "New password is required";
    else if (pwErr) next.newPassword = pwErr;
    else if (newPassword === currentPassword) next.newPassword = "New password must be different from current password";
    if (!confirmPassword) next.confirmPassword = "Please confirm your new password";
    else if (confirmPassword !== newPassword) next.confirmPassword = "New passwords do not match";
    if (Object.keys(next).length) { setErrors(next); setError("Please fix the highlighted fields."); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/change-password", { current_password: currentPassword, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to change password. Please try again."));
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
          <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
            <Stack gap="4">
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Current Password</Text><Input type={show ? "text" : "password"} value={currentPassword} onChange={(e) => { setCurrentPassword(e.target.value); setFieldError("currentPassword", e.target.value); setFieldError("newPassword", newPassword); }} onBlur={(e) => setFieldError("currentPassword", e.target.value)} required disabled={isLoading} borderColor={errors.currentPassword ? "red.500" : undefined} aria-invalid={!!errors.currentPassword} />{errors.currentPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.currentPassword}</Text>}</Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text><Input type={show ? "text" : "password"} value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setFieldError("newPassword", e.target.value); if (confirmPassword) setFieldError("confirmPassword", confirmPassword); }} onBlur={(e) => setFieldError("newPassword", e.target.value)} required disabled={isLoading} borderColor={errors.newPassword ? "red.500" : undefined} aria-invalid={!!errors.newPassword} /><PasswordStrengthIndicator password={newPassword} />{errors.newPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.newPassword}</Text>}</Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm New Password</Text><Input type={show ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldError("confirmPassword", e.target.value); }} onBlur={(e) => setFieldError("confirmPassword", e.target.value)} required disabled={isLoading} borderColor={errors.confirmPassword ? "red.500" : undefined} aria-invalid={!!errors.confirmPassword} />{errors.confirmPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.confirmPassword}</Text>}</Box>
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

