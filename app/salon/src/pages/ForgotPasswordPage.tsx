import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { getApiErrorMessage, validateEmail } from "@/lib/utils/auth-validation";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const em = !email.trim() ? "Email is required" : !validateEmail(email) ? "Enter a valid email address" : "";
    setEmailError(em);
    if (em) return;
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() });
      setSuccess(true);
    } catch (err: any) {
      setError(getApiErrorMessage(err, "Failed to send reset email. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Reset Password" subtitle="Enter your email to receive a password reset code" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Box><Alert.Title>Error</Alert.Title><Alert.Description>{error}</Alert.Description></Box></Alert.Root>}
        {success && <Alert.Root status="success" mb="6"><Alert.Indicator /><Box><Alert.Title>Success</Alert.Title><Alert.Description>Password reset code sent to your email. Check your inbox and spam folder.</Alert.Description></Box></Alert.Root>}
        {!success ? (
          <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">Email Address</Text>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(!e.target.value.trim() ? "Email is required" : !validateEmail(e.target.value) ? "Enter a valid email address" : ""); }} onBlur={(e) => { setEmailError(!e.target.value.trim() ? "Email is required" : !validateEmail(e.target.value) ? "Enter a valid email address" : ""); }} disabled={isLoading} borderColor={emailError ? "red.500" : undefined} aria-invalid={!!emailError} required />
                {emailError && <Text fontSize="xs" color="red.500" mt="1">{emailError}</Text>}
              </Box>
              <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || !email.trim()}>
                {isLoading ? "Sending..." : "Send Reset Code"}
              </Button>
            </Stack>
          </Box>
        ) : (
          <Stack gap="4">
            <Text fontSize="sm" color="fg.muted">Didn't receive the email? Check your spam folder or try again.</Text>
            <Button variant="outline" w="full" onClick={() => { setSuccess(false); setEmail(""); }}>Try Again</Button>
          </Stack>
        )}
        <Text mt="6" pt="6" borderTopWidth="1px" textAlign="center" fontSize="sm">
          <Link to="/auth/login"><Text as="span" color="brand.500">Back to Sign In</Text></Link>
        </Text>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}


