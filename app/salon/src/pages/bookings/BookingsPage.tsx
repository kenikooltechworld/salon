import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Card, CloseButton, Dialog, Field, Flex, Grid, Heading, HStack, IconButton, Image, Input,
  NativeSelect, Portal, SimpleGrid, Skeleton, Stack, Table, Tabs, Text, Textarea,
} from "@chakra-ui/react";
import { LuCalendar, LuCreditCard, LuEye, LuLayoutGrid, LuList, LuPlus, LuSearch } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import {
  bookingsApi, useBookings, useCancelBooking, useCompleteBooking, useConfirmBooking, useNoShowBooking, type Booking,
} from "@/features/bookings";
import { getStaffDisplayName, getStaffImageUrl } from "@/features/staff";

const STATUS_OPTIONS = ["scheduled", "confirmed", "in_progress", "completed", "cancelled", "no_show"] as const;
const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const statusColor: Record<string, string> = {
  scheduled: "blue", confirmed: "green", in_progress: "purple", completed: "gray", cancelled: "red", no_show: "orange",
};

function StatusBadge({ status }: { status: string }) {
  return <Badge colorPalette={statusColor[status] || "gray"} variant="subtle" textTransform="capitalize">{status.replace(/_/g, " ")}</Badge>;
}

function fmtDate(iso: string) { return new Date(iso).toLocaleDateString(); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function dayKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

function getCalendarRange(view: "day" | "week" | "month", current: Date) {
  const start = new Date(current); const end = new Date(current);
  if (view === "day") { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
  else if (view === "week") { const day = start.getDay(); start.setDate(start.getDate()-day); start.setHours(0,0,0,0); end.setDate(start.getDate()+6); end.setHours(23,59,59,999); }
  else { start.setDate(1); start.setHours(0,0,0,0); end.setMonth(start.getMonth()+1, 0); end.setHours(23,59,59,999); }
  return { start_date: start.toISOString(), end_date: end.toISOString() };
}

function useLookupMaps() {
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=100&active_only=false")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=100")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];
  const find = (arr: any[], id?: string | null) => id ? arr.find((item) => String(item.id) === String(id)) : undefined;
  const customerName = (id?: string | null) => {
    const customer = find(customers, id);
    return customer ? [customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email || "Customer" : id ? id.slice(0, 8) : "—";
  };
  const serviceName = (id?: string | null) => find(services, id)?.name || (id ? id.slice(0, 8) : "—");
  const staffName = (id?: string | null) => getStaffDisplayName(find(staff, id), id ? id.slice(0, 8) : "—");
  return {
    staff, services, customers, findStaff: (id?: string | null) => find(staff, id),
    findService: (id?: string | null) => find(services, id), findCustomer: (id?: string | null) => find(customers, id),
    staffName, serviceName, customerName,
  };
}

function BookingCardItem({ booking: b, lookups, onView, onConfirm, onCancel, onComplete, onNoShow, onCollect, busy }: any) {
  const canCancel = ["scheduled", "confirmed", "in_progress"].includes(b.status);
  const canNoShow = b.status === "scheduled" || b.status === "confirmed";
  const staff = lookups.findStaff(b.staff_id);
  const service = lookups.findService(b.service_id);
  const customer = lookups.findCustomer(b.customer_id);
  const staffName = getStaffDisplayName(staff, "Staff member");
  const customerName = b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id);
  return <Card.Root _hover={{ shadow: "md" }} transition="shadow 0.2s"><Card.Body gap="3">
    <Flex justify="space-between" gap="2" align="flex-start">
      <Box minW="0"><Text fontWeight="semibold" fontSize="sm" lineClamp="1">Booking #{b.id.slice(0, 8)}</Text><Text fontSize="xs" color="fg.muted">{fmtDate(b.start_time)}</Text></Box>
      <StatusBadge status={b.status} />
    </Flex>
    <Stack gap="2" borderTopWidth="1px" pt="3">
      <HStack gap="3" minW="0">
        <Box w="12" h="12" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">
          {service?.public_image_url ? <Image src={service.public_image_url} alt={service.name} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" color="fg.muted">{service?.name?.slice(0, 1) || "S"}</Flex>}
        </Box>
        <Box minW="0"><Text fontSize="xs" color="fg.muted">Service</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{lookups.serviceName(b.service_id)}</Text></Box>
      </HStack>
      <HStack gap="3" minW="0">
        {b.is_guest ? <Avatar.Root size="sm"><Avatar.Fallback name={customerName} /></Avatar.Root> : <Avatar.Root size="sm"><Avatar.Image src={customer?.profile_image_url || undefined} /><Avatar.Fallback name={customerName} /></Avatar.Root>}
        <Box minW="0"><Text fontSize="xs" color="fg.muted">{b.is_guest ? "Guest" : "Customer"}</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{customerName}</Text></Box>
        <Avatar.Root size="sm" ml="auto"><Avatar.Image src={getStaffImageUrl(staff)} /><Avatar.Fallback name={staffName} /></Avatar.Root>
        <Box minW="0"><Text fontSize="xs" color="fg.muted">Staff</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{staffName}</Text></Box>
      </HStack>
    </Stack>
    <Grid templateColumns="1fr 1fr" gap="2" fontSize="sm">
      <Box><Text fontSize="xs" color="fg.muted">Start Time</Text><Text fontWeight="medium">{fmtTime(b.start_time)}</Text></Box>
      <Box><Text fontSize="xs" color="fg.muted">End Time</Text><Text fontWeight="medium">{fmtTime(b.end_time)}</Text></Box>
      <Box><Text fontSize="xs" color="fg.muted">Price</Text><Text fontWeight="medium">{b.price ? formatNaira(b.price) : "N/A"}</Text></Box>
      {b.location_id && <Box minW="0"><Text fontSize="xs" color="fg.muted">Location</Text><Text fontWeight="medium" lineClamp="1">{b.location_id}</Text></Box>}
    </Grid>
    {b.notes && <Box fontSize="sm"><Text fontSize="xs" color="fg.muted">Notes</Text><Text lineClamp="2">{b.notes}</Text></Box>}
    <Flex gap="2" pt="2" borderTopWidth="1px" overflowX="auto" flexWrap="nowrap">
      <Button size="sm" variant="outline" flexShrink="0" onClick={() => onView(b.id)}><LuEye /> View</Button>
      {b.status === "scheduled" && <Button size="sm" flexShrink="0" colorPalette="green" loading={busy} onClick={() => onConfirm(b.id)}>Confirm</Button>}
      {(b.status === "confirmed" || b.status === "in_progress") && <Button size="sm" flexShrink="0" colorPalette="green" loading={busy} onClick={() => onComplete(b.id)}>Complete</Button>}
      {canCancel && <Button size="sm" flexShrink="0" colorPalette="red" variant="outline" loading={busy} onClick={() => onCancel(b.id)}>Cancel</Button>}
      {canNoShow && <Button size="sm" flexShrink="0" variant="outline" loading={busy} onClick={() => onNoShow(b.id)}>No-Show</Button>}
      {b.status === "completed" && b.payment_option === "later" && b.payment_status !== "completed" && Number(b.price ?? service?.price ?? 0) > 0 && <Button size="sm" flexShrink="0" colorPalette="green" variant="outline" onClick={() => onCollect(b)}><LuCreditCard /> Collect Payment</Button>}
    </Flex>
  </Card.Body></Card.Root>;
}

function ListTable({ bookings, lookups, onView, onConfirm, onCancel, busy, isLoading }: any) {
  return <>
    <Box display={{ base: "none", md: "block" }} borderWidth="1px" rounded="lg" overflowX="auto">
      <Table.Root size="sm">
        <Table.Header><Table.Row bg="bg.subtle"><Table.ColumnHeader>ID</Table.ColumnHeader><Table.ColumnHeader>Customer</Table.ColumnHeader><Table.ColumnHeader>Service</Table.ColumnHeader><Table.ColumnHeader>Staff</Table.ColumnHeader><Table.ColumnHeader>Date</Table.ColumnHeader><Table.ColumnHeader>Time</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader>Actions</Table.ColumnHeader></Table.Row></Table.Header>
        <Table.Body>
          {isLoading ? [...Array(5)].map((_, i) => <Table.Row key={i}>{[...Array(8)].map((__, j) => <Table.Cell key={j}><Skeleton h="4" /></Table.Cell>)}</Table.Row>)
          : bookings.map((b: Booking) => <Table.Row key={b.id} _hover={{ bg: "bg.subtle" }}>
            <Table.Cell fontFamily="mono" fontSize="xs">{b.id.slice(0, 8)}</Table.Cell>
            <Table.Cell><HStack gap="2" minW="32"><Avatar.Root size="xs"><Avatar.Image src={lookups.findCustomer(b.customer_id)?.profile_image_url || undefined} /><Avatar.Fallback name={b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id)} /></Avatar.Root><Text fontSize="sm" lineClamp="1">{b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id)}</Text></HStack></Table.Cell>
            <Table.Cell><HStack gap="2" minW="32"><Box w="8" h="8" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">{lookups.findService(b.service_id)?.public_image_url ? <Image src={lookups.findService(b.service_id).public_image_url} alt={lookups.serviceName(b.service_id)} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" fontSize="xs" color="fg.muted">{lookups.serviceName(b.service_id).slice(0, 1)}</Flex>}</Box><Text fontSize="sm" lineClamp="1">{lookups.serviceName(b.service_id)}</Text></HStack></Table.Cell>
            <Table.Cell><HStack gap="2" minW="32"><Avatar.Root size="xs"><Avatar.Image src={getStaffImageUrl(lookups.findStaff(b.staff_id))} /><Avatar.Fallback name={lookups.staffName(b.staff_id)} /></Avatar.Root><Text fontSize="sm" lineClamp="1">{lookups.staffName(b.staff_id)}</Text></HStack></Table.Cell>
            <Table.Cell fontSize="sm">{fmtDate(b.start_time)}</Table.Cell>
            <Table.Cell fontSize="sm" whiteSpace="nowrap">{fmtTime(b.start_time)} - {fmtTime(b.end_time)}</Table.Cell>
            <Table.Cell><StatusBadge status={b.status} /></Table.Cell>
            <Table.Cell><HStack gap="1"><IconButton aria-label="View" size="xs" variant="ghost" onClick={() => onView(b.id)}><LuEye /></IconButton>{b.status === "scheduled" && <Button size="xs" variant="ghost" colorPalette="green" loading={busy} onClick={() => onConfirm(b.id)}>Confirm</Button>}{(b.status === "scheduled" || b.status === "confirmed") && <Button size="xs" variant="ghost" colorPalette="red" loading={busy} onClick={() => onCancel(b.id)}>Cancel</Button>}</HStack></Table.Cell>
          </Table.Row>)}
          {!isLoading && bookings.length === 0 && <Table.Row><Table.Cell colSpan={8}><Text textAlign="center" color="fg.muted" py="8">No bookings found</Text></Table.Cell></Table.Row>}
        </Table.Body>
      </Table.Root>
    </Box>
    <Stack display={{ base: "flex", md: "none" }} gap="3">
      {isLoading ? [...Array(3)].map((_, i) => <Skeleton key={i} h="32" rounded="lg" />)
      : bookings.length > 0 ? bookings.map((b: Booking) => {
        const customer = lookups.findCustomer(b.customer_id);
        const service = lookups.findService(b.service_id);
        const staff = lookups.findStaff(b.staff_id);
        const customerName = b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id);
        const staffName = getStaffDisplayName(staff, "Staff member");
        return <Card.Root key={b.id}><Card.Body gap="3">
          <Flex justify="space-between"><Box><Text fontSize="xs" color="fg.muted">ID</Text><Text fontWeight="semibold" fontSize="sm">{b.id.slice(0, 8)}</Text></Box><StatusBadge status={b.status} /></Flex>
          <HStack gap="3" minW="0">
            <Box w="12" h="12" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">
              {service?.public_image_url ? <Image src={service.public_image_url} alt={service.name} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" color="fg.muted">{service?.name?.slice(0, 1) || "S"}</Flex>}
            </Box>
            <Box minW="0"><Text fontSize="xs" color="fg.muted">Service</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{lookups.serviceName(b.service_id)}</Text></Box>
          </HStack>
          <Flex justify="space-between" gap="3" wrap="wrap">
            <HStack gap="2" minW="0" flex="1">
              <Avatar.Root size="sm"><Avatar.Image src={customer?.profile_image_url || undefined} /><Avatar.Fallback name={customerName} /></Avatar.Root>
              <Box minW="0"><Text fontSize="xs" color="fg.muted">{b.is_guest ? "Guest" : "Customer"}</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{customerName}</Text></Box>
            </HStack>
            <HStack gap="2" minW="0" flex="1">
              <Avatar.Root size="sm"><Avatar.Image src={getStaffImageUrl(staff)} /><Avatar.Fallback name={staffName} /></Avatar.Root>
              <Box minW="0"><Text fontSize="xs" color="fg.muted">Staff</Text><Text fontWeight="medium" fontSize="sm" lineClamp="1">{staffName}</Text></Box>
            </HStack>
          </Flex>
          <Text fontSize="xs" color="fg.muted">{fmtDate(b.start_time)} {fmtTime(b.start_time)} - {fmtTime(b.end_time)}</Text>
          <Flex gap="2" pt="2" borderTopWidth="1px"><Button size="xs" variant="outline" flex="1" onClick={() => onView(b.id)}>View</Button>{b.status === "scheduled" && <Button size="xs" colorPalette="green" flex="1" loading={busy} onClick={() => onConfirm(b.id)}>Confirm</Button>}{(b.status === "scheduled" || b.status === "confirmed") && <Button size="xs" colorPalette="red" variant="outline" flex="1" loading={busy} onClick={() => onCancel(b.id)}>Cancel</Button>}</Flex>
        </Card.Body></Card.Root>;
      })
      : <Text textAlign="center" color="fg.muted" py="8">No bookings found</Text>}
    </Stack>
  </>;
}

function CalendarPanel({ view, current, bookings, onBookingClick, onPrev, onNext, onViewChange, lookups }: any) {
  const days = useMemo(() => {
    if (view === "day") return [new Date(current)];
    if (view === "week") { const s = new Date(current); s.setDate(s.getDate()-s.getDay()); return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate()+i); return d; }); }
    const first = new Date(current.getFullYear(), current.getMonth(), 1); const start = new Date(first); start.setDate(first.getDate()-first.getDay());
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
  }, [view, current]);
  const byDay = useMemo(() => { const m = new Map<string, Booking[]>(); for (const b of bookings) { const k = dayKey(new Date(b.start_time)); m.set(k, [...(m.get(k)||[]), b]); } return m; }, [bookings]);
  const byHour = useMemo(() => {
    const m = new Map<number, Booking[]>();
    for (const b of byDay.get(dayKey(current)) || []) {
      const hour = new Date(b.start_time).getHours();
      m.set(hour, [...(m.get(hour) || []), b]);
    }
    return m;
  }, [byDay, current]);
  const label = view === "day" ? current.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : view === "week" ? `${days[0].toLocaleDateString()} - ${days[6].toLocaleDateString()}`
    : current.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return <Stack gap="4">
    <Flex justify="space-between" gap="3" direction={{ base: "column", sm: "row" }} align={{ sm: "center" }}>
      <HStack gap="2">{(["day","week","month"] as const).map((v) => <Button key={v} size="sm" variant={view===v?"solid":"outline"} colorPalette={view===v?"brand":"gray"} onClick={() => onViewChange(v)} textTransform="capitalize">{v}</Button>)}</HStack>
      <HStack gap="2" justify={{ base: "space-between", sm: "flex-end" }} w={{ base: "full", sm: "auto" }}>
        <Button size="sm" variant="outline" onClick={onPrev}>← Prev</Button>
        <Text fontSize="sm" fontWeight="medium" minW={{ sm: "220px" }} textAlign="center">{label}</Text>
        <Button size="sm" variant="outline" onClick={onNext}>Next →</Button>
      </HStack>
    </Flex>
    {view === "day" ? <Box maxH="560px" overflowY="auto" pr="1">
      <Stack gap="1">
        {Array.from({ length: 24 }, (_, hour) => (
          <Grid key={hour} templateColumns={{ base: "42px minmax(0, 1fr)", sm: "56px minmax(0, 1fr)" }} gap="2">
            <Text textAlign="right" pt="2" fontSize="xs" color="fg.muted">{String(hour).padStart(2, "0")}:00</Text>
            <Stack minH="48px" borderLeftWidth="1px" borderColor="border" pl="2" gap="1">
              {(byHour.get(hour) || []).map((b) => (
                <Button
                  key={b.id}
                  variant="outline"
                  size="sm"
                  h="auto"
                  minH="40px"
                  whiteSpace="normal"
                  justifyContent="flex-start"
                  textAlign="left"
                  colorPalette={statusColor[b.status] || "gray"}
                  onClick={() => onBookingClick(b.id)}
                >
                  <Box minW="0">
                    <Text fontSize="xs" fontWeight="medium" lineClamp="1">
                      {fmtTime(b.start_time)} - {fmtTime(b.end_time)} · {b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id)}
                    </Text>
                    <HStack gap="1" minW="0"><Image src={lookups.findService(b.service_id)?.public_image_url || undefined} alt="" boxSize="3" rounded="sm" objectFit="cover" /><Text fontSize="10px" color="fg.muted" lineClamp="1">{lookups.serviceName(b.service_id)}</Text></HStack>
                  </Box>
                </Button>
              ))}
            </Stack>
          </Grid>
        ))}
      </Stack>
    </Box> : <Box overflowX="auto">
      <Grid minW={{ base: "720px", md: "0" }} templateColumns="repeat(7, minmax(0, 1fr))" gap="2">
        {view === "month" && ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <Box key={d} px="2" py="1" fontSize="xs" fontWeight="semibold" color="fg.muted" textAlign="center">{d}</Box>)}
        {days.map((d) => {
          const k = dayKey(d);
          const items = byDay.get(k) || [];
          const inMonth = d.getMonth() === current.getMonth();
          return <Card.Root key={k} variant="outline" minH={{ base: "100px", sm: "120px" }} opacity={view === "month" && !inMonth ? 0.45 : 1} minW="0">
            <Card.Body p={{ base: "1.5", sm: "2" }} gap="1">
              <Flex justify="space-between" align="center">
                <Text fontSize="xs" fontWeight="semibold">{view === "week" ? d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : d.getDate()}</Text>
                {items.length > 0 && <Badge size="xs" colorPalette="brand">{items.length}</Badge>}
              </Flex>
              <Stack gap="1">
                {items.slice(0, 3).map((b) => <Box key={b.id} px="2" py="1" rounded="md" bg={`${statusColor[b.status]||"gray"}.subtle`} cursor="pointer" onClick={() => onBookingClick(b.id)} _hover={{ opacity: 0.85 }}>
                  <Text fontSize="xs" fontWeight="medium" lineClamp="1">{fmtTime(b.start_time)} {b.is_guest ? b.guest_name || "Guest" : lookups.customerName(b.customer_id)}</Text>
                  <HStack gap="1" minW="0"><Image src={lookups.findService(b.service_id)?.public_image_url || undefined} alt="" boxSize="3" rounded="sm" objectFit="cover" /><Text fontSize="10px" color="fg.muted" lineClamp="1">{lookups.serviceName(b.service_id)}</Text></HStack>
                </Box>)}
                {items.length > 3 && <Button size="xs" variant="ghost" justifyContent="flex-start" onClick={() => onBookingClick(items[0].id)}>+{items.length - 3} more</Button>}
              </Stack>
            </Card.Body>
          </Card.Root>;
        })}
      </Grid>
    </Box>}
  </Stack>;
}

export default function BookingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(() => localStorage.getItem("bookingsTab") || "list");
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState(""); const [staffFilter, setStaffFilter] = useState("");
  const [page, setPage] = useState(1); const [calendarView, setCalendarView] = useState<"day"|"week"|"month">("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [collectTarget, setCollectTarget] = useState<Booking | null>(null);
  const [collectAmount, setCollectAmount] = useState(""); const [collectMethod, setCollectMethod] = useState("cash"); const [collectNotes, setCollectNotes] = useState("");
  const pageSize = 20;
  useEffect(() => { localStorage.setItem("bookingsTab", tab); }, [tab]);

  const range = useMemo(() => getCalendarRange(calendarView, currentDate), [calendarView, currentDate]);
  const listParams = useMemo(() => ({ status: statusFilter || undefined, staff_id: staffFilter || undefined, search: search || undefined, page, page_size: pageSize }), [statusFilter, staffFilter, search, page]);
  const calParams = useMemo(() => ({ status: statusFilter || undefined, staff_id: staffFilter || undefined, search: search || undefined, ...range, page: 1, page_size: 100 }), [statusFilter, staffFilter, search, range]);

  const listQ = useBookings(tab !== "calendar" ? listParams : { page: 1, page_size: 1 });
  const calQ = useBookings(tab === "calendar" ? calParams : { page: 1, page_size: 1 });
  const confirm = useConfirmBooking(); const complete = useCompleteBooking(); const cancel = useCancelBooking(); const noShow = useNoShowBooking();
  const lookups = useLookupMaps();

  const bookings = listQ.data?.appointments || []; const total = listQ.data?.total || 0;
  const calBookings = calQ.data?.appointments || []; const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const busy = confirm.isPending || complete.isPending || cancel.isPending || noShow.isPending;
  const totalQ = useBookings({ page: 1, page_size: 1 });
  const scheduledQ = useBookings({ status: "scheduled", page: 1, page_size: 1 });
  const confirmedQ = useBookings({ status: "confirmed", page: 1, page_size: 1 });
  const completedQ = useBookings({ status: "completed", page: 1, page_size: 1 });

  const act = async (fn: () => Promise<any>, msg: string) => { try { await fn(); toaster.create({ title: msg, type: "success" }); } catch (e: any) { toaster.create({ title: "Action failed", description: e?.response?.data?.detail || e?.message, type: "error" }); } };
  const onConfirm = (id: string) => act(() => confirm.mutateAsync(id), "Booking confirmed");
  const onComplete = (id: string) => act(() => complete.mutateAsync(id), "Booking completed");
  const onCancel = (id: string) => act(() => cancel.mutateAsync({ id, reason: "Cancelled by staff" }), "Booking cancelled");
  const onNoShow = (id: string) => act(() => noShow.mutateAsync({ id, reason: "Marked as no-show" }), "Marked as no-show");
  const onCollect = (b: Booking) => {
    const service = lookups.findService(b.service_id);
    setCollectTarget(b);
    setCollectAmount(String(b.price ?? service?.price ?? ""));
    setCollectMethod("cash");
    setCollectNotes("");
  };
  const submitCollect = async () => {
    if (!collectTarget) return;
    try {
      await bookingsApi.collectPayment(collectTarget.id, { payment_method: collectMethod, amount: Number(collectAmount), notes: collectNotes || undefined });
      toaster.create({ title: "Payment collected", type: "success" }); setCollectTarget(null); listQ.refetch(); calQ.refetch();
    } catch (e: any) { toaster.create({ title: "Failed to collect payment", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  const prev = () => setCurrentDate((d) => { const n = new Date(d); if (calendarView==="day") n.setDate(n.getDate()-1); else if (calendarView==="week") n.setDate(n.getDate()-7); else n.setMonth(n.getMonth()-1); return n; });
  const next = () => setCurrentDate((d) => { const n = new Date(d); if (calendarView==="day") n.setDate(n.getDate()+1); else if (calendarView==="week") n.setDate(n.getDate()+7); else n.setMonth(n.getMonth()+1); return n; });

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base: "column", sm: "row" }} align={{ sm: "center" }}>
      <Box><Heading size="xl">Bookings</Heading><Text color="fg.muted" fontSize="sm">Manage your bookings and appointments</Text></Box>
      <Button colorPalette="brand" onClick={() => navigate("/bookings/new")} w={{ base: "full", sm: "auto" }}><LuPlus /> New Booking</Button>
    </Flex>

    <SimpleGrid columns={{ base: 2, md: 4 }} gap="3">
      {[["Total", totalQ.data?.total || 0], ["Scheduled", scheduledQ.data?.total || 0], ["Confirmed", confirmedQ.data?.total || 0], ["Completed", completedQ.data?.total || 0]].map(([label, val]) => (
        <Card.Root key={String(label)}><Card.Body py="4"><Text fontSize="sm" color="fg.muted">{label}</Text><Heading size="lg">{val}</Heading></Card.Body></Card.Root>
      ))}
    </SimpleGrid>

    <Flex gap="3" direction={{ base: "column", md: "row" }}>
      <Box flex="1" position="relative"><Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="fg.muted" zIndex="1"><LuSearch /></Box>
        <Input pl="9" pr={search?"9":"3"} placeholder="Search by ID, guest, notes, service, staff..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        {search && <CloseButton size="xs" position="absolute" right="2" top="50%" transform="translateY(-50%)" onClick={() => setSearch("")} />}
      </Box>
      <NativeSelect.Root w={{ base: "full", md: "180px" }}><NativeSelect.Field value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}><option value="">All Status</option>{STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <NativeSelect.Root w={{ base: "full", md: "220px" }}><NativeSelect.Field value={staffFilter} onChange={(e) => { setStaffFilter(e.target.value); setPage(1); }}><option value="">All Staff</option>{lookups.staff.map((s: any) => <option key={s.id} value={s.id}>{getStaffDisplayName(s)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </Flex>

    <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)}>
      <Tabs.List><Tabs.Trigger value="list"><LuList /> <Text as="span" display={{ base: "none", sm: "inline" }}>List View</Text><Text as="span" display={{ base: "inline", sm: "none" }}>List</Text></Tabs.Trigger><Tabs.Trigger value="calendar"><LuCalendar /> <Text as="span" display={{ base: "none", sm: "inline" }}>Calendar View</Text><Text as="span" display={{ base: "inline", sm: "none" }}>Cal</Text></Tabs.Trigger><Tabs.Trigger value="cards"><LuLayoutGrid /> <Text as="span" display={{ base: "none", sm: "inline" }}>Card View</Text><Text as="span" display={{ base: "inline", sm: "none" }}>Cards</Text></Tabs.Trigger></Tabs.List>

      <Tabs.Content value="list" pt="4">
        {listQ.isError ? <Card.Root><Card.Body><Text color="fg.error">Failed to load bookings.</Text><Button mt="2" size="sm" onClick={() => listQ.refetch()}>Retry</Button></Card.Body></Card.Root>
        :         <ListTable bookings={bookings} lookups={lookups} isLoading={listQ.isLoading} busy={busy} onView={(id: string) => navigate(`/bookings/${id}`)} onConfirm={onConfirm} onCancel={onCancel} />}
        {totalPages > 1 && <HStack justify="center" mt="4" gap="3"><Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage((p) => p-1)}>Previous</Button><Text fontSize="sm" color="fg.muted">Page {page} of {totalPages}</Text><Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage((p) => p+1)}>Next</Button></HStack>}
      </Tabs.Content>

      <Tabs.Content value="calendar" pt="4">
        {calQ.isError ? <Card.Root><Card.Body><Text color="fg.error">Failed to load calendar.</Text><Button mt="2" size="sm" onClick={() => calQ.refetch()}>Retry</Button></Card.Body></Card.Root>
        : calQ.isLoading ? <Skeleton h="96" rounded="lg" /> : <Card.Root><Card.Body><CalendarPanel view={calendarView} current={currentDate} bookings={calBookings} lookups={lookups} onBookingClick={(id: string) => navigate(`/bookings/${id}`)} onPrev={prev} onNext={next} onViewChange={setCalendarView} /></Card.Body></Card.Root>}
      </Tabs.Content>

      <Tabs.Content value="cards" pt="4">
        {listQ.isError ? <Card.Root><Card.Body><Text color="fg.error">Failed to load bookings.</Text><Button mt="2" size="sm" onClick={() => listQ.refetch()}>Retry</Button></Card.Body></Card.Root>
        : listQ.isLoading ? <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="4">{[...Array(6)].map((_, i) => <Skeleton key={i} h="56" rounded="lg" />)}</SimpleGrid>
        : bookings.length > 0 ? <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap="4">{bookings.map((b) => <BookingCardItem key={b.id} booking={b} lookups={lookups} busy={busy} onView={(id: string) => navigate(`/bookings/${id}`)} onConfirm={onConfirm} onCancel={onCancel} onComplete={onComplete} onNoShow={onNoShow} onCollect={onCollect} />)}</SimpleGrid>
        : <Card.Root><Card.Body><Text textAlign="center" color="fg.muted" py="8">No bookings found</Text></Card.Body></Card.Root>}
        {totalPages > 1 && <HStack justify="center" mt="4" gap="3"><Button variant="outline" size="sm" disabled={page<=1} onClick={() => setPage((p) => p-1)}>Previous</Button><Text fontSize="sm" color="fg.muted">Page {page} of {totalPages}</Text><Button variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage((p) => p+1)}>Next</Button></HStack>}
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Root open={!!collectTarget} onOpenChange={(e) => { if (!e.open) setCollectTarget(null); }}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>Collect Payment</Dialog.Title></Dialog.Header>
        <Dialog.Body><Stack gap="4">
          <Text fontSize="sm" color="fg.muted">Record the full outstanding balance for booking #{collectTarget?.id.slice(0, 8)}.</Text>
          <Field.Root><Field.Label>Payment Method</Field.Label><NativeSelect.Root><NativeSelect.Field value={collectMethod} onChange={(e) => setCollectMethod(e.target.value)}><option value="cash">Cash</option><option value="card">Card</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option><option value="check">Check</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
          <Field.Root><Field.Label>Amount (₦)</Field.Label><Input type="number" value={collectAmount} readOnly /></Field.Root>
          <Field.Root><Field.Label>Notes (Optional)</Field.Label><Textarea value={collectNotes} onChange={(e) => setCollectNotes(e.target.value)} /></Field.Root>
        </Stack></Dialog.Body>
        <Dialog.Footer><Button variant="outline" onClick={() => setCollectTarget(null)}>Cancel</Button><Button colorPalette="green" onClick={submitCollect} disabled={!collectAmount || Number(collectAmount) <= 0}>Collect Payment</Button></Dialog.Footer>
        <Dialog.CloseTrigger asChild><CloseButton size="sm" /></Dialog.CloseTrigger>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  </Stack>;
}
