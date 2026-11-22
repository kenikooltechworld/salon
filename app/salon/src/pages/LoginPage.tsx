import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Button, Heading, Input, VStack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { authService } from "@/features/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/login", { email, password });
      await authService.loadSession();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={16}>
      <Heading mb={4}>Login</Heading>
      <VStack as="form" onSubmit={submit} gap={3} align="stretch">
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Text color="red.500">{error}</Text>}
          <Button type="submit" loading={loading}>Sign in</Button>
          <Text fontSize="sm">
            No account? <Link to="/register">Register</Link>
          </Text>
      </VStack>
    </Container>
  );
}
