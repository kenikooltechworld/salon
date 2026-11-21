import { Container, Heading, Text, VStack } from "@chakra-ui/react";

export default function About() {
  return (
    <Container maxW="5xl" py={16}>
      <VStack gap={4} align="stretch">
        <Heading size="xl">About</Heading>
        <Text color="fg.muted">Learn more about Kenikool Salon.</Text>
      </VStack>
    </Container>
  );
}