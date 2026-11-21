import { Container, Heading, Text, VStack } from "@chakra-ui/react";
import { FeaturesSection } from "@/components/landing";

export default function Features() {
  return (
    <Container maxW="7xl" py={16}>
      <VStack align="stretch" gap={8}>
        <VStack align="stretch" gap={2}>
          <Heading size="2xl">Features</Heading>
          <Text color="fg.muted">Explore everything Kenikool offers.</Text>
        </VStack>
        <FeaturesSection />
      </VStack>
    </Container>
  );
}