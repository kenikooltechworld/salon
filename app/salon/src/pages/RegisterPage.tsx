import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Container, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const load = useAuthStore((s) => s.load);
  const [form, setForm] = useState({
    name: "",
    subdomain: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/register", {
        tenant: { name: form.name, subdomain: form.subdomain, email: form.email },
        user: {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        },
      });
      await api.post("/auth/login", { email: form.email, password: form.password });
      await load();
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Container maxW="sm" py={16}>
      <Heading mb={4}>Register</Heading>
      <form onSubmit={submit}>
        <Stack gap={3}>
          <Input placeholder="Business name" value={form.name} onChange={set("name")} />
          <Input placeholder="Subdomain" value={form.subdomain} onChange={set("subdomain")} />
          <Input placeholder="First name" value={form.first_name} onChange={set("first_name")} />
          <Input placeholder="Last name" value={form.last_name} onChange={set("last_name")} />
          <Input placeholder="Email" value={form.email} onChange={set("email")} />
          <Input type="password" placeholder="Password" value={form.password} onChange={set("password")} />
          {error && <Text color="red.500">{error}</Text>}
          <Button type="submit" loading={loading}>Create account</Button>
          <Text fontSize="sm">
            Have account? <Link to="/login">Login</Link>
          </Text>
        </Stack>
      </form>
    </Container>
  );
}
