import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Button, Card, Heading, Text, VStack } from "@chakra-ui/react";
import { LuCircleCheck } from "react-icons/lu";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { TrustIndicators } from "@/components/auth/TrustIndicators";
import { toaster } from "@/components/ui/toaster";

export default function RegisterSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState(5);
  const subdomain = (location.state as any)?.subdomain || "";
  const fullUrl = (location.state as any)?.full_url || subdomain;

  useEffect(() => {
    if (!subdomain && !fullUrl) { navigate("/auth/register"); return; }
  }, [subdomain, fullUrl, navigate]);

  useEffect(() => {
    if (countdown <= 0) { navigate("/dashboard"); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl || subdomain);
      toaster.create({ title: "Copied", description: "Subdomain copied to clipboard", type: "success" });
    } catch {
      toaster.create({ title: "Copy failed", type: "error" });
    }
  };

  if (!subdomain && !fullUrl) return null;
  return (
    <Card.Root shadow="lg">
      <Card.Body p={{ base: "6", md: "10" }}>
        <AuthHeader title="🎉 Welcome to Kenikool!" subtitle="Your salon account has been created successfully" />
        <VStack gap="6" align="stretch">
          <Box display="flex" justifyContent="center" color="green.500"><LuCircleCheck size={64} /></Box>
          <Box bg="bg.muted" p="5" rounded="lg">
            <Text fontSize="sm" color="fg.muted" mb="2">Your Salon URL:</Text>
            <Text fontSize="lg" fontFamily="mono" fontWeight="semibold" wordBreak="break-all" mb="4">{fullUrl}</Text>
            <Button variant="outline" size="sm" w="full" onClick={copy}>Copy Subdomain URL</Button>
          </Box>
          <Box bg="brand.50" _dark={{ bg: "brand.900/30" }} borderWidth="1px" borderColor="brand.200" p="4" rounded="lg">
            <Text fontSize="sm" fontWeight="medium" color="brand.700" _dark={{ color: "brand.200" }} mb="1">🎁 30-Day Free Trial</Text>
            <Text fontSize="sm" color="fg.muted">Your trial subscription is active. You have access to trial features for 30 days. No credit card required.</Text>
          </Box>
          <Box>
            <Heading size="sm" mb="2">Quick Start Guide:</Heading>
            <VStack align="stretch" gap="1" fontSize="sm" color="fg.muted">
              <Text>1. Add your staff members</Text>
              <Text>2. Create your services and pricing</Text>
              <Text>3. Set your working hours</Text>
              <Text>4. Share your salon URL with customers</Text>
            </VStack>
          </Box>
          <Button colorPalette="brand" size="lg" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
          <Text fontSize="xs" color="fg.muted" textAlign="center">Redirecting in {countdown}s...</Text>
        </VStack>
        <TrustIndicators />
      </Card.Body>
    </Card.Root>
  );
}

