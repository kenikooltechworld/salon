import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Box, Button, Card, Field, Flex, Grid, Heading, HStack, Input, NativeSelect, SimpleGrid,
  Skeleton, Stack, Steps, Text, Textarea,
} from "@chakra-ui/react";
import { LuArrowLeft, LuCalendar, LuCheck, LuCreditCard, LuSearch, LuUser } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { useCreateBooking } from "@/features/bookings";

const steps = [{ title: "Customer" }, { title: "Service" }, { title: "Staff" }, { title: "Availability" }, { title: "Confirm" }];
const toIso = (d: string, t: string) => new Date(`${d}T${t}:00`).toISOString();
const todayStr = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

function addMinutes(hhmm: string, mins: number) { const [h, m] = hhmm.split(":").map(Number); const total = h * 60 + m + mins; const hh = Math.floor(total / 60); const mm = total % 60; return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; }

export default function BookingCreatePage() {
  const navigate = useNavigate();
  const create = useCreateBooking();
  const [step, setStep] = useState(0);
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    customer_id: "", guest_name: "", guest_email: "", guest_phone: "",
    service_id: "", staff_id: "", date: todayStr(), slot: "", notes: "",
    payment_option: "later" as "now" | "later", payment_status: "pending",
  });

  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=100&active_only=true")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=100")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];

  const selectedService = useMemo(() => services.find((s: any) => String(s.id) === String(form.service_id)), [services, form.service_id]);
  const selectedStaff = useMemo(() => staff.find((s: any) => String(s.id) === String(form.staff_id)), [staff, form.staff_id]);
  const selectedCustomer = useMemo(() => customers.find((c: any) => String(c.id) === String(form.customer_id)), [customers, form.customer_id]);
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase(); if (!q) return customers;
    return customers.filter((c: any) => [c.first_name, c.last_name, c.email, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [customers, search]);

  const slotsQ = useQuery({
    queryKey: ["availability", form.staff_id, form.service_id, form.date],
    queryFn: async () => {
      const res = await apiClient.get("/appointments/available-slots", { params: { service_id: form.service_id, staff_id: form.staff_id, date: form.date } });
      return res.data;
    },
    enabled: !!form.staff_id && !!form.service_id && !!form.date && step >= 3,
  });
  const slots = Array.isArray(slotsQ.data?.slots) ? slotsQ.data.slots : [];

  useEffect(() => { if (!form.service_id && services[0]) setForm((p) => ({ ...p, service_id: services[0].id })); }, [services, form.service_id]);
  useEffect(() => { if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(form.staff_id)) setForm((p) => ({ ...p, staff_id: "" })); }, [selectedService, form.staff_id]);

  const staffForService = useMemo(() => {
    if (!selectedService?.staff_ids?.length) return staff;
    return staff.filter((s: any) => selectedService.staff_ids.includes(s.id));
  }, [staff, selectedService]);

  const endTime = useMemo(() => { if (!form.slot || !selectedService) return ""; return addMinutes(form.slot, Number(selectedService.duration_minutes || 30)); }, [form.slot, selectedService]);

  const canNext = () => {
    if (step === 0) return customerMode === "existing" ? !!form.customer_id : !!form.guest_name.trim();
    if (step === 1) return !!form.service_id;
    if (step === 2) return !!form.staff_id;
    if (step === 3) return !!form.date && !!form.slot;
    return true;
  };

  const submit = async () => {
    if (!selectedService || !form.staff_id || !form.date || !form.slot || !endTime) return;
    try {
      const res = await create.mutateAsync({
        service_id: form.service_id,
        staff_id: form.staff_id,
        customer_id: customerMode === "existing" ? form.customer_id : null,
        start_time: toIso(form.date, form.slot),
        end_time: toIso(form.date, endTime),
        notes: form.notes || null,
        price: selectedService.price,
        is_guest: customerMode === "new",
        guest_name: customerMode === "new" ? form.guest_name : null,
        guest_email: customerMode === "new" ? form.guest_email || null : null,
        guest_phone: customerMode === "new" ? form.guest_phone || null : null,
        payment_option: form.payment_option,
        payment_status: form.payment_status,
      });
      const booking = (res as any)?.data ?? res;
      toaster.create({ title: "Booking created", type: "success" });
      navigate("/bookings/confirmation", { state: { booking } });
    } catch (e: any) {
      toaster.create({ title: "Create failed", description: e?.response?.data?.detail || e?.message, type: "error" });
    }
  };

  return <Stack gap="6">
    <Flex gap="3" align="center"><Button variant="ghost" size="sm" onClick={() => navigate("/bookings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Create Booking</Heading><Text color="fg.muted" fontSize="sm">Step {step + 1} of {steps.length}</Text></Box></Flex>

    <Steps.Root step={step} count={steps.length} size="sm" colorPalette="brand">
      <Steps.List>{steps.map((s, i) => <Steps.Item key={s.title} index={i}><Steps.Indicator /><Steps.Title display={{ base: "none", md: "inline" }}>{s.title}</Steps.Title><Steps.Separator /></Steps.Item>)}</Steps.List>
    </Steps.Root>

    <Card.Root><Card.Body>
      {step === 0 && <Stack gap="4">
        <Box><Heading size="md">Select Customer</Heading><Text fontSize="sm" color="fg.muted">Choose an existing customer or create a guest booking.</Text></Box>
        <HStack gap="2"><Button size="sm" variant={customerMode==="existing"?"solid":"outline"} colorPalette={customerMode==="existing"?"brand":"gray"} onClick={() => setCustomerMode("existing")}>Existing Customer</Button><Button size="sm" variant={customerMode==="new"?"solid":"outline"} colorPalette={customerMode==="new"?"brand":"gray"} onClick={() => setCustomerMode("new")}>Guest / New</Button></HStack>
        {customerMode === "existing" ? <>
          <Box position="relative"><Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="fg.muted"><LuSearch /></Box><Input pl="9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} /></Box>
          {customersQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="20" />)}</SimpleGrid>
          : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3" maxH="420px" overflowY="auto">{filteredCustomers.map((c: any) => {
              const selected = String(form.customer_id) === String(c.id);
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id;
              return <Card.Root key={c.id} variant="outline" cursor="pointer" borderColor={selected ? "brand.solid" : undefined} bg={selected ? "brand.subtle" : undefined} onClick={() => setForm({ ...form, customer_id: c.id })}>
                <Card.Body py="3"><Flex justify="space-between" gap="3"><HStack gap="3"><Avatar.Root size="sm"><Avatar.Fallback name={name} /></Avatar.Root><Box><Text fontWeight="medium" fontSize="sm">{name}</Text><Text fontSize="xs" color="fg.muted">{c.email}</Text><Text fontSize="xs" color="fg.muted">{c.phone}</Text></Box></HStack>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex></Card.Body>
              </Card.Root>;
            })}{filteredCustomers.length === 0 && <Text color="fg.muted">No customers found.</Text>}</SimpleGrid>}
        </> : <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="4">
          <Field.Root required><Field.Label>Guest name</Field.Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></Field.Root>
          <Field.Root><Field.Label>Email</Field.Label><Input value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} /></Field.Root>
          <Field.Root><Field.Label>Phone</Field.Label><Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></Field.Root>
        </Grid>}
      </Stack>}

      {step === 1 && <Stack gap="4">
        <Box><Heading size="md">Select Service</Heading><Text fontSize="sm" color="fg.muted">Choose the service for this booking.</Text></Box>
        {servicesQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="28" />)}</SimpleGrid>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{services.map((s: any) => { const selected = String(form.service_id) === String(s.id); return <Card.Root key={s.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => setForm({ ...form, service_id: s.id, slot: "" })}><Card.Body gap="2"><Flex justify="space-between" gap="3"><Box><Text fontWeight="semibold">{s.name}</Text><Text fontSize="xs" color="fg.muted">{s.category}</Text></Box>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex><Text fontSize="sm" color="fg.muted" lineClamp="2">{s.description || "No description"}</Text><HStack justify="space-between" fontSize="sm"><Text>{s.duration_minutes} min</Text><Text fontWeight="semibold">{formatNaira(s.price)}</Text></HStack></Card.Body></Card.Root>; })}</SimpleGrid>}
      </Stack>}

      {step === 2 && <Stack gap="4">
        <Box><Heading size="md">Select Staff</Heading><Text fontSize="sm" color="fg.muted">Choose who will provide the service.</Text></Box>
        {staffQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="20" />)}</SimpleGrid>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{staffForService.map((s: any) => { const selected = String(form.staff_id) === String(s.id); const name = [s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || s.email || s.id; return <Card.Root key={s.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => setForm({ ...form, staff_id: s.id, slot: "" })}><Card.Body py="3"><Flex justify="space-between" gap="3"><HStack gap="3"><Avatar.Root size="sm"><Avatar.Fallback name={name} />{s.profile_image_url && <Avatar.Image src={s.profile_image_url} />}</Avatar.Root><Box><Text fontWeight="medium" fontSize="sm">{name}</Text><Text fontSize="xs" color="fg.muted">{(s.specialties || []).join(", ") || s.email || "Staff member"}</Text></Box></HStack>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex></Card.Body></Card.Root>; })}{staffForService.length === 0 && <Text color="fg.muted">No staff assigned to this service.</Text>}</SimpleGrid>}
      </Stack>}

      {step === 3 && <Stack gap="4">
        <Box><Heading size="md">Select Date & Time</Heading><Text fontSize="sm" color="fg.muted">Pick an available slot for the {selectedService?.duration_minutes || 0}-minute appointment.</Text></Box>
        <Field.Root maxW="320px"><Field.Label><LuCalendar /> Date</Field.Label><Input type="date" min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, slot: "" })} /></Field.Root>
        {slotsQ.isLoading ? <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap="2">{[...Array(8)].map((_, i) => <Skeleton key={i} h="10" />)}</SimpleGrid>
        : slots.length > 0 ? <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap="2">{slots.map((slot: any) => { const selected = form.slot === slot.time; return <Button key={slot.time} variant={selected?"solid":"outline"} colorPalette={selected?"brand":"gray"} disabled={!slot.available} onClick={() => setForm({ ...form, slot: slot.time })}>{slot.time}</Button>; })}</SimpleGrid>
        : <Text color="fg.muted">No available slots for this date.</Text>}
        {slotsQ.isError && <Text color="fg.error" fontSize="sm">Could not load availability for the selected staff/service/date.</Text>}
      </Stack>}

      {step === 4 && <Stack gap="5">
        <Box><Heading size="md">Confirm Booking</Heading><Text fontSize="sm" color="fg.muted">Review details before creating the booking.</Text></Box>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuUser /> Customer</HStack><Text fontWeight="medium">{customerMode === "existing" ? ([selectedCustomer?.first_name, selectedCustomer?.last_name].filter(Boolean).join(" ") || selectedCustomer?.email || "—") : form.guest_name || "—"}</Text>{customerMode === "new" && <Text fontSize="sm" color="fg.muted">{form.guest_email} {form.guest_phone}</Text>}</Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><Text fontSize="sm" color="fg.muted">Service</Text><Text fontWeight="medium">{selectedService?.name || "—"}</Text><Text fontSize="sm" color="fg.muted">{selectedService?.duration_minutes} min • {formatNaira(selectedService?.price)}</Text></Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><Text fontSize="sm" color="fg.muted">Staff</Text><Text fontWeight="medium">{[selectedStaff?.first_name, selectedStaff?.last_name].filter(Boolean).join(" ") || selectedStaff?.name || "—"}</Text></Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuCalendar /> Date & Time</HStack><Text fontWeight="medium">{form.date} {form.slot} - {endTime}</Text></Card.Body></Card.Root>
        </SimpleGrid>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
          <Field.Root><Field.Label><LuCreditCard /> Payment option</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.payment_option} onChange={(e) => setForm({ ...form, payment_option: e.target.value as "now" | "later" })}><option value="later">Pay later</option><option value="now">Pay now</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
          <Field.Root><Field.Label>Payment status</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        </Grid>
        <Field.Root><Field.Label>Notes</Field.Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special requests or notes" /></Field.Root>
      </Stack>}
    </Card.Body></Card.Root>

    <Flex justify="space-between" gap="3">
      <Button variant="outline" onClick={() => step === 0 ? navigate("/bookings") : setStep((s) => s - 1)}>{step === 0 ? "Cancel" : "Back"}</Button>
      {step < steps.length - 1 ? <Button colorPalette="brand" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>Continue</Button>
      : <Button colorPalette="brand" loading={create.isPending} onClick={submit} disabled={!canNext()}><LuCheck /> Create Booking</Button>}
    </Flex>
  </Stack>;
}
