import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Button, Heading, Input, VStack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";

const schema = z.object({ code: z.string().length(6, "Code must be 6 digits") });
type Form = z.infer<typeof schema>;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const submit = async (data: Form) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/verify-email", { code: data.code });
      setMessage(res.data.message);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/send-verification");
      setMessage(res.data.message);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="sm" py={16}>
      <Heading mb={4}>Verify email</Heading>
      <VStack as="form" onSubmit={handleSubmit(submit)} gap={3} align="stretch">
          <Input placeholder="6-digit code from email" {...register("code")} />
          {errors.code && <Text color="red.500" fontSize="sm">{errors.code.message}</Text>}
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button type="submit" loading={loading}>Verify</Button>
          <Button variant="outline" onClick={resend} loading={loading}>Resend code</Button>
      </VStack>
    </Container>
  );
}
