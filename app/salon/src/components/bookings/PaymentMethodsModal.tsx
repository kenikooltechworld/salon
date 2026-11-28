import { useState } from "react";
import { Portal, Dialog, CloseButton, Flex, Box, Text, Button, HStack, VStack, Card, Spinner } from "@chakra-ui/react";
import { LuCreditCard, LuBanknote, LuArrowRight } from "react-icons/lu";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { useCreateBooking, useCollectBookingPayment, useInitializePayment } from "@/features/bookings";

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
  bookingPayload?: Record<string, unknown> | null;
  onCollected?: (booking: any) => void;
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

export default function PaymentMethodsModal({ open, onClose, booking, bookingPayload, onCollected }: PaymentMethodsModalProps) {
  const customerEmail = booking.is_guest ? (booking.guest_email ?? "") : (booking.customer?.email ?? "");
  const customerName = booking.is_guest
    ? (booking.guest_name ?? undefined)
    : (booking.customer ? `${booking.customer.first_name ?? ""} ${booking.customer.last_name ?? ""}`.trim() || undefined : undefined);

  const createM = useCreateBooking();
  const collectM = useCollectBookingPayment();
  const initM = useInitializePayment();
  const [method, setMethod] = useState<Method>("cash");

  const handleCollectCash = async () => {
    try {
      const res = await createM.mutateAsync(bookingPayload as any);
      const created = (res as any)?.data ?? res;
      await collectM.mutateAsync({ id: created.id, payload: { payment_method: "cash", amount: booking.amount } });
      onCollected?.(created);
      onClose();
    } catch (e: any) {
      toaster.create({ title: "Collection failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

  const handleTransferRedirect = async () => {
    try {
      await initM.mutateAsync({
        amount: booking.amount,
        customer_email: customerEmail,
        customer_name: customerName,
        booking_id: booking.id,
        user_type: "free",
        method: "transfer",
        booking: bookingPayload ?? null,
      });
    } catch (e: any) {
      toaster.create({ title: "Payment init failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

  const handleCardRedirect = async () => {
    try {
      await initM.mutateAsync({
        amount: booking.amount,
        customer_email: customerEmail,
        customer_name: customerName,
        booking_id: booking.id,
        user_type: "free",
        method: "card",
        booking: bookingPayload ?? null,
      });
    } catch (e: any) {
      toaster.create({ title: "Card payment failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
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

              {method === "transfer" && (
                <Text fontSize="xs" color="fg.muted">
                  The customer will be redirected to Paystack to complete the bank transfer. The appointment stays pending until Paystack confirms the transfer.
                </Text>
              )}
              {method === "card" && (
                <Text fontSize="xs" color="fg.muted">
                  You will be redirected to Paystack checkout to pay by card. The appointment stays pending until payment succeeds.
                </Text>
              )}
              {method === "cash" && (
                <Text fontSize="xs" color="fg.muted">
                  The appointment will be created immediately and marked as paid once cash is collected.
                </Text>
              )}

              <VStack gap="4" align="stretch">
                <Text fontSize="sm" color="fg.muted">Select how the customer will pay:</Text>
                <VStack align="stretch" gap="3">
                  <MethodCard value="cash" title="Cash" desc="Create the appointment and record cash payment immediately." icon={<LuBanknote />} color="green.500" selected={method === "cash"} onSelect={setMethod} />
                  <MethodCard value="transfer" title="Bank Transfer" desc="Redirect to Paystack to pay via bank transfer." icon={<LuBanknote />} color="blue.500" selected={method === "transfer"} onSelect={setMethod} />
                  <MethodCard value="card" title="Card (Paystack)" desc="Redirect to Paystack checkout to pay with card." icon={<LuCreditCard />} color="purple.500" selected={method === "card"} onSelect={setMethod} />
                </VStack>

                <Box h="1px" bg="border" />

                {method === "cash" && (
                  <Flex justify="end" gap="2">
                    <Button colorPalette="green" onClick={handleCollectCash} loading={createM.isPending || collectM.isPending}>
                      {createM.isPending || collectM.isPending ? <Spinner size="sm" /> : <>Confirm Cash Payment <LuArrowRight /></>}
                    </Button>
                  </Flex>
                )}
                {method === "transfer" && (
                  <Flex justify="end" gap="2">
                    <Button colorPalette="blue" onClick={handleTransferRedirect} loading={initM.isPending}>
                      {initM.isPending ? <Spinner size="sm" /> : <>Pay via Bank Transfer <LuArrowRight /></>}
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
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Portal>
  );
}
