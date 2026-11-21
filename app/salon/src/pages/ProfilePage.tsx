import { useEffect, useState } from "react";
import { Box, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export default function ProfilePage() {
  const { user, load } = useAuthStore();
  const [form, setForm] = useState({ first_name: "", last_name: "", phone: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm({ first_name: user.first_name, last_name: user.last_name, phone: "" });
  }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.put("/auth/me", form);
      await load();
      setMessage("Profile updated");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt={8} p={6}>
      <Heading mb={4}>Profile</Heading>
      <form onSubmit={submit}>
        <Stack gap={3}>
          <Input placeholder="First name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <Input placeholder="Last name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <Input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button type="submit" loading={loading}>Save</Button>
        </Stack>
      </form>
    </Box>
  );
}
