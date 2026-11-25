import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { getApiErrorMessage, validateEmail, validatePassword } from "@/lib/utils/auth-validation";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState((searchParams.get("code") ?? "").replace(/\D/g, "").slice(0, 6));
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateField = (name: string, value: string) => {
    if (name === "email") return !value.trim() ? "Email is required" : !validateEmail(value) ? "Enter a valid email address" : "";
    if (name === "code") return !value ? "Reset code is required" : !/^\d{6}$/.test(value) ? "Code must be 6 digits" : "";
    if (name === "password") return !value ? "Password is required" : validatePassword(value) || "";
    if (name === "confirmPassword") return !value ? "Please confirm your password" : value !== password ? "Passwords do not match" : "";
    return "";
  };

  const setFieldError = (name: string, value: string) => {
    const msg = validateField(name, value);
    setErrors((p) => { const n = { ...p }; if (msg) n[name] = msg; else delete n[name]; return n; });
  };

  const isFormValid = useMemo(() => {
    return validateEmail(email) && /^\d{6}$/.test(code) && !validatePassword(password) && confirmPassword === password;
  }, [email, code, password, confirmPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    [["email", email], ["code", code], ["password", password], ["confirmPassword", confirmPassword]].forEach(([k, v]) => { const m = validateField(k, v); if (m) next[k] = m; });
    if (Object.keys(next).length) { setErrors(next); setError("Please fix the highlighted fields."); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email: email.trim().toLowerCase(), code, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to reset password. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Create New Password" subtitle="Enter your reset code and a strong new password" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        {success && <Alert.Root status="success" mb="6"><Alert.Indicator /><Box><Alert.Title>Success</Alert.Title><Alert.Description>Password reset successfully. Redirecting to login...</Alert.Description></Box></Alert.Root>}
        {!success && (
          <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
            <Stack gap="4">
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Email</Text><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldError("email", e.target.value); }} onBlur={(e) => setFieldError("email", e.target.value)} required disabled={isLoading} borderColor={errors.email ? "red.500" : undefined} aria-invalid={!!errors.email} />{errors.email && <Text fontSize="xs" color="red.500" mt="1">{errors.email}</Text>}</Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Reset Code</Text><Input value={code} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 6); setCode(v); setFieldError("code", v); }} onBlur={(e) => setFieldError("code", e.target.value)} placeholder="6-digit code" required disabled={isLoading} maxLength={6} inputMode="numeric" borderColor={errors.code ? "red.500" : undefined} aria-invalid={!!errors.code} />{errors.code && <Text fontSize="xs" color="red.500" mt="1">{errors.code}</Text>}</Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text>
                <Box position="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setFieldError("password", e.target.value); if (confirmPassword) setFieldError("confirmPassword", confirmPassword); }} onBlur={(e) => setFieldError("password", e.target.value)} required disabled={isLoading} pr="16" borderColor={errors.password ? "red.500" : undefined} aria-invalid={!!errors.password} />
                  <Button variant="ghost" size="xs" position="absolute" right="2" top="50%" transform="translateY(-50%)" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</Button>
                </Box>
                <PasswordStrengthIndicator password={password} />
                {errors.password && <Text fontSize="xs" color="red.500" mt="1">{errors.password}</Text>}
              </Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm Password</Text><Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setFieldError("confirmPassword", e.target.value); }} onBlur={(e) => setFieldError("confirmPassword", e.target.value)} required disabled={isLoading} borderColor={errors.confirmPassword ? "red.500" : undefined} aria-invalid={!!errors.confirmPassword} />{errors.confirmPassword && <Text fontSize="xs" color="red.500" mt="1">{errors.confirmPassword}</Text>}</Box>
              <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || !isFormValid}>Reset Password</Button>
            </Stack>
          </Box>
        )}
        <Text mt="6" pt="6" borderTopWidth="1px" textAlign="center" fontSize="sm">
          <Link to="/auth/login"><Text as="span" color="brand.500">Back to Sign In</Text></Link>
        </Text>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}

