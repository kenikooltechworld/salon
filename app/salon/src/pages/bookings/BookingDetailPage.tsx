import { useNavigate, useParams } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, Image, Portal, Skeleton, Stack, Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import {
  useBookingDetail, useCancelBooking, useCollectBookingPayment, useCompleteBooking, useConfirmBooking, useDeleteBooking, useNoShowBooking, useStartBooking, useInitializePayment,
} from "@/features/bookings";
import { BookingStatusBadge } from "./BookingStatusBadge";
import { getStaffDisplayName, getStaffImageUrl } from "@/features/staff";
import { BookingFormDialog } from "./BookingFormDialog";
import { useAuthStore } from "@/features/auth";
import { apiClient } from "@/lib/api";

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <Box><Text fontSize="xs" color="fg.muted" mb="0.5">{label}</Text><Text fontSize="sm" fontWeight="medium">{value || "—"}</Text></Box>;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((state) => state.user?.role);
  const canManage = ["owner", "admin", "manager"].includes((role || "").toLowerCase());
  const { data: b, isLoading, isError } = useBookingDetail(id);
  const confirm = useConfirmBooking(); const complete = useCompleteBooking(); const cancel = useCancelBooking();
  const noShow = useNoShowBooking(); const start = useStartBooking();
  const collectPayment = useCollectBookingPayment();
  const initializePayment = useInitializePayment();
  const deleteBooking = useDeleteBooking();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const staffQ = useQuery({
    queryKey: ["staff", "booking-edit"],
    queryFn: async () => (await apiClient.get("/staff?page=1&page_size=100")).data,
  });
  const servicesQ = useQuery({
    queryKey: ["services", "booking-edit"],
    queryFn: async () => (await apiClient.get("/services?page=1&page_size=100&active_only=true")).data,
  });
  const act = async (fn: () => Promise<any>, msg: string) => {
    try { await fn(); toaster.create({ title: msg, type: "success" }); }
    catch (e: any) { toaster.create({ title: "Action failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  if (isLoading) return <Stack gap="4"><Skeleton h="10" w="48" /><Skeleton h="80" rounded="lg" /></Stack>;
  if (isError || !b) return <Card.Root><Card.Body><Text color="fg.error">Booking not found.</Text><Button mt="3" variant="outline" onClick={() => navigate("/bookings")}>Back to Bookings</Button></Card.Body></Card.Root>;

  const customerName = b.is_guest ? b.guest_name || "Guest" : [b.customer?.first_name, b.customer?.last_name].filter(Boolean).join(" ") || "Customer";
  const staffName = getStaffDisplayName(b.staff, "Staff member");
  const canCancel = ["scheduled", "confirmed", "in_progress"].includes(b.status);
  const canNoShow = b.status === "scheduled" || b.status === "confirmed";
  const canEdit = b.status === "scheduled" || b.status === "confirmed";
  const staffOptions = [...(Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : Array.isArray(staffQ.data) ? staffQ.data : [])];
  const serviceOptions = [...(Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [])];
  if (b.staff && !staffOptions.some((item: any) => item.id === b.staff?.id)) staffOptions.push(b.staff);
  if (b.service && !serviceOptions.some((item: any) => item.id === b.service?.id)) serviceOptions.push(b.service);

  const onDelete = async () => {
    try {
      await deleteBooking.mutateAsync(b.id);
      toaster.create({ title: "Booking deleted", type: "success" });
      navigate("/bookings");
    } catch (e: any) {
      toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

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
              <Info label="Customer" value={<HStack gap="2"><Avatar.Root size="xs"><Avatar.Image src={b.customer?.profile_image_url || undefined} /><Avatar.Fallback name={customerName} /></Avatar.Root><span>{customerName}</span>{b.is_guest && <Badge size="sm" variant="subtle">Guest</Badge>}</HStack>} />
              <Info label="Service" value={<HStack gap="2"><Box w="10" h="10" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">{b.service?.public_image_url ? <Image src={b.service.public_image_url} alt={b.service.name || "Service"} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" color="fg.muted">{b.service?.name?.slice(0, 1) || "S"}</Flex>}</Box><span>{b.service?.name || "Service"}</span></HStack>} />
              <Info label="Staff" value={<HStack gap="2"><Avatar.Root size="sm"><Avatar.Image src={getStaffImageUrl(b.staff)} /><Avatar.Fallback name={staffName} /></Avatar.Root><span>{staffName}</span></HStack>} />
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
            {canEdit && <Button variant="outline" onClick={() => setEditOpen(true)}><LuPencil /> Edit booking</Button>}
            {b.status === "scheduled" && <Button colorPalette="green" loading={confirm.isPending} onClick={() => act(() => confirm.mutateAsync(b.id), "Booking confirmed")}>Confirm</Button>}
            {b.status === "confirmed" && <Button colorPalette="blue" loading={start.isPending} onClick={() => act(() => start.mutateAsync(b.id), "Booking started")}>Start</Button>}
            {(b.status === "confirmed" || b.status === "in_progress") && <Button colorPalette="purple" loading={complete.isPending} onClick={() => act(() => complete.mutateAsync(b.id), "Booking completed")}>Complete</Button>}
            {canCancel && <Button colorPalette="red" variant="outline" loading={cancel.isPending} onClick={() => act(() => cancel.mutateAsync({ id: b.id, reason: "Cancelled by staff" }), "Booking cancelled")}>Cancel</Button>}
            {canNoShow && <Button variant="outline" loading={noShow.isPending} onClick={() => act(() => noShow.mutateAsync({ id: b.id, reason: "Marked as no-show" }), "Marked as no-show")}>No-Show</Button>}
            {b.status === "completed" && b.payment_status !== "completed" && b.payment_option === "later" && Number(b.price ?? b.service?.price ?? 0) > 0 && <Button colorPalette="green" variant="outline" loading={collectPayment.isPending} onClick={() => act(() => collectPayment.mutateAsync({ id: b.id, payload: { payment_method: "cash", amount: Number(b.price ?? b.service?.price ?? 0) } }), "Payment collected")}>Collect Payment</Button>}
            {b.payment_option === "now" && !(b.payment_status === "paid" || b.payment_status === "success" || b.payment_status === "completed") && Number(b.price ?? b.service?.price ?? 0) > 0 && <Button colorPalette="green" loading={initializePayment.isPending} onClick={() => act(() => initializePayment.mutateAsync({ amount: Number(b.price ?? b.service?.price ?? 0), customer_email: b.guest_email ?? b.customer?.email ?? "", customer_name: b.is_guest ? (b.guest_name ?? undefined) : (b.customer?.first_name ?? undefined), booking_id: b.id, user_type: "free" }), "Pay now")}>Pay Now</Button>}
            {canManage && <Button colorPalette="red" variant="outline" onClick={() => setDeleteOpen(true)}><LuTrash2 /> Delete booking</Button>}
            <Button variant="ghost" onClick={() => navigate("/bookings")}>Close</Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Grid>
    <BookingFormDialog
      open={editOpen}
      onOpenChange={setEditOpen}
      booking={b}
      staff={staffOptions}
      services={serviceOptions}
      customers={b.customer ? [b.customer] : []}
    />
    <Dialog.Root open={deleteOpen} onOpenChange={(event) => setDeleteOpen(event.open)}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>Delete booking?</Dialog.Title></Dialog.Header>
        <Dialog.Body><Text>This permanently deletes booking #{b.id.slice(0, 8)}.</Text></Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => setDeleteOpen(false)}>Keep booking</Button>
          <Button colorPalette="red" loading={deleteBooking.isPending} onClick={onDelete}>Delete booking</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </Stack>;
}
