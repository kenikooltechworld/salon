import { useMemo, useState } from "react";
import { Badge, Box, Button, Card, Flex, Heading, HStack, Input, NativeSelect, SimpleGrid, Skeleton, Stack, Table, Text } from "@chakra-ui/react";
import { LuCalendarPlus, LuSearch } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatNaira } from "@/components/ui/naira";
import { useBookings } from "@/features/bookings";
import { BookingFormDialog } from "./BookingFormDialog";

const STATUS_COLOR: Record<string, string> = { scheduled: "blue", confirmed: "green", in_progress: "orange", completed: "purple", cancelled: "red", no_show: "gray" };

export default function BookingsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [staffId, setStaffId] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: bookings = [], isLoading } = useBookings({ status: status || undefined, staff_id: staffId || undefined });
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=200")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=200")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : staffQ.data?.staff || [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return bookings;
    return bookings.filter((b: any) => [b.guest_name, b.guest_email, b.customer_id, b.service_id, b.staff_id, b.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [bookings, search]);

  const nameBy = (arr: any[], id: string, keys: string[]) => { const item = arr.find((x) => String(x.id) === String(id)); if (!item) return id; for (const k of keys) if (item[k]) return item[k]; return [item.first_name, item.last_name].filter(Boolean).join(" ") || item.email || id; };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
      <Box><Heading size="xl">Bookings</Heading><Text color="fg.muted">Manage appointments, status, and booking details</Text></Box>
      <Button colorPalette="brand" onClick={() => { setEditing(null); setOpen(true); }}><LuCalendarPlus /> New Booking</Button>
    </Flex>

    <SimpleGrid columns={{ base: 1, md: 4 }} gap="3">
      <Card.Root><Card.Body><Text fontSize="sm" color="fg.muted">Total</Text><Heading size="lg">{bookings.length}</Heading></Card.Body></Card.Root>
      <Card.Root><Card.Body><Text fontSize="sm" color="fg.muted">Scheduled</Text><Heading size="lg">{bookings.filter((b: any) => b.status === "scheduled").length}</Heading></Card.Body></Card.Root>
      <Card.Root><Card.Body><Text fontSize="sm" color="fg.muted">Confirmed</Text><Heading size="lg">{bookings.filter((b: any) => b.status === "confirmed").length}</Heading></Card.Body></Card.Root>
      <Card.Root><Card.Body><Text fontSize="sm" color="fg.muted">Completed</Text><Heading size="lg">{bookings.filter((b: any) => b.status === "completed").length}</Heading></Card.Body></Card.Root>
    </SimpleGrid>

    <Flex gap="3" direction={{ base: "column", md: "row" }}>
      <HStack flex="1"><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search bookings..." value={search} onChange={(e) => setSearch(e.target.value)} /></HStack>
      <NativeSelect.Root maxW={{ md: "220px" }}><NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <NativeSelect.Root maxW={{ md: "260px" }}><NativeSelect.Field value={staffId} onChange={(e) => setStaffId(e.target.value)}><option value="">All staff</option>{staff.map((s: any) => <option key={s.id} value={s.id}>{[s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || s.email || s.id}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </Flex>

    <Card.Root><Card.Body p="0">
      <Box overflowX="auto">
        <Table.Root size="sm">
          <Table.Header><Table.Row><Table.ColumnHeader>When</Table.ColumnHeader><Table.ColumnHeader>Customer</Table.ColumnHeader><Table.ColumnHeader>Service</Table.ColumnHeader><Table.ColumnHeader>Staff</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Price</Table.ColumnHeader></Table.Row></Table.Header>
          <Table.Body>
            {isLoading ? <Table.Row><Table.Cell colSpan={6}><Skeleton h="10" /></Table.Cell></Table.Row>
            : filtered.map((b: any) => <Table.Row key={b.id} cursor="pointer" _hover={{ bg: "bg.muted" }} onClick={() => { setEditing(b); setOpen(true); }}>
              <Table.Cell><Text fontSize="sm" fontWeight="medium">{new Date(b.start_time).toLocaleString()}</Text><Text fontSize="xs" color="fg.muted">to {new Date(b.end_time).toLocaleTimeString()}</Text></Table.Cell>
              <Table.Cell>{b.is_guest ? (b.guest_name || "Guest") : nameBy(customers, b.customer_id, ["name", "full_name"])}</Table.Cell>
              <Table.Cell>{nameBy(services, b.service_id, ["name"])}</Table.Cell>
              <Table.Cell>{nameBy(staff, b.staff_id, ["name"])}</Table.Cell>
              <Table.Cell><Badge colorPalette={STATUS_COLOR[b.status] || "gray"}>{String(b.status).replace("_", " ")}</Badge></Table.Cell>
              <Table.Cell textAlign="end">{formatNaira(b.price)}</Table.Cell>
            </Table.Row>)}
            {!isLoading && filtered.length === 0 && <Table.Row><Table.Cell colSpan={6}><Text color="fg.muted" py="6" textAlign="center">No bookings found.</Text></Table.Cell></Table.Row>}
          </Table.Body>
        </Table.Root>
      </Box>
    </Card.Body></Card.Root>

    <BookingFormDialog open={open} onOpenChange={setOpen} booking={editing} staff={staff} services={services} customers={customers} />
  </Stack>;
}
