import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Flex, Grid, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { useBookingDetail, useCancelBooking, useCompleteBooking, useConfirmBooking, useNoShowBooking, useStartBooking } from "@/features/bookings";
import { BookingStatusBadge } from "./BookingStatusBadge";

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: b, isLoading, isError } = useBookingDetail(id);
  const confirm = useConfirmBooking(); const complete = useCompleteBooking(); const cancel = useCancelBooking(); const noShow = useNoShowBooking(); const start = useStartBooking();

  const act = async (fn: () => Promise<any>, msg: string) => { try { await fn(); toaster.create({ title: msg, type: "success" }); } catch (e: any) { toaster.create({ title: "Action failed", description: e?.response?.data?.detail || e?.message, type: "error" }); } };

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (isError || !b) return <Card.Root><Card.Body><Text color="fg.error">Booking not found.</Text><Button mt="3" onClick={() => navigate("/bookings")}>Back to Bookings</Button></Card.Body></Card.Root>;

  const customerName = b.is_guest ? b.guest_name || "Guest" : [b.customer?.first_name, b.customer?.last_name].filter(Boolean).join(" ") || b.customer_id || "—";
  const staffName = [b.staff?.first_name, b.staff?.last_name].filter(Boolean).join(" ") || b.staff_id;

  return <Stack gap="6">
    <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
      <HStack><Button variant="ghost" onClick={() => navigate("/bookings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Booking Details</Heading><Text color="fg.muted">{new Date(b.start_time).toLocaleString()}</Text></Box></HStack>
      <BookingStatusBadge status={b.status} />
    </Flex>

    <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
      <Card.Root><Card.Body><Stack gap="4">
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
          <Box><Text fontSize="xs" color="fg.muted">Customer</Text><Text fontWeight="medium">{customerName}</Text>{b.is_guest && <Badge size="sm">Guest</Badge>}</Box>
          <Box><Text fontSize="xs" color="fg.muted">Service</Text><Text fontWeight="medium">{b.service?.name || b.service_id}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Staff</Text><Text fontWeight="medium">{staffName}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Price</Text><Text fontWeight="medium">{formatNaira(b.price)}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Start</Text><Text fontWeight="medium">{new Date(b.start_time).toLocaleString()}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">End</Text><Text fontWeight="medium">{new Date(b.end_time).toLocaleString()}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Payment option</Text><Text fontWeight="medium">{b.payment_option || "—"}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Payment status</Text><Text fontWeight="medium">{b.payment_status || "—"}</Text></Box>
        </Grid>
        {b.notes && <Box><Text fontSize="xs" color="fg.muted">Notes</Text><Text whiteSpace="pre-wrap">{b.notes}</Text></Box>}
        {b.cancellation_reason && <Box><Text fontSize="xs" color="fg.muted">Cancellation reason</Text><Text>{b.cancellation_reason}</Text></Box>}
        {b.no_show_reason && <Box><Text fontSize="xs" color="fg.muted">No-show reason</Text><Text>{b.no_show_reason}</Text></Box>}
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="3">
        <Heading size="sm">Actions</Heading>
        {b.status === "scheduled" && <Button colorPalette="green" loading={confirm.isPending} onClick={() => act(() => confirm.mutateAsync(b.id), "Booking confirmed")}>Confirm</Button>}
        {b.status === "confirmed" && <Button colorPalette="blue" loading={start.isPending} onClick={() => act(() => start.mutateAsync(b.id), "Booking started")}>Start</Button>}
        {(b.status === "confirmed" || b.status === "in_progress") && <Button colorPalette="purple" loading={complete.isPending} onClick={() => act(() => complete.mutateAsync(b.id), "Booking completed")}>Complete</Button>}
        {(b.status === "scheduled" || b.status === "confirmed") && <Button colorPalette="red" variant="outline" loading={cancel.isPending} onClick={() => act(() => cancel.mutateAsync({ id: b.id, reason: "Cancelled by staff" }), "Booking cancelled")}>Cancel</Button>}
        {(b.status === "scheduled" || b.status === "confirmed") && <Button variant="outline" loading={noShow.isPending} onClick={() => act(() => noShow.mutateAsync({ id: b.id, reason: "Marked as no-show" }), "Marked as no-show")}>No-show</Button>}
        <Box pt="2" borderTopWidth="1px"><Text fontSize="xs" color="fg.muted">Created</Text><Text fontSize="sm">{new Date(b.created_at).toLocaleString()}</Text><Text fontSize="xs" color="fg.muted" mt="2">Updated</Text><Text fontSize="sm">{new Date(b.updated_at).toLocaleString()}</Text></Box>
      </Stack></Card.Body></Card.Root>
    </Grid>
  </Stack>;
}
