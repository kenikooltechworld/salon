import { useMemo, useState } from "react";
import { Badge, Box, Button, Card, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Skeleton, Stack, Table, Text } from "@chakra-ui/react";
import { LuCalendarPlus, LuEye, LuSearch } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { useBookings, useUpdateBooking, type Booking, type AppointmentStatus } from "@/features/bookings";
import { BookingFormDialog } from "./BookingFormDialog";
import { BookingStatusBadge } from "./BookingStatusBadge";

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [staffId, setStaffId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Booking | null>(null);

  const { data: bookings = [], isLoading, isError, refetch } = useBookings({ status: status || undefined, staff_id: staffId || undefined });
  const update = useUpdateBooking();
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=100")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=100")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : staffQ.data?.staff || [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];

  const nameBy = (arr: any[], id: string | null | undefined) => { if (!id) return "—"; const item = arr.find((x) => String(x.id) === String(id)); if (!item) return id; return item.name || [item.first_name, item.last_name].filter(Boolean).join(" ") || item.email || id; };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const cust = b.is_guest ? (b.guest_name || "Guest") : nameBy(customers, b.customer_id);
      const svc = nameBy(services, b.service_id);
      const st = nameBy(staff, b.staff_id);
      return [cust, svc, st, b.status, b.id].some((v) => String(v).toLowerCase().includes(q));
    });
  }, [bookings, search, customers, services, staff]);

  const quickStatus = async (id: string, next: AppointmentStatus, label: string) => {
    try { await update.mutateAsync({ id, payload: { status: next } }); toaster.create({ title: label, type: "success" }); }
    catch (e: any) { toaster.create({ title: "Action failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
      <Box><Heading size="xl">Bookings</Heading><Text color="fg.muted">Manage appointments and track their status</Text></Box>
      <Button colorPalette="brand" onClick={() => { setEditing(null); setOpen(true); }}><LuCalendarPlus /> New Booking</Button>
    </Flex>

    <SimpleGrid columns={{ base: 2, md: 4 }} gap="3">
      {[["Total", bookings.length], ["Scheduled", bookings.filter((b) => b.status === "scheduled").length], ["Confirmed", bookings.filter((b) => b.status === "confirmed").length], ["Completed", bookings.filter((b) => b.status === "completed").length]].map(([label, val]) => (
        <Card.Root key={String(label)}><Card.Body><Text fontSize="sm" color="fg.muted">{label}</Text><Heading size="lg">{val}</Heading></Card.Body></Card.Root>
      ))}
    </SimpleGrid>

    <Flex gap="3" direction={{ base: "column", md: "row" }}>
      <HStack flex="1"><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search by customer, service, staff..." value={search} onChange={(e) => setSearch(e.target.value)} /></HStack>
      <NativeSelect.Root maxW={{ md: "200px" }}><NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <NativeSelect.Root maxW={{ md: "240px" }}><NativeSelect.Field value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">All staff</option>{staff.map((s: any) => <option key={s.id} value={s.id}>{[s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || s.email || s.id}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </Flex>

    {isError && <Card.Root><Card.Body><Text color="fg.error">Failed to load bookings.</Text><Button mt="2" size="sm" onClick={() => refetch()}>Retry</Button></Card.Body></Card.Root>}

    <Card.Root><Card.Body p="0">
      <Box overflowX="auto" display={{ base: "none", md: "block" }}>
        <Table.Root size="sm">
          <Table.Header><Table.Row><Table.ColumnHeader>Date/Time</Table.ColumnHeader><Table.ColumnHeader>Customer</Table.ColumnHeader><Table.ColumnHeader>Service</Table.ColumnHeader><Table.ColumnHeader>Staff</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Price</Table.ColumnHeader><Table.ColumnHeader>Actions</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {isLoading ? [...Array(5)].map((_, i) => <Table.Row key={i}>{[...Array(7)].map((__, j) => <Table.Cell key={j}><Skeleton h="4" /></Table.Cell>)}</Table.Row>)
            : filtered.map((b) => <Table.Row key={b.id} _hover={{ bg: "bg.muted" }}>
              <Table.Cell><Text fontSize="sm" fontWeight="medium">{new Date(b.start_time).toLocaleString()}</Text><Text fontSize="xs" color="fg.muted">{new Date(b.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - {new Date(b.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></Table.Cell>
              <Table.Cell>{b.is_guest ? <HStack gap="1"><Text>{b.guest_name || "Guest"}</Text><Badge size="sm">Guest</Badge></HStack> : nameBy(customers, b.customer_id)}</Table.Cell>
              <Table.Cell>{nameBy(services, b.service_id)}</Table.Cell>
              <Table.Cell>{nameBy(staff, b.staff_id)}</Table.Cell>
              <Table.Cell><BookingStatusBadge status={b.status} /></Table.Cell>
              <Table.Cell textAlign="end">{formatNaira(b.price)}</Table.Cell>
              <Table.Cell><HStack gap="1">
                <Button size="xs" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><LuEye /> View</Button>
                {b.status === "scheduled" && <Button size="xs" variant="outline" colorPalette="green" loading={update.isPending} onClick={() => quickStatus(b.id, "confirmed", "Booking confirmed")}>Confirm</Button>}
                {b.status === "confirmed" && <Button size="xs" variant="outline" colorPalette="purple" loading={update.isPending} onClick={() => quickStatus(b.id, "completed", "Booking completed")}>Complete</Button>}
                {(b.status === "scheduled" || b.status === "confirmed") && <Button size="xs" variant="outline" colorPalette="red" loading={update.isPending} onClick={() => quickStatus(b.id, "cancelled", "Booking cancelled")}>Cancel</Button>}
              </HStack></Table.Cell>
            </Table.Row>)}
            {!isLoading && filtered.length === 0 && <Table.Row><Table.Cell colSpan={7}><Text color="fg.muted" py="8" textAlign="center">No bookings found.</Text></Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Box>

      <Stack display={{ base: "flex", md: "none" }} p="4" gap="3">
        {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} h="28" rounded="md" />)
        : filtered.map((b) => <Card.Root key={b.id} variant="outline"><Card.Body gap="3">
          <Flex justify="space-between" gap="2"><Box><Text fontWeight="semibold" fontSize="sm">{b.is_guest ? b.guest_name || "Guest" : nameBy(customers, b.customer_id)}</Text><Text fontSize="xs" color="fg.muted">{new Date(b.start_time).toLocaleString()}</Text></Box><BookingStatusBadge status={b.status} /></Flex>
          <Text fontSize="sm">{nameBy(services, b.service_id)} • {nameBy(staff, b.staff_id)}</Text>
          <Flex justify="space-between" align="center"><Text fontWeight="medium">{formatNaira(b.price)}</Text><HStack gap="1"><Button size="xs" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}>View</Button>{b.status === "scheduled" && <Button size="xs" colorPalette="green" variant="outline" onClick={() => quickStatus(b.id, "confirmed", "Booking confirmed")}>Confirm</Button>}</HStack></Flex>
        </Card.Body></Card.Root>)}
        {!isLoading && filtered.length === 0 && <Text color="fg.muted" py="6" textAlign="center">No bookings found.</Text>}
      </Stack>
    </Card.Body></Card.Root>

    <BookingFormDialog open={open} onOpenChange={setOpen} booking={editing} staff={staff} services={services} customers={customers} />
  </Stack>;
}
