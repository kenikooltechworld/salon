import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert, Box, Button, Card, Checkbox, HStack, IconButton, Input, Stack, Text,
} from "@chakra-ui/react";
import { LuEye, LuEyeOff } from "react-icons/lu";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { getApiErrorMessage, validateEmail } from "@/lib/utils/auth-validation";
import { toaster } from "@/components/ui/toaster";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    setIsFormValid(!!(email.trim() && password && validateEmail(email) && !emailError && !passwordError));
  }, [email, password, emailError, passwordError]);

  const handleEmailChange = (value: string) => {
    setEmail(value);
    const v = value.trim();
    setEmailError(!v ? "Email is required" : !validateEmail(v) ? "Enter a valid email address" : "");
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordError(!value ? "Password is required" : "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = !email.trim() ? "Email is required" : !validateEmail(email) ? "Enter a valid email address" : "";
    const pw = !password ? "Password is required" : "";
    setEmailError(em);
    setPasswordError(pw);
    if (em || pw) { setError("Please fix the highlighted fields."); return; }
    setIsLoading(true);
    try {
      const res = await api.post("/auth/login", { email: email.trim().toLowerCase(), password, rememberMe });
      if (res.data?.mfa_required) {
        localStorage.setItem("mfaEmail", email.trim().toLowerCase());
        navigate("/auth/mfa/verify");
        return;
      }
      await authService.loadSession();
      if (res.data?.password_change_required) { navigate("/auth/change-password-required"); return; }
      toaster.create({ title: "Welcome back", type: "success" });
      navigate("/dashboard");
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const requiresVerification =
        (typeof detail === "object" && detail?.requires_verification) ||
        detail?.code === "EMAIL_NOT_VERIFIED" ||
        String(detail?.message || detail || "").toLowerCase().includes("verification");
      const verifyEmail = (typeof detail === "object" && detail?.email) || email.trim().toLowerCase();
      if (requiresVerification) {
        toaster.create({
          title: "Email verification required",
          description: "Please verify your email. You can resend a new code.",
          type: "warning",
        });
        navigate(`/auth/verify?email=${encodeURIComponent(verifyEmail)}`);
        return;
      }
      const msg = getApiErrorMessage(err, "Failed to login. Please try again.");
      setError(msg);
      toaster.create({ title: "Login Failed", description: msg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Welcome Back" subtitle="Sign in to your salon account to continue" />
        {error && (
          <Alert.Root status="error" mb="6">
            <Alert.Indicator />
            <Box>
              <Alert.Title>Login Failed</Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Box>
          </Alert.Root>
        )}
        <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
          <Stack gap="4">
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Email Address</Text>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={(e) => handleEmailChange(e.target.value)}
                disabled={isLoading}
                borderColor={emailError ? "red.500" : email && validateEmail(email) ? "green.500" : undefined}
                aria-invalid={!!emailError}
                required
              />
              {emailError && <Text fontSize="xs" color="red.500" mt="1">{emailError}</Text>}
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Password</Text>
              <Box position="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  onBlur={(e) => handlePasswordChange(e.target.value)}
                  disabled={isLoading}
                  pr="10"
                  borderColor={passwordError ? "red.500" : undefined}
                  aria-invalid={!!passwordError}
                  required
                />
                <IconButton
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  variant="ghost"
                  size="sm"
                  position="absolute"
                  right="1"
                  top="50%"
                  transform="translateY(-50%)"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={isLoading}
                >
                  {showPassword ? <LuEyeOff /> : <LuEye />}
                </IconButton>
              </Box>
              {passwordError && <Text fontSize="xs" color="red.500" mt="1">{passwordError}</Text>}
            </Box>
            <HStack justify="space-between" fontSize="sm">
              <Checkbox.Root checked={rememberMe} onCheckedChange={(e) => setRememberMe(!!e.checked)} disabled={isLoading}>
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>Remember me</Checkbox.Label>
              </Checkbox.Root>
              <Link to="/auth/forgot-password"><Text color="brand.500" _hover={{ textDecoration: "underline" }}>Forgot password?</Text></Link>
            </HStack>
            <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || !isFormValid}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </Stack>
        </Box>
        <Text mt="6" textAlign="center" fontSize="sm" color="fg.muted">
          Don't have an account?{" "}
          <Link to="/auth/register"><Text as="span" color="brand.500" fontWeight="medium">Create one</Text></Link>
        </Text>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}



