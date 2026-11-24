import { useNavigate, useParams } from "react-router-dom";
import {
  Badge, Box, Button, Card, Flex, Grid, Heading, HStack, Skeleton, Stack, Text,
} from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import {
  useBookingDetail, useCancelBooking, useCompleteBooking, useConfirmBooking, useNoShowBooking, useStartBooking,
} from "@/features/bookings";
import { BookingStatusBadge } from "./BookingStatusBadge";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <Box><Text fontSize="xs" color="fg.muted" mb="0.5">{label}</Text><Text fontSize="sm" fontWeight="medium">{value || "—"}</Text></Box>;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: b, isLoading, isError } = useBookingDetail(id);
  const confirm = useConfirmBooking(); const complete = useCompleteBooking(); const cancel = useCancelBooking();
  const noShow = useNoShowBooking(); const start = useStartBooking();

  const act = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toaster.create({ title: msg, type: "success" }); }
    catch (e: any) { toaster.create({ title: "Action failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  if (isLoading) return <Stack gap="4"><Skeleton h="10" w="48" /><Skeleton h="80" rounded="lg" /></Stack>;
  if (isError || !b) return <Card.Root><Card.Body><Text color="fg.error">Booking not found.</Text><Button mt="3" variant="outline" onClick={() => navigate("/bookings")}>Back to Bookings</Button></Card.Body></Card.Root>;

  const customerName = b.is_guest ? b.guest_name || "Guest" : [b.customer?.first_name, b.customer?.last_name].filter(Boolean).join(" ") || b.customer_id || "—";
  const staffName = [b.staff?.first_name, b.staff?.last_name].filter(Boolean).join(" ") || b.staff_id || "—";
  const canAct = b.status === "scheduled" || b.status === "confirmed";

  return <Stack gap="6">
    <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
      <HStack gap="2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/bookings")}><LuArrowLeft /> Back to Bookings</Button>
      </HStack>
      <HStack gap="2"><BookingStatusBadge status={b.status} /><Text fontSize="xs" color="fg.muted" fontFamily="mono">#{b.id.slice(0, 8)}</Text></HStack>
    </Flex>

    <Box>
      <Heading size="xl">Booking Details</Heading>
      <Text color="fg.muted" fontSize="sm">{new Date(b.start_time).toLocaleString()}</Text>
    </Box>

    <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
      <Stack gap="6">
        <Card.Root>
          <Card.Header><Card.Title fontSize="md">Booking Information</Card.Title></Card.Header>
          <Card.Body>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="4">
              <Info label="Customer" value={<HStack gap="2"><span>{customerName}</span>{b.is_guest && <Badge size="sm" variant="subtle">Guest</Badge>}</HStack>} />
              <Info label="Service" value={b.service?.name || b.service_id} />
              <Info label="Staff" value={staffName} />
              <Info label="Price" value={formatNaira(b.price)} />
              <Info label="Date" value={new Date(b.start_time).toLocaleDateString()} />
              <Info label="Time" value={`${new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`} />
              <Info label="Payment option" value={b.payment_option?.replace(/_/g, " ")} />
              <Info label="Payment status" value={b.payment_status?.replace(/_/g, " ")} />
              {b.guest_email && <Info label="Guest email" value={b.guest_email} />}
              {b.guest_phone && <Info label="Guest phone" value={b.guest_phone} />}
            </Grid>
            {b.notes && <Box mt="4" pt="4" borderTopWidth="1px"><Text fontSize="xs" color="fg.muted" mb="1">Notes</Text><Text fontSize="sm" whiteSpace="pre-wrap">{b.notes}</Text></Box>}
            {b.cancellation_reason && <Box mt="4" pt="4" borderTopWidth="1px"><Text fontSize="xs" color="fg.muted" mb="1">Cancellation reason</Text><Text fontSize="sm">{b.cancellation_reason}</Text></Box>}
            {b.no_show_reason && <Box mt="4" pt="4" borderTopWidth="1px"><Text fontSize="xs" color="fg.muted" mb="1">No-show reason</Text><Text fontSize="sm">{b.no_show_reason}</Text></Box>}
          </Card.Body>
        </Card.Root>

        <Card.Root>
          <Card.Header><Card.Title fontSize="md">Timeline</Card.Title></Card.Header>
          <Card.Body>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="4">
              <Info label="Created" value={new Date(b.created_at).toLocaleString()} />
              <Info label="Updated" value={new Date(b.updated_at).toLocaleString()} />
              {b.confirmed_at && <Info label="Confirmed at" value={new Date(b.confirmed_at).toLocaleString()} />}
              {b.cancelled_at && <Info label="Cancelled at" value={new Date(b.cancelled_at).toLocaleString()} />}
            </Grid>
          </Card.Body>
        </Card.Root>
      </Stack>

      <Card.Root h="fit-content">
        <Card.Header><Card.Title fontSize="md">Actions</Card.Title></Card.Header>
        <Card.Body>
          <Stack gap="2">
            {b.status === "scheduled" && <Button colorPalette="green" loading={confirm.isPending} onClick={() => act(() => confirm.mutateAsync(b.id), "Booking confirmed")}>Confirm</Button>}
            {b.status === "confirmed" && <Button colorPalette="blue" loading={start.isPending} onClick={() => act(() => start.mutateAsync(b.id), "Booking started")}>Start</Button>}
            {(b.status === "confirmed" || b.status === "in_progress") && <Button colorPalette="purple" loading={complete.isPending} onClick={() => act(() => complete.mutateAsync(b.id), "Booking completed")}>Complete</Button>}
            {canAct && <Button colorPalette="red" variant="outline" loading={cancel.isPending} onClick={() => act(() => cancel.mutateAsync({ id: b.id, reason: "Cancelled by staff" }), "Booking cancelled")}>Cancel</Button>}
            {canAct && <Button variant="outline" loading={noShow.isPending} onClick={() => act(() => noShow.mutateAsync({ id: b.id, reason: "Marked as no-show" }), "Marked as no-show")}>No-Show</Button>}
            <Button variant="ghost" onClick={() => navigate("/bookings")}>Close</Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Grid>
  </Stack>;
}
