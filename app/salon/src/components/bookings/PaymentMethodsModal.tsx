import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Portal,
  Dialog,
  CloseButton,
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Stack,
  HStack,
  VStack,
  Card,
  Spinner,
} from "@chakra-ui/react";
import { LuCreditCard, LuBanknote, LuArrowRight, LuX } from "react-icons/lu";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { bookingsApi } from "@/features/bookings";
import { useCollectBookingPayment, useInitializePayment } from "@/features/bookings";

export interface ModalBooking {
  id: string;
  amount: number;
  status: string;
  payment_option: "now" | "later";
  payment_status?: string | null;
  is_guest: boolean;
  guest_email?: string | null;
  guest_name?: string | null;
  customer?: { id: string; first_name?: string; last_name?: string; email?: string } | null;
}

interface PaymentMethodsModalProps {
  open: boolean;
  onClose: () => void;
  booking: ModalBooking;
  onCollected?: () => void;
}

type Method = "cash" | "transfer" | "card";

function MethodCard({ value, title, desc, icon, color, selected, onSelect }: { value: Method; title: string; desc: string; icon: React.ReactNode; color: string; selected: boolean; onSelect: (v: Method) => void }) {
  return (
    <Card.Root
      variant="outline"
      p="4"
      w="full"
      cursor="pointer"
      borderWidth={selected ? "2px" : "1px"}
      borderColor={selected ? "brand.solid" : undefined}
      bg={selected ? "brand.subtle" : undefined}
      onClick={() => onSelect(value)}
    >
      <HStack gap="4">
        <Box color={color} fontSize="2xl">{icon}</Box>
        <VStack align="start" gap="1">
          <Text fontWeight="semibold">{title}</Text>
          <Text fontSize="xs" color="fg.muted">{desc}</Text>
        </VStack>
      </HStack>
    </Card.Root>
  );
}

export default function PaymentMethodsModal({ open, onClose, booking, onCollected }: PaymentMethodsModalProps) {
  const customerEmail = booking.is_guest ? (booking.guest_email ?? "") : (booking.customer?.email ?? "");
  const customerName = booking.is_guest
    ? (booking.guest_name ?? undefined)
    : (booking.customer ? `${booking.customer.first_name ?? ""} ${booking.customer.last_name ?? ""}`.trim() || undefined : undefined);

  const collectM = useCollectBookingPayment();
  const initM = useInitializePayment();
  const [method, setMethod] = useState<Method>("cash");
  const [transferDetails, setTransferDetails] = useState<{
    reference: string;
    display_text?: string;
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    amount: number;
    account_expires_at?: string;
  } | null>(null);

  const transferM = useMutation({
    mutationFn: (payload: { email: string; amount: number; booking_id?: string }) =>
      bookingsApi.createBankTransferCharge(payload),
    onSuccess: (res) => {
      setTransferDetails(res.data);
      toaster.create({
        title: "Transfer details generated",
        description: `Show the customer the account below. Amount: ${formatNaira(res.data.amount)}`,
        type: "success",
      });
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail;
      const message =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg || d?.detail || JSON.stringify(d)).join("; ")
            : detail?.message || e?.message || "Unknown error";
      setTransferDetails(null);
      toaster.create({
        title: "Transfer failed",
        description: message,
        type: "error",
      });
    },
  });

  const verifyM = useMutation({
    mutationFn: (reference: string) => bookingsApi.checkBankTransferStatus(reference),
    onSuccess: (res) => {
      const status = (res.data?.status || "").toLowerCase();
      if (status === "success") {
        toaster.create({ title: "Transfer confirmed!", description: "Payment received successfully.", type: "success" });
        setTransferDetails(null);
        onCollected?.();
        onClose();
      } else {
        toaster.create({
          title: `Transfer status: ${status || "unknown"}`,
          description: `The transfer is not yet confirmed. Please contact support with reference ${transferDetails?.reference}.`,
          type: "warning",
        });
      }
    },
    onError: (e: any) => {
      const detail = e?.response?.data?.detail;
      const message = typeof detail === "string" ? detail : detail?.message || e?.message || "Verification failed";
      toaster.create({
        title: "Transfer check failed",
        description: message,
        type: "error",
      });
    },
  });

  const handleCollectCash = async () => {
    try {
      await collectM.mutateAsync({ id: booking.id, payload: { payment_method: "cash", amount: booking.amount } });
      toaster.create({ title: "Payment recorded", type: "success" });
      onCollected?.();
      onClose();
    } catch (e: any) {
      toaster.create({ title: "Collection failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

  const handleGenerateTransfer = () => {
    if (booking.amount < 100) {
      toaster.create({
        title: "Amount too low for bank transfer",
        description: `Bank transfer requires a minimum of ₦100. This booking is ${formatNaira(booking.amount)}. Please use Cash or Card instead.`,
        type: "warning",
      });
      return;
    }
    transferM.mutate({ email: customerEmail, amount: booking.amount, booking_id: booking.id });
  };

  const handleCardRedirect = async () => {
    try {
      await initM.mutateAsync({
        amount: booking.amount,
        customer_email: customerEmail,
        customer_name: customerName,
        booking_id: booking.id,
        user_type: "free",
      });
    } catch (e: any) {
      toaster.create({ title: "Card payment failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

  const formatExpiry = (ts?: string) => {
    if (!ts) return "8 hours from now";
    return new Date(ts).toLocaleString();
  };

  if (!open) return null;

  return (
    <Portal>
      <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose(); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="md" w="full">
            <Dialog.Header>
              <Dialog.Title>Payment — {booking.id.slice(0, 8).toUpperCase()}</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
            <Dialog.Body>
              <Text fontWeight="bold" fontSize="xl" mb="4">{formatNaira(booking.amount)}</Text>

              {transferDetails ? (
                <VStack gap="4" align="stretch">
                  <Card.Root variant="outline" p="4">
                    <Stack gap="3">
                      <Heading size="sm" color="green.600">Transfer Account Ready</Heading>
                      <Text fontSize="sm" color="fg.muted">{transferDetails.display_text ?? "Transfer the exact amount shown below."}</Text>
                      <Box h="1px" bg="border" />
                      <VStack gap="2" align="stretch">
                        <HStack justify="space-between"><Text color="fg.muted" fontSize="sm">Account Name</Text><Text fontWeight="semibold" fontFamily="mono" fontSize="sm">{transferDetails.account_name}</Text></HStack>
                        <HStack justify="space-between"><Text color="fg.muted" fontSize="sm">Account Number</Text><Text fontWeight="semibold" fontFamily="mono" fontSize="sm">{transferDetails.account_number}</Text></HStack>
                        <HStack justify="space-between"><Text color="fg.muted" fontSize="sm">Bank</Text><Text fontWeight="semibold" fontSize="sm">{transferDetails.bank_name}</Text></HStack>
                        <HStack justify="space-between"><Text color="fg.muted" fontSize="sm">Amount</Text><Text fontWeight="semibold" fontSize="lg">{formatNaira(transferDetails.amount)}</Text></HStack>
                        <HStack justify="space-between"><Text color="fg.muted" fontSize="sm">Expires</Text><Text fontSize="sm">{formatExpiry(transferDetails.account_expires_at)}</Text></HStack>
                      </VStack>
                      <Text fontSize="xs" color="fg.muted">
                        Instruct the customer to transfer <strong>exactly {formatNaira(transferDetails.amount)}</strong>. Payment is confirmed automatically via webhook.
                      </Text>
                    </Stack>
                  </Card.Root>
                  <Flex justify="end" gap="2">
                    <Button variant="ghost" onClick={() => setTransferDetails(null)}><LuX /> Back to Methods</Button>
                    <Button colorPalette="blue" variant="outline" onClick={() => verifyM.mutate(transferDetails.reference)} loading={verifyM.isPending}>Check Status</Button>
                    <Button colorPalette="green" onClick={onClose}>Close</Button>
                  </Flex>
                </VStack>
              ) : (
                <VStack gap="4" align="stretch">
                  <Text fontSize="sm" color="fg.muted">Select how the customer will pay:</Text>
                  <VStack align="stretch" gap="3">
                    <MethodCard value="cash" title="Cash" desc="Record the full amount as cash payment immediately." icon={<LuBanknote />} color="green.500" selected={method === "cash"} onSelect={setMethod} />
                    <MethodCard value="transfer" title="Bank Transfer" desc="Generate a one-time virtual account for the exact amount." icon={<LuBanknote />} color="blue.500" selected={method === "transfer"} onSelect={setMethod} />
                    <MethodCard value="card" title="Card (Paystack)" desc="Redirect to Paystack checkout to pay with card." icon={<LuCreditCard />} color="purple.500" selected={method === "card"} onSelect={setMethod} />
                  </VStack>

                  <Box h="1px" bg="border" />

                  {method === "cash" && (
                    <Flex justify="end" gap="2">
                      <Button colorPalette="green" onClick={handleCollectCash} loading={collectM.isPending}>
                        {collectM.isPending ? <Spinner size="sm" /> : <>Confirm Cash Payment <LuArrowRight /></>}
                      </Button>
                    </Flex>
                  )}
                  {method === "transfer" && (
                    <Flex justify="end" gap="2">
                      <Button colorPalette="blue" onClick={handleGenerateTransfer} loading={transferM.isPending}>
                        {transferM.isPending ? <Spinner size="sm" /> : <>Generate Transfer Details <LuArrowRight /></>}
                      </Button>
                    </Flex>
                  )}
                  {method === "card" && (
                    <Flex justify="end" gap="2">
                      <Button colorPalette="purple" onClick={handleCardRedirect} loading={initM.isPending}>
                        {initM.isPending ? <Spinner size="sm" /> : <>Pay with Card <LuArrowRight /></>}
                      </Button>
                    </Flex>
                  )}
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
}