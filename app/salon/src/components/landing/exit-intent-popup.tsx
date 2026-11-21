import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Dialog, Text, VStack } from "@chakra-ui/react";

export function ExitIntentPopup() {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const hasSeen = localStorage.getItem("exitIntentPopupShown");
    if (hasSeen) return;
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) {
        setIsVisible(true);
        localStorage.setItem("exitIntentPopupShown", "true");
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, []);

  return (
    <Dialog.Root open={isVisible} onOpenChange={(e) => setIsVisible(e.open)}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title>Wait! Don't go yet</Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Text mb={4}>Get 30 days free access to Kenikool. No credit card required.</Text>
            <Box bg="purple.50" _dark={{ bg: "purple.900" }} borderWidth="1px" borderColor="purple.200" rounded="md" p={3} mb={4}>
              <Text fontSize="sm" fontWeight="semibold" color="purple.600">Use code: <Text as="span" fontSize="lg">SALON20</Text></Text>
              <Text fontSize="xs" color="fg.muted">20% off your first 3 months</Text>
            </Box>
            <VStack align="stretch" gap={3}>
              <Button asChild w="full">
                <RouterLink to="/auth/register">Start Free Trial</RouterLink>
              </Button>
              <Button variant="outline" w="full" onClick={() => setIsVisible(false)}>Maybe later</Button>
            </VStack>
          </Dialog.Body>
          <Dialog.CloseTrigger />
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}