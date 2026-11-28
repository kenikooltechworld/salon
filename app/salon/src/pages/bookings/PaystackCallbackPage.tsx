import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Container, Heading, Spinner, Stack, Text } from "@chakra-ui/react";
import { LuCheck, LuX } from "react-icons/lu";
import { bookingsApi } from "@/features/bookings";

type PaymentStatus = "success" | "failed" | "cancelled" | "pending" | "unknown";

export default function PaystackCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref");
    setReference(ref);

    if (!ref) {
      setStatus("unknown");
      setLoading(false);
      return;
    }

    let active = true;
    bookingsApi
      .verifyPayment(ref)
      .then((res: any) => {
        if (!active) return;
        const s = (res.data?.status || "").toLowerCase();
        if (s === "success") {
          setStatus("success");
          const appt = res.data?.appointment;
          if (appt) {
            setAppointment(appt);
            setDetail({
              serviceName: appt.service?.name || "",
              serviceDuration: appt.service?.duration_minutes,
              servicePrice: Number(appt.service?.price || 0),
              staffName: [appt.staff?.first_name, appt.staff?.last_name].filter(Boolean).join(" ") || "",
              addonNames: [],
              addonPrices: [],
              packageName: null,
              packagePrice: null,
              totalPrice: Number(appt.price || 0),
            });
          }
        } else if (s === "failed") setStatus("failed");
        else if (s === "cancelled" || s === "abandoned") setStatus("cancelled");
        else setStatus("pending");
      })
      .catch(() => {
        if (active) setStatus("unknown");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "success" || !appointment) return;
    const t = setTimeout(() => {
      navigate("/bookings/confirmation", {
        state: { booking: appointment, detail },
      });
    }, 10000);
    return () => clearTimeout(t);
  }, [status, appointment, detail, navigate]);

  if (loading) {
    return (
      <Container maxW="sm" py="10" textAlign="center">
        <Spinner />
        <Text color="fg.muted" mt="4">Verifying payment…</Text>
      </Container>
    );
  }

  const isSuccess = status === "success";
  const isPending = status === "pending";
  const title = isSuccess ? "Payment Successful" : isPending ? "Payment Processing" : "Payment Not Completed";
  const subtitle = isSuccess
    ? "Your payment was received. Your appointment has been created and is marked as paid. Redirecting to confirmation in 10 seconds…"
    : isPending
      ? "We are still confirming your payment with Paystack. This usually resolves within a minute — check your bookings shortly."
      : "The payment was not completed. If you were charged, contact support with the reference below.";

  return (
    <Container maxW="md" py="10">
      <Stack gap="4" align="center" textAlign="center">
        <Card.Root p="8" borderRadius="xl" width="100%" maxW="280">
          <Box as="span" fontSize="48" color={isSuccess ? "green.500" : isPending ? "yellow.500" : "red.500"}>
            {isSuccess ? <LuCheck /> : isPending ? <Spinner /> : <LuX />}
          </Box>
          <Heading size="md" mt="2">{title}</Heading>
          <Text color="fg.muted" mt="2">{subtitle}</Text>
          {reference && (
            <Stack gap="2" pt="4" mt="4" borderTopWidth="1px" borderColor="border.emphasized" align="left" width="full">
              <Text fontSize="sm" color="fg.muted">Reference:</Text>
              <Text fontFamily="mono" fontSize="sm" wordBreak="break-all">{reference}</Text>
            </Stack>
          )}
          <Stack gap="3" pt="6" mt="4">
            <Button flex="1" colorPalette="green" variant="solid" onClick={() => window.location.href = "/bookings"}>Go to Bookings</Button>
          </Stack>
        </Card.Root>
      </Stack>
    </Container>
  );
}