import { Box, Card, Container, Heading, HStack, SimpleGrid, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuBell, LuCreditCard, LuDollarSign, LuMail, LuMapPin, LuPackage, LuSettings, LuTrendingUp } from "react-icons/lu";

const cards = [
  { id: "general", title: "General Settings", description: "Basic business information, hours, and branding", icon: LuSettings, path: "/settings/general" },
  { id: "commission", title: "Commission Settings", description: "Staff commission rules and financial settings", icon: LuDollarSign, path: "/settings/commission" },
  { id: "financial", title: "Financial Settings", description: "Balance enforcement, refunds, and payment policies", icon: LuTrendingUp, path: "/settings/financial" },
  { id: "operational", title: "Operational Settings", description: "Resources, inventory, and operational management", icon: LuPackage, path: "/settings/operational" },
  { id: "billing", title: "Billing & Subscription", description: "Plans, subscriptions, and billing management", icon: LuCreditCard, path: "/settings/billing" },
  { id: "notifications", title: "Notification Preferences", description: "Email, SMS, and push notification settings", icon: LuBell, path: "/settings/notifications" },
  { id: "email-templates", title: "Email Templates", description: "Customize customer welcome and notification emails", icon: LuMail, path: "/settings/email-templates" },
  { id: "locations", title: "Locations", description: "Manage salon locations for bookings and resources", icon: LuMapPin, path: "/settings/locations" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  return (
    <Container maxW="7xl" py="6">
      <VStack align="stretch" gap="6">
        <Box>
          <Heading size="xl">Settings</Heading>
          <Text color="fg.muted">Manage your salon settings and preferences</Text>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} gap="4">
          {cards.map((c) => (
            <Card.Root key={c.id} cursor="pointer" onClick={() => navigate(c.path)} _hover={{ borderColor: "brand.500", shadow: "md" }} transition="all 0.2s">
              <Card.Body>
                <HStack align="start" gap="4">
                  <Box p="3" rounded="lg" bg="bg.muted" color="fg"><c.icon size={22} /></Box>
                  <Box>
                    <Heading size="sm" mb="1">{c.title}</Heading>
                    <Text fontSize="sm" color="fg.muted">{c.description}</Text>
                  </Box>
                </HStack>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      </VStack>
    </Container>
  );
}
