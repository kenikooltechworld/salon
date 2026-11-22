import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { Badge, Box, Button, Card, Container, Flex, Grid, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { CheckCircleIcon } from "@/components/icons";
import { api } from "@/lib/api";

const defaultPricing = [
  { name: "Free", monthlyPrice: 0, annualPrice: 0, description: "Perfect for getting started", features: ["Up to 1 staff member", "Up to 100 customers", "Basic appointment scheduling", "Email support", "30-day trial"], cta: "Start Free Trial", highlighted: false },
  { name: "Starter", monthlyPrice: 15000, annualPrice: 153000, description: "For small salons", features: ["Up to 3 staff members", "POS system included", "Up to 500 customers", "Email support", "Mobile app access"], cta: "Start Free Trial", highlighted: false },
  { name: "Professional", monthlyPrice: 35000, annualPrice: 357000, description: "For growing businesses", features: ["Up to 10 staff members", "Advanced analytics", "API access", "Priority support", "Up to 2000 customers"], cta: "Start Free Trial", highlighted: true },
];

export function PricingPreviewSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { data: apiPricing = [] } = useQuery({
    queryKey: ["pricing-plans"],
    queryFn: async () => {
      const response = await api.get("/billing/plans");
      const d = response.data;
      return Array.isArray(d) ? d : Array.isArray(d?.plans) ? d.plans : [];
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
  const pricing = apiPricing.length > 0 ? apiPricing.map((plan: any) => ({
    name: plan.name || "", monthlyPrice: plan.monthly_price ?? 0, annualPrice: plan.yearly_price ?? 0, description: plan.description || "", features: Array.isArray(plan.features) ? plan.features : [], cta: "Start Free Trial", highlighted: plan.is_featured || false,
  })) : defaultPricing;

  return (
    <Box as="section" id="pricing" py={{ base: 20, sm: 32 }} bg="bg">
      <Container maxW="7xl">
        <VStack textAlign="center" mb={16} gap={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }}>Simple, Transparent Pricing</Heading>
            <Text fontSize="lg" color="fg.muted" maxW="2xl" mx="auto" mt={4}>Choose the plan that fits your business needs</Text>
          </motion.div>
          <HStack gap={4} justify="center">
            <Text fontSize="sm" fontWeight="medium" color={!isAnnual ? "fg" : "fg.muted"}>Monthly</Text>
            <Box as="button" onClick={() => setIsAnnual(!isAnnual)} w="14" h="8" bg="bg.muted" rounded="full" position="relative">
              <Box position="absolute" top="1" left={isAnnual ? "7" : "1"} w="6" h="6" bg="purple.500" rounded="full" transition="all 0.2s" />
            </Box>
            <Text fontSize="sm" fontWeight="medium" color={isAnnual ? "fg" : "fg.muted"}>Annual</Text>
            {isAnnual && <Badge colorPalette="purple">Save 20%</Badge>}
          </HStack>
        </VStack>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8}>
          {pricing.slice(0, 3).map((plan: any, idx: number) => {
            const displayPrice = isAnnual ? (plan.annualPrice ?? 0) : (plan.monthlyPrice ?? 0);
            const savings = isAnnual && plan.monthlyPrice && plan.annualPrice ? Math.round((plan.monthlyPrice * 12 - plan.annualPrice) / 12) : 0;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
                <Card.Root h="full" borderWidth={plan.highlighted ? "2px" : "1px"} borderColor={plan.highlighted ? "purple.500" : "border"}>
                  <Card.Body>
                    {plan.highlighted && <Badge colorPalette="purple" mb={4} w="fit-content">Most Popular</Badge>}
                    <Heading size="xl" mb={2}>{plan.name || "Plan"}</Heading>
                    <Text color="fg.muted" fontSize="sm" mb={6}>{plan.description || ""}</Text>
                    <Box mb={6}>
                      <Text fontSize="4xl" fontWeight="bold">{displayPrice === 0 ? "Free" : `â‚¦${(displayPrice || 0).toLocaleString()}`}</Text>
                      {displayPrice > 0 && <Text as="span" color="fg.muted" fontSize="sm"> {isAnnual ? "/year" : "/month"}</Text>}
                      {savings > 0 && <Text color="purple.500" fontSize="xs" fontWeight="semibold" mt={2}>Save â‚¦{savings.toLocaleString()}/month</Text>}
                    </Box>
                    <Button asChild w="full" mb={8} variant={plan.highlighted ? "solid" : "outline"}>
                      <RouterLink to="/auth/register">{plan.cta}</RouterLink>
                    </Button>
                    <VStack align="stretch" gap={3}>
                      {(Array.isArray(plan.features) ? plan.features : []).map((feature: string, fidx: number) => (
                        <HStack key={fidx} align="start" gap={3}>
                          <Box color="purple.500" mt={0.5}><CheckCircleIcon className="w-5 h-5" /></Box>
                          <Text fontSize="sm">{feature}</Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Card.Body>
                </Card.Root>
              </motion.div>
            );
          })}
        </Grid>
        <Flex justify="center" mt={12}>
          <Button asChild size="lg" variant="outline">
            <RouterLink to="/pricing">View All Plans</RouterLink>
          </Button>
        </Flex>
      </Container>
    </Box>
  );
}
