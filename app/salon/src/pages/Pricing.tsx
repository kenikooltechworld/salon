import { Container, Heading, Text, VStack } from "@chakra-ui/react";

export default function Pricing() {
  return (
    <Container maxW="5xl" py={16}>
      <VStack gap={4} align="stretch">
        <Heading size="xl">Pricing</Heading>
        <Text color="fg.muted">Simple, transparent pricing.</Text>
      </VStack>
    </Container>
  );
}