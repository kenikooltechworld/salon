import { Box, Container, Heading, List, Text, VStack } from "@chakra-ui/react";

export default function About() {
  return (
    <Container maxW="4xl" py={16}>
      <VStack align="stretch" gap={10}>
        <VStack align="stretch" gap={4}>
          <Heading size="2xl">About Kenikool</Heading>
          <Text fontSize="lg" color="fg.muted">
            Kenikool is a salon and booking management platform built to help beauty and wellness businesses save time, reduce no-shows, and deliver better customer experiences.
          </Text>
        </VStack>
        <Box>
          <Heading size="lg" mb={4}>Our Mission</Heading>
          <Text color="fg.muted">We believe salon owners and staff should spend less time on paperwork and more time with clients. Kenikool brings together online booking, staff management, payments, and customer engagement in one simple system.</Text>
        </Box>
        <Box>
          <Heading size="lg" mb={4}>What We Offer</Heading>
          <List.Root ps={5} gap={2} color="fg.muted">
            {["Online booking and appointment scheduling", "Staff performance and commission tracking", "Secure payment processing and invoicing", "Customer relationship management", "Inventory and resource management", "Real-time notifications and waiting room tools"].map((item) => (
              <List.Item key={item}>{item}</List.Item>
            ))}
          </List.Root>
        </Box>
        <Box>
          <Heading size="lg" mb={4}>Contact Us</Heading>
          <Text color="fg.muted">Have questions or need support? Reach out and our team will help you get the most out of Kenikool.</Text>
        </Box>
      </VStack>
    </Container>
  );
}