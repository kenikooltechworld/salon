import { Container, Heading, Text, VStack, Button, HStack } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

export default function Home() {
  return (
    <Container maxW="5xl" py={16}>
      <VStack gap={6} align="stretch">
        <Heading size="2xl">Kenikool Salon</Heading>
        <Text fontSize="lg" color="fg.muted">
          Manage bookings, customers, staff, and payments in one place.
        </Text>
        <HStack gap={4}>
          <Button asChild size="lg">
            <RouterLink to="/auth/register">Get Started</RouterLink>
          </Button>
          <Button asChild variant="outline" size="lg">
            <RouterLink to="/auth/login">Sign In</RouterLink>
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}