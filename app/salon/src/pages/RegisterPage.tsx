import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { useRegisterSalon, type RegistrationData } from "@/hooks/useRegistration";
import { toaster } from "@/components/ui/toaster";

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterSalon();
  const [error, setError] = useState("");
  const [form, setForm] = useState<RegistrationData & { showPassword: boolean }>({
    salon_name: "", owner_name: "", email: "", phone: "", password: "", address: "", bank_account: "", referral_code: "", showPassword: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (name: string, value: string) => {
    if (name === "email") return !value ? "Email is required" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Invalid email format" : "";
    if (name === "phone") return !value ? "Phone is required" : !/^\+?[0-9]{7,15}$/.test(value.replace(/\s/g, "")) ? "Invalid phone format" : "";
    if (name === "salon_name") return !value ? "Salon name is required" : value.length < 3 ? "Salon name must be at least 3 characters" : "";
    if (name === "owner_name") return !value ? "Owner name is required" : value.length < 2 ? "Owner name must be at least 2 characters" : "";
    if (name === "password") return !value ? "Password is required" : !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(value) ? "Password must be at least 8 chars with upper, lower, number, special char" : "";
    if (name === "address") return !value ? "Address is required" : value.length < 5 ? "Address must be at least 5 characters" : "";
    return "";
  };

  const onChange = (name: keyof typeof form, value: string | boolean) => {
    setForm((p) => ({ ...p, [name]: value } as any));
    if (typeof value === "string") {
      const msg = validate(name, value);
      setErrors((p) => { const n = { ...p }; if (msg) n[name] = msg; else delete n[name]; return n; });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const next: Record<string, string> = {};
    ["salon_name","owner_name","email","phone","password","address"].forEach((k) => { const m = validate(k, (form as any)[k]); if (m) next[k]=m; });
    if (Object.keys(next).length) { setErrors(next); return; }
    try {
      const { showPassword: _s, ...payload } = form;
      const response = await registerMutation.mutateAsync(payload);
      if (response?.success !== false) {
        toaster.create({ title: "Registration successful", description: "Your salon account is ready.", type: "success" });
        navigate("/auth/register-success", { state: { subdomain: (response as any)?.data?.tenant?.subdomain, full_url: (response as any)?.data?.tenant?.subdomain, tenant_id: (response as any)?.data?.tenant?.id } });
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const msg = Array.isArray(detail) ? detail.map((d: any) => `${Array.isArray(d.loc) ? d.loc.at(-1) : "Field"}: ${d.msg}`).join(", ") : (typeof detail === "string" ? detail : err?.message || "Failed to register. Please try again.");
      setError(msg);
      toaster.create({ title: "Registration Failed", description: msg, type: "error" });
    }
  };

  const field = (name: keyof typeof form, label: string, type = "text", placeholder = "") => (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb="2">{label}</Text>
      <Input type={type} value={(form as any)[name]} onChange={(e) => onChange(name, e.target.value)} placeholder={placeholder} disabled={registerMutation.isPending} borderColor={errors[name] ? "red.500" : undefined} />
      {errors[name] && <Text fontSize="xs" color="red.500" mt="1">{errors[name]}</Text>}
    </Box>
  );

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Create Your Salon Account" subtitle="Join thousands of salon owners managing their business with Kenikool" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap="4">
            {field("salon_name", "Salon Name *", "text", "Enter your salon name")}
            {field("owner_name", "Owner Name *", "text", "Enter your full name")}
            {field("email", "Email *", "email", "your@email.com")}
            {field("phone", "Phone *", "text", "+234 123 456 7890")}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Password *</Text>
              <Box position="relative">
                <Input type={form.showPassword ? "text" : "password"} value={form.password} onChange={(e) => onChange("password", e.target.value)} placeholder="Min 8 chars, upper, lower, number, special char" disabled={registerMutation.isPending} pr="16" borderColor={errors.password ? "red.500" : undefined} />
                <Button variant="ghost" size="xs" position="absolute" right="2" top="50%" transform="translateY(-50%)" onClick={() => onChange("showPassword", !form.showPassword)}>
                  {form.showPassword ? "Hide" : "Show"}
                </Button>
              </Box>
              <PasswordStrengthIndicator password={form.password} />
              {errors.password && <Text fontSize="xs" color="red.500" mt="1">{errors.password}</Text>}
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Address *</Text>
              <Textarea value={form.address} onChange={(e) => onChange("address", e.target.value)} placeholder="Enter your salon address" disabled={registerMutation.isPending} borderColor={errors.address ? "red.500" : undefined} />
              {errors.address && <Text fontSize="xs" color="red.500" mt="1">{errors.address}</Text>}
            </Box>
            {field("bank_account", "Bank Account (Optional)", "text", "Bank account number")}
            {field("referral_code", "Referral Code (Optional)", "text", "Referral code")}
            <Button type="submit" colorPalette="brand" w="full" loading={registerMutation.isPending}>Create Account</Button>
          </Stack>
        </Box>
        <Text mt="6" textAlign="center" fontSize="sm" color="fg.muted">
          Already have an account? <Link to="/auth/login"><Text as="span" color="brand.500" fontWeight="medium">Sign in</Text></Link>
        </Text>
        <Box mt="6" pt="6" borderTopWidth="1px">
          <Text fontSize="xs" color="fg.muted" textAlign="center">
            By creating an account, you agree to our <Text as="span" color="brand.500">Terms of Service</Text> and <Text as="span" color="brand.500">Privacy Policy</Text>
          </Text>
        </Box>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}
