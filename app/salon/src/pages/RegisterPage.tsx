import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Card, Input, Stack, Text, Textarea } from "@chakra-ui/react";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { useRegisterSalon, type RegistrationData } from "@/hooks/useRegistration";
import { toaster } from "@/components/ui/toaster";
import { getApiErrorMessage, validateEmail, validatePassword, validatePhone } from "@/lib/utils/auth-validation";

export default function RegisterPage() {
  const navigate = useNavigate();
  const registerMutation = useRegisterSalon();
  const [error, setError] = useState("");
  const [form, setForm] = useState<RegistrationData & { showPassword: boolean }>({
    salon_name: "", owner_name: "", email: "", phone: "", password: "", address: "", bank_account: "", referral_code: "", showPassword: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (name: string, value: string) => {
    const v = value.trim();
    if (name === "email") return !v ? "Email is required" : !validateEmail(v) ? "Enter a valid email address" : "";
    if (name === "phone") return !v ? "Phone number is required" : !validatePhone(v) ? "Enter a valid phone number (7-20 digits, optional +)" : "";
    if (name === "salon_name") return !v ? "Salon name is required" : v.length < 3 ? "Salon name must be at least 3 characters" : v.length > 255 ? "Salon name is too long" : "";
    if (name === "owner_name") return !v ? "Owner name is required" : v.length < 2 ? "Owner name must be at least 2 characters" : v.length > 255 ? "Owner name is too long" : "";
    if (name === "password") return !value ? "Password is required" : validatePassword(value) || "";
    if (name === "address") return !v ? "Address is required" : v.length < 5 ? "Address must be at least 5 characters" : v.length > 500 ? "Address is too long" : "";
    if (name === "bank_account") return v.length > 50 ? "Bank account is too long" : "";
    if (name === "referral_code") return v.length > 64 ? "Referral code is too long" : "";
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
    ["salon_name","owner_name","email","phone","password","address","bank_account","referral_code"].forEach((k) => { const m = validate(k, String((form as any)[k] ?? "")); if (m) next[k]=m; });
    if (Object.keys(next).length) { setErrors(next); setError("Please fix the highlighted fields."); return; }
    try {
      const { showPassword: _s, ...payload } = form;
      const normalized = {
        ...payload,
        salon_name: payload.salon_name.trim(),
        owner_name: payload.owner_name.trim(),
        email: payload.email.trim().toLowerCase(),
        phone: payload.phone.replace(/[\s\-()]/g, "").trim(),
        address: payload.address.trim(),
        bank_account: payload.bank_account?.trim() || undefined,
        referral_code: payload.referral_code?.trim() || undefined,
      };
      const response = await registerMutation.mutateAsync(normalized);
      if (response?.success !== false) {
        const pending = response?.data?.pending_verification || response?.data?.requires_verification;
        toaster.create({
          title: pending ? "Verification pending" : "Verification code sent",
          description: pending
            ? "This email is already pending verification. We sent a new code."
            : "Check your email for the 6-digit code.",
          type: pending ? "warning" : "success",
        });
        navigate(`/auth/verify?email=${encodeURIComponent(normalized.email)}`);
      }
    } catch (err: any) {
      const msg = getApiErrorMessage(err, "Failed to register. Please try again.");
      setError(msg);
      toaster.create({ title: "Registration Failed", description: msg, type: "error" });
    }
  };

  const field = (name: keyof typeof form, label: string, type = "text", placeholder = "", required = false) => (
    <Box>
      <Text fontSize="sm" fontWeight="medium" mb="2">{label}</Text>
      <Input type={type} value={String((form as any)[name] ?? "")} onChange={(e) => onChange(name, e.target.value)} onBlur={(e) => onChange(name, e.target.value)} placeholder={placeholder} disabled={registerMutation.isPending} borderColor={errors[name] ? "red.500" : undefined} aria-invalid={!!errors[name]} required={required} />
      {errors[name] && <Text fontSize="xs" color="red.500" mt="1">{errors[name]}</Text>}
    </Box>
  );

  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="Create Your Salon Account" subtitle="Join thousands of salon owners managing their business with Kenikool" />
        {error && <Alert.Root status="error" mb="6"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
        <Box as="form" onSubmit={handleSubmit} {...({ noValidate: true } as any)}>
          <Stack gap="4">
            {field("salon_name", "Salon Name *", "text", "Enter your salon name", true)}
            {field("owner_name", "Owner Name *", "text", "Enter your full name", true)}
            {field("email", "Email *", "email", "your@email.com", true)}
            {field("phone", "Phone *", "text", "+234 123 456 7890", true)}
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Password *</Text>
              <Box position="relative">
                <Input type={form.showPassword ? "text" : "password"} value={form.password} onChange={(e) => onChange("password", e.target.value)} onBlur={(e) => onChange("password", e.target.value)} placeholder="Min 8 chars, upper, lower, number, special char" disabled={registerMutation.isPending} pr="16" borderColor={errors.password ? "red.500" : undefined} aria-invalid={!!errors.password} required />
                <Button variant="ghost" size="xs" position="absolute" right="2" top="50%" transform="translateY(-50%)" onClick={() => onChange("showPassword", !form.showPassword)}>
                  {form.showPassword ? "Hide" : "Show"}
                </Button>
              </Box>
              <PasswordStrengthIndicator password={form.password} />
              {errors.password && <Text fontSize="xs" color="red.500" mt="1">{errors.password}</Text>}
            </Box>
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb="2">Address *</Text>
              <Textarea value={form.address} onChange={(e) => onChange("address", e.target.value)} onBlur={(e) => onChange("address", e.target.value)} placeholder="Enter your salon address" disabled={registerMutation.isPending} borderColor={errors.address ? "red.500" : undefined} aria-invalid={!!errors.address} required />
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

