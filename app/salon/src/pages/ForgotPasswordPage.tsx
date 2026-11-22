import { useState } from "react";
import { Link } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Failed to send reset email. Please try again.");
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
          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap="4">
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb="2">Email Address</Text>
                <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
              </Box>
              <Button type="submit" colorPalette="brand" w="full" loading={isLoading} disabled={isLoading || !email}>
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
