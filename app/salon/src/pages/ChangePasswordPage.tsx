import { useState } from "react";
import { Container, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";

const schema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});
type Form = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const submit = async (data: Form) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/change-password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={16}>
      <Heading mb={4}>Change password</Heading>
      <form onSubmit={handleSubmit(submit)}>
        <Stack gap={3}>
          <Input type="password" placeholder="Current password" {...register("current_password")} />
          {errors.current_password && <Text color="red.500" fontSize="sm">{errors.current_password.message}</Text>}
          <Input type="password" placeholder="New password" {...register("new_password")} />
          {errors.new_password && <Text color="red.500" fontSize="sm">{errors.new_password.message}</Text>}
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button type="submit" loading={loading}>Change password</Button>
        </Stack>
      </form>
    </Container>
  );
}
