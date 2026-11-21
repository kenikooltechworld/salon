import { Container, Heading, Text, VStack } from "@chakra-ui/react";

export default function Features() {
  return (
    <Container maxW="5xl" py={16}>
      <VStack gap={4} align="stretch">
        <Heading size="xl">Features</Heading>
        <Text color="fg.muted">Explore the features Kenikool Salon offers.</Text>
      </VStack>
    </Container>
  );
}