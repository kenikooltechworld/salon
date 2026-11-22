import { Button, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function SettingsPlaceholder({ title, description }: { title: string; description: string }) {
  const navigate = useNavigate();
  return (
    <Container maxW="5xl" py="6">
      <VStack align="stretch" gap="4">
        <Button variant="ghost" alignSelf="start" onClick={() => navigate("/settings")}>Back to Settings</Button>
        <Heading size="xl">{title}</Heading>
        <Text color="fg.muted">{description}</Text>
        <Text color="fg.muted" fontSize="sm">Frontend shell ready. Backend integration will be implemented for this card.</Text>
      </VStack>
    </Container>
  );
}
