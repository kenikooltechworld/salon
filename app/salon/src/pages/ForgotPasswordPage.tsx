import { useState } from "react";
import { Link } from "react-router-dom";
import { Container, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";

const schema = z.object({ email: z.string().email() });
type Form = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const submit = async (data: Form) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/forgot-password", { email: data.email });
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={16}>
      <Heading mb={4}>Forgot password</Heading>
      <form onSubmit={handleSubmit(submit)}>
        <Stack gap={3}>
          <Input placeholder="Email" {...register("email")} />
          {errors.email && <Text color="red.500" fontSize="sm">{errors.email.message}</Text>}
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button type="submit" loading={loading}>Send reset code</Button>
          <Text fontSize="sm">
            <Link to="/login">Back to login</Link>
          </Text>
        </Stack>
      </form>
    </Container>
  );
}
