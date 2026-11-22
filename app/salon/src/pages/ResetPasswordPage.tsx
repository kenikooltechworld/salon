import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState(searchParams.get("code") ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const pwdErr = validatePassword(password);
    if (pwdErr) { setError(pwdErr); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setIsLoading(true);
    try {
      await api.post("/auth/reset-password", { email, code, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/auth/login"), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to reset password. Please try again.");
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
          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap="4">
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Email</Text><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} /></Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Reset Code</Text><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" required disabled={isLoading} maxLength={6} /></Box>
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">New Password</Text>
                <Box position="relative">
                  <Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} pr="16" />
                  <Button variant="ghost" size="xs" position="absolute" right="2" top="50%" transform="translateY(-50%)" onClick={() => setShowPassword((v) => !v)}>{showPassword ? "Hide" : "Show"}</Button>
                </Box>
                <Text fontSize="xs" color="fg.muted" mt="1">At least 8 characters with uppercase, lowercase, number, and special character</Text>
              </Box>
              <Box><Text fontSize="sm" fontWeight="medium" mb="2">Confirm Password</Text><Input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} /></Box>
              <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || !email || !code || !password || !confirmPassword}>Reset Password</Button>
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
