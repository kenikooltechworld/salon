import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Badge, Box, Button, Card, Container, Grid, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { CheckCircleIcon } from "@/components/icons";

const plans = [
  { name: "Free", monthlyPrice: 0, annualPrice: 0, description: "Perfect for trying out", features: ["1 staff member", "50 bookings/month", "Basic client management", "100 clients", "1 location", "Mobile app access", "Basic analytics", "Email support"], cta: "Get Started", highlighted: false },
  { name: "Starter", monthlyPrice: 15000, annualPrice: 153000, description: "Perfect for small salons", features: ["Up to 3 staff members", "Unlimited bookings", "Offline POS system", "500 clients", "Client management", "100 SMS notifications/month", "Email support", "Mobile app access", "Basic analytics", "Custom branding"], cta: "Start Free Trial", highlighted: false },
  { name: "Professional", monthlyPrice: 35000, annualPrice: 357000, description: "Most popular for growing salons", features: ["Up to 10 staff members", "Unlimited bookings", "Full POS with offline mode", "2,000 clients", "Inventory management", "500 SMS notifications/month", "Marketing campaigns", "Loyalty programs", "Advanced analytics", "Priority email support", "Custom branding", "Gift cards & Packages"], cta: "Start Free Trial", highlighted: true },
  { name: "Business", monthlyPrice: 65000, annualPrice: 663000, description: "For established salons", features: ["Up to 25 staff members", "Unlimited bookings", "Unlimited clients", "Full inventory management", "2,000 SMS notifications/month", "Advanced marketing campaigns", "Accounting & Financial reports", "Package management", "Custom domain support", "Priority phone support", "Dedicated account manager", "Advanced security features"], cta: "Start Free Trial", highlighted: false },
  { name: "Enterprise", monthlyPrice: 120000, annualPrice: 1224000, description: "For multi-location salons", features: ["Up to 50 staff members", "Unlimited bookings", "Unlimited clients", "3 locations", "Full inventory management", "5,000 SMS notifications/month", "Advanced marketing campaigns", "Complete accounting suite", "White-label booking pages", "Custom domain support", "Full API access", "Priority 24/7 support", "Custom integrations", "Voice assistant integration"], cta: "Contact Sales", highlighted: false },
  { name: "Unlimited", monthlyPrice: 250000, annualPrice: 2550000, description: "For resellers and agencies", features: ["Unlimited staff members", "Unlimited bookings", "Unlimited clients", "Unlimited locations", "Full inventory management", "Unlimited SMS notifications", "Advanced marketing campaigns", "Complete accounting suite", "White-label everything", "Unlimited custom domains", "Full API access", "Priority 24/7 support", "Custom integrations", "Reseller rights", "Dedicated technical support", "Custom training & onboarding"], cta: "Contact Sales", highlighted: false },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  return (
    <Container maxW="7xl" py={16}>
      <VStack textAlign="center" mb={12} gap={4}>
        <Heading size="2xl">Simple, Transparent Pricing</Heading>
        <Text fontSize="lg" color="fg.muted" maxW="2xl">Choose the perfect plan for your salon business</Text>
        <HStack gap={4} justify="center">
          <Text fontSize="sm" fontWeight="medium" color={!isAnnual ? "fg" : "fg.muted"}>Monthly</Text>
          <Box as="button" onClick={() => setIsAnnual(!isAnnual)} w="14" h="8" bg="bg.muted" rounded="full" position="relative">
            <Box position="absolute" top="1" left={isAnnual ? "7" : "1"} w="6" h="6" bg="purple.500" rounded="full" transition="all 0.2s" />
          </Box>
          <Text fontSize="sm" fontWeight="medium" color={isAnnual ? "fg" : "fg.muted"}>Annual</Text>
          {isAnnual && <Badge colorPalette="purple">Save 20%</Badge>}
        </HStack>
      </VStack>
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={6}>
        {plans.map((plan) => {
          const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
          const savings = isAnnual ? Math.round((plan.monthlyPrice * 12 - plan.annualPrice) / 12) : 0;
          return (
            <Card.Root key={plan.name} h="full" borderWidth={plan.highlighted ? "2px" : "1px"} borderColor={plan.highlighted ? "purple.500" : "border"}>
              <Card.Body>
                {plan.highlighted && <Badge colorPalette="purple" mb={4} w="fit-content">Most Popular</Badge>}
                <Heading size="lg" mb={2}>{plan.name}</Heading>
                <Text color="fg.muted" fontSize="sm" mb={6}>{plan.description}</Text>
                <Box mb={6}>
                  <Text fontSize="4xl" fontWeight="bold">{displayPrice === 0 ? "Free" : `₦${displayPrice.toLocaleString()}`}</Text>
                  {displayPrice > 0 && <Text as="span" color="fg.muted" fontSize="sm"> {isAnnual ? "/year" : "/month"}</Text>}
                  {savings > 0 && <Text color="purple.500" fontSize="xs" fontWeight="semibold" mt={2}>Save ₦{savings.toLocaleString()}/month</Text>}
                </Box>
                <Button asChild w="full" mb={6} variant={plan.highlighted ? "solid" : "outline"}>
                  <RouterLink to="/register">{plan.cta}</RouterLink>
                </Button>
                <VStack align="stretch" gap={3}>
                  {plan.features.map((feature) => (
                    <HStack key={feature} align="start" gap={3}>
                      <Box color="purple.500" mt={0.5}><CheckCircleIcon className="w-5 h-5" /></Box>
                      <Text fontSize="sm">{feature}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Card.Body>
            </Card.Root>
          );
        })}
      </Grid>
    </Container>
  );
}