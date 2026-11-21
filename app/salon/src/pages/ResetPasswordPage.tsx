import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Box, Button, Heading, Input, Stack, Text } from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});
type Form = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: searchParams.get("email") ?? "" },
  });

  const submit = async (data: Form) => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await api.post("/auth/reset-password", {
        email: data.email,
        code: data.code,
        new_password: data.new_password,
      });
      setMessage(res.data.message);
      setTimeout(() => navigate("/login"), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="sm" mx="auto" mt={16} p={6}>
      <Heading mb={4}>Reset password</Heading>
      <form onSubmit={handleSubmit(submit)}>
        <Stack gap={3}>
          <Input placeholder="Email" {...register("email")} />
          {errors.email && <Text color="red.500" fontSize="sm">{errors.email.message}</Text>}
          <Input placeholder="6-digit code" {...register("code")} />
          {errors.code && <Text color="red.500" fontSize="sm">{errors.code.message}</Text>}
          <Input type="password" placeholder="New password" {...register("new_password")} />
          {errors.new_password && <Text color="red.500" fontSize="sm">{errors.new_password.message}</Text>}
          {message && <Text color="green.500" fontSize="sm">{message}</Text>}
          {error && <Text color="red.500" fontSize="sm">{error}</Text>}
          <Button type="submit" loading={loading}>Reset password</Button>
          <Text fontSize="sm">
            <Link to="/login">Back to login</Link>
          </Text>
        </Stack>
      </form>
    </Box>
  );
}
