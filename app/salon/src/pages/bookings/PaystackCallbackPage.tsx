import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuCheck, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";

type PaymentStatus = "success" | "failed" | "cancelled" | "unknown";

export default function PaystackCallbackPage() {
  const [status, setStatus] = useState<PaymentStatus>("unknown");
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    const paystackStatus = params.get("status");
    setReference(ref);
    if (paystackStatus === "success") {
      setStatus("success");
    } else if (paystackStatus === "failed") {
      setStatus("failed");
    } else if (paystackStatus === "cancelled") {
      setStatus("cancelled");
    } else {
      setStatus("unknown");
    }

    if (ref) {
      toaster.create({
        title: "Payment callback received",
        description: `Reference: ${ref}. Payment status: ${paystackStatus ?? "unknown"}. The webhook will update your booking and invoice status automatically.`,
        type: "info",
      });
    } else {
      toaster.create({ title: "Payment callback", description: "No payment reference provided.", type: "error" });
    }

    setLoading(false);
  }, []);

  if (loading) {
    return (
      <Container maxW="sm" py="10" textAlign="center">
        <Spinner />
        <Text color="fg.muted" mt="4">Processing payment…</Text>
      </Container>
    );
  }

  const isSuccess = status === "success";
  const title = isSuccess ? "Payment Successful" : "Payment Cancelled";
  const subtitle = isSuccess
    ? "Your payment has been received. Your booking and invoice will be updated shortly."
    : "The payment was not completed.";

  return (
    <Container maxW="md" py="10">
      <Stack gap="4" align="center" textAlign="center">
        <Card.Root p="8" borderRadius="xl" width="100%" maxW="280">
          <Box as="span" fontSize="48">{isSuccess ? <LuCheck /> : <LuX />}</Box>
          <Heading size="md" mt="2">{title}</Heading>
          <Text color="fg.muted" mt="2">{subtitle}</Text>
          {reference && (
            <Stack gap="2" pt="4" mt="4" borderTopWidth="1px" borderColor="border.emphasized" align="left" width="full">
              <Text fontSize="sm" color="fg.muted">Reference:</Text>
              <Text fontFamily="mono" fontSize="sm">{reference}</Text>
            </Stack>
          )}
          <Stack gap="3" pt="6" mt="4">
            <Button flex="1" colorScheme="green" variant="solid" onClick={() => window.location.href = "/bookings"}>Go to Bookings</Button>
          </Stack>
        </Card.Root>
      </Stack>
    </Container>
  );
}