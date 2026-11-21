import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Box, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const me = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      setAuth(data.access_token, me.data.user, me.data.tenant);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt={16} p={6}>
      <Heading mb={4}>Login</Heading>
      <form onSubmit={submit}>
        <Stack gap={3}>
          <Input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Text color="red.500">{error}</Text>}
          <Button type="submit" loading={loading}>Sign in</Button>
          <Text fontSize="sm">
            No account? <Link to="/register">Register</Link>
          </Text>
        </Stack>
      </form>
    </Box>
  );
}
