import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Badge, Box, Button, Card, Field, Flex, Grid, Heading, HStack, Image, Input, NativeSelect, SimpleGrid,
  Skeleton, Stack, Steps, Text, Textarea,
} from "@chakra-ui/react";
import { LuArrowLeft, LuCalendar, LuCheck, LuCreditCard, LuPackage, LuPlus, LuSearch, LuUser } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { formatNaira } from "@/components/ui/naira";
import { toaster } from "@/components/ui/toaster";
import { useCreateBooking } from "@/features/bookings";
import { useCreateCustomer } from "@/features/customers/hooks";
import { getStaffDisplayName, getStaffImageUrl } from "@/features/staff";

const steps = [
  { title: "Customer" },
  { title: "Service" },
  { title: "Staff" },
  { title: "Add-ons" },
  { title: "Packages" },
  { title: "Date & Time" },
  { title: "Confirm" },
];
const STAFF_STEP = 2;
const ADDONS_STEP = 3;
const PACKAGES_STEP = 4;
const TIME_STEP = 5;
const CONFIRM_STEP = 6;

const toIso = (d: string, t: string) => new Date(`${d}T${t}:00`).toISOString();
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const todayStr = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };

function addMinutes(hhmm: string, mins: number) { const [h, m] = hhmm.split(":").map(Number); const total = h * 60 + m + mins; const hh = Math.floor(total / 60); const mm = total % 60; return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; }

export default function BookingCreatePage() {
  const navigate = useNavigate();
  const create = useCreateBooking();
  const createCustomer = useCreateCustomer();
  const [step, setStep] = useState(0);
  const [customerMode, setCustomerMode] = useState<"existing" | "new" | "guest">("existing");
  const [search, setSearch] = useState("");
  const [createdCustomer, setCreatedCustomer] = useState<{ id: string; first_name: string; last_name: string; email: string; phone: string } | null>(null);
  const [form, setForm] = useState({
    customer_id: "", first_name: "", last_name: "", email: "", phone: "",
    guest_name: "", guest_email: "", guest_phone: "",
    service_id: "", staff_id: "", date: todayStr(), slot: "", notes: "",
    payment_option: "later" as "now" | "later", payment_status: "pending",
    addon_ids: [] as string[], package_id: "" as string,
  });

  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=100&active_only=true")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=100")).data });
  const addonsQ = useQuery({ queryKey: ["service-addons", "all"], queryFn: async () => (await apiClient.get("/service-addons")).data });
  const packagesQ = useQuery({ queryKey: ["service-packages", "all"], queryFn: async () => (await apiClient.get("/service-packages?page=1&page_size=100&active_only=true")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];
  const allAddons = Array.isArray(addonsQ.data?.addons) ? addonsQ.data.addons : Array.isArray(addonsQ.data) ? addonsQ.data : [];
  const packages = Array.isArray(packagesQ.data?.packages) ? packagesQ.data.packages : [];

  const selectedService = useMemo(() => services.find((s: any) => String(s.id) === String(form.service_id)), [services, form.service_id]);
  const selectedStaff = useMemo(() => staff.find((s: any) => String(s.id) === String(form.staff_id)), [staff, form.staff_id]);
  const selectedCustomer = useMemo(() => customers.find((c: any) => String(c.id) === String(form.customer_id)), [customers, form.customer_id]);
  const selectedPackage = useMemo(() => packages.find((p: any) => String(p.id) === String(form.package_id)), [packages, form.package_id]);
  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase(); if (!q) return customers;
    return customers.filter((c: any) => [c.first_name, c.last_name, c.email, c.phone].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [customers, search]);

  const applicableAddons = useMemo(() => {
    const active = allAddons.filter((a: any) => a.is_active !== false);
    if (!selectedService) return active;
    return active.filter((a: any) => {
      const ids = a.applicable_service_ids || a.applicable_services || [];
      return !ids.length || ids.some((id: string) => String(id) === String(selectedService.id));
    });
  }, [allAddons, selectedService]);

  const selectedAddons = useMemo(() => allAddons.filter((a: any) => form.addon_ids.includes(String(a.id))), [allAddons, form.addon_ids]);

  const slotsQ = useQuery({
    queryKey: ["availability", form.staff_id, form.service_id, form.date],
    queryFn: async () => {
      const res = await apiClient.get("/appointments/available-slots", { params: { service_id: form.service_id, staff_id: form.staff_id, date: form.date, time_zone: browserTimeZone } });
      return res.data;
    },
    enabled: !!form.staff_id && !!form.service_id && !!form.date && step >= TIME_STEP,
  });
  const slots = Array.isArray(slotsQ.data?.slots) ? slotsQ.data.slots : [];

  useEffect(() => { if (!form.service_id && services[0]) setForm((p) => ({ ...p, service_id: services[0].id })); }, [services, form.service_id]);
  useEffect(() => { if (selectedService?.staff_ids?.length && !selectedService.staff_ids.includes(form.staff_id)) setForm((p) => ({ ...p, staff_id: "" })); }, [selectedService, form.staff_id]);
  useEffect(() => { setForm((p) => ({ ...p, addon_ids: p.addon_ids.filter((id) => applicableAddons.some((a: any) => String(a.id) === id)) })); }, [applicableAddons]);

  const staffForService = useMemo(() => {
    const activeStaff = staff.filter((member: any) => !member.status || member.status === "active");
    if (!selectedService?.staff_ids?.length) return activeStaff;
    return activeStaff.filter((s: any) => selectedService.staff_ids.some((id: string) => String(id) === String(s.id)));
  }, [staff, selectedService]);

  const endTime = useMemo(() => {
    if (!form.slot) return "";
    const base = selectedPackage ? Number(selectedPackage.total_duration_minutes || selectedService?.duration_minutes || 30) : Number(selectedService?.duration_minutes || 30);
    return addMinutes(form.slot, base);
  }, [form.slot, selectedService, selectedPackage]);

  const addonsTotal = useMemo(() => selectedAddons.reduce((sum: number, a: any) => sum + Number(a.price || 0), 0), [selectedAddons]);

  const totalPrice = useMemo(() => {
    if (selectedPackage) return Number(selectedPackage.package_price || 0);
    return Number(selectedService?.price || 0) + addonsTotal;
  }, [selectedService, selectedPackage, addonsTotal]);

  const canNext = () => {
    if (step === 0) {
      if (customerMode === "existing") return !!form.customer_id;
      if (customerMode === "new") return !!form.first_name.trim() && !!form.last_name.trim() && !!form.email.trim() && !!form.phone.trim();
      return !!form.guest_name.trim();
    }
    if (step === 1) return !!form.service_id;
    if (step === STAFF_STEP) return !!form.staff_id;
    if (step === TIME_STEP) return !!form.date && !!form.slot;
    return true;
  };

  const toggleAddon = (id: string) => setForm((p) => ({ ...p, addon_ids: p.addon_ids.includes(id) ? p.addon_ids.filter((x) => x !== id) : [...p.addon_ids, id] }));

  const submit = async () => {
    if (!selectedService || !form.staff_id || !form.date || !form.slot || !endTime) return;
    try {
      let customerId: string | null = customerMode === "existing" ? form.customer_id : null;
      if (customerMode === "new") {
        const customer = {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        };
        const isSameCustomer = createdCustomer &&
          createdCustomer.first_name === customer.first_name &&
          createdCustomer.last_name === customer.last_name &&
          createdCustomer.email === customer.email &&
          createdCustomer.phone === customer.phone;
        if (isSameCustomer) {
          customerId = createdCustomer.id;
        } else {
          const created = (await createCustomer.mutateAsync({
            ...customer,
            communication_preference: "email",
            status: "active",
          })).data;
          customerId = created.id;
          setCreatedCustomer({ ...customer, id: created.id });
        }
      }
      const detail = {
        serviceName: selectedService.name,
        serviceDuration: selectedService.duration_minutes,
        servicePrice: Number(selectedService.price || 0),
        staffName: getStaffDisplayName(selectedStaff, ""),
        addonNames: selectedAddons.map((a: any) => a.name),
        addonPrices: selectedAddons.map((a: any) => Number(a.price || 0)),
        packageName: selectedPackage?.name || null,
        packagePrice: selectedPackage ? Number(selectedPackage.package_price || 0) : null,
        totalPrice,
      };
      const metaParts: string[] = [];
      if (selectedAddons.length) metaParts.push(`Add-ons: ${selectedAddons.map((a: any) => `${a.name} (${formatNaira(a.price)})`).join(", ")}`);
      if (selectedPackage) metaParts.push(`Package: ${selectedPackage.name} (${formatNaira(selectedPackage.package_price)})`);
      const notes = [form.notes.trim(), ...metaParts].filter(Boolean).join("\n");

      const res = await create.mutateAsync({
        service_id: form.service_id,
        staff_id: form.staff_id,
        customer_id: customerId,
        start_time: toIso(form.date, form.slot),
        end_time: toIso(form.date, endTime),
        time_zone: browserTimeZone,
        notes: notes || null,
        price: totalPrice,
        is_guest: customerMode === "guest",
        guest_name: customerMode === "guest" ? form.guest_name : null,
        guest_email: customerMode === "guest" ? form.guest_email || null : null,
        guest_phone: customerMode === "guest" ? form.guest_phone || null : null,
        payment_option: form.payment_option,
        payment_status: form.payment_status,
      });
      const booking = (res as any)?.data ?? res;
      toaster.create({ title: "Booking created", type: "success" });
      navigate("/bookings/confirmation", { state: { booking, detail } });
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
        <Flex gap="2" wrap="wrap">
          <Button size="sm" variant={customerMode==="existing"?"solid":"outline"} colorPalette={customerMode==="existing"?"brand":"gray"} onClick={() => setCustomerMode("existing")}>Existing Customer</Button>
          <Button size="sm" variant={customerMode==="new"?"solid":"outline"} colorPalette={customerMode==="new"?"brand":"gray"} onClick={() => setCustomerMode("new")}>New Customer</Button>
          <Button size="sm" variant={customerMode==="guest"?"solid":"outline"} colorPalette={customerMode==="guest"?"brand":"gray"} onClick={() => setCustomerMode("guest")}>Guest Booking</Button>
        </Flex>
        {customerMode === "existing" ? <>
          <Box position="relative"><Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="fg.muted"><LuSearch /></Box><Input pl="9" placeholder="Search customers..." value={search} onChange={(e) => setSearch(e.target.value)} /></Box>
          {customersQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="20" />)}</SimpleGrid>
          : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3" maxH="420px" overflowY="auto">{filteredCustomers.map((c: any) => {
              const selected = String(form.customer_id) === String(c.id);
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Customer";
              return <Card.Root key={c.id} variant="outline" cursor="pointer" borderColor={selected ? "brand.solid" : undefined} bg={selected ? "brand.subtle" : undefined} onClick={() => setForm({ ...form, customer_id: c.id })}>
                <Card.Body py="3"><Flex justify="space-between" gap="3"><HStack gap="3"><Avatar.Root size="sm"><Avatar.Image src={c.profile_image_url || undefined} /><Avatar.Fallback name={name} /></Avatar.Root><Box><Text fontWeight="medium" fontSize="sm">{name}</Text><Text fontSize="xs" color="fg.muted">{c.email}</Text><Text fontSize="xs" color="fg.muted">{c.phone}</Text></Box></HStack>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex></Card.Body>
              </Card.Root>;
            })}{filteredCustomers.length === 0 && <Text color="fg.muted">No customers found.</Text>}</SimpleGrid>}
        </> : customerMode === "new" ? <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
          <Field.Root required><Field.Label>First name</Field.Label><Input autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field.Root>
          <Field.Root required><Field.Label>Last name</Field.Label><Input autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field.Root>
          <Field.Root required><Field.Label>Email</Field.Label><Input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field.Root>
          <Field.Root required><Field.Label>Phone</Field.Label><Input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field.Root>
        </Grid> : <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="4">
          <Field.Root required><Field.Label>Guest name</Field.Label><Input autoComplete="name" value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></Field.Root>
          <Field.Root><Field.Label>Email</Field.Label><Input type="email" autoComplete="email" value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} /></Field.Root>
          <Field.Root><Field.Label>Phone</Field.Label><Input type="tel" autoComplete="tel" value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></Field.Root>
        </Grid>}
      </Stack>}

      {step === 1 && <Stack gap="4">
        <Box><Heading size="md">Select Service</Heading><Text fontSize="sm" color="fg.muted">Choose the service for this booking. Add-ons and packages are selected in the next steps.</Text></Box>
        {servicesQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="28" />)}</SimpleGrid>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{services.map((s: any) => { const selected = String(form.service_id) === String(s.id); return <Card.Root key={s.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => setForm({ ...form, service_id: s.id, slot: "" })}><Card.Body gap="2"><Flex align="start" gap="3"><Box w="16" h="16" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">{s.public_image_url ? <Image src={s.public_image_url} alt={s.name} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" color="fg.muted"><LuUser /></Flex>}</Box><Box flex="1" minW="0"><Flex justify="space-between" gap="3"><Box minW="0"><Text fontWeight="semibold" lineClamp="1">{s.name}</Text><Text fontSize="xs" color="fg.muted">{s.category}</Text></Box>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex><Text fontSize="sm" color="fg.muted" lineClamp="2" mt="1">{s.description || "No description"}</Text></Box></Flex><HStack justify="space-between" fontSize="sm" borderTopWidth="1px" pt="2"><Text>{s.duration_minutes} min</Text><Text fontWeight="semibold">{formatNaira(s.price)}</Text></HStack></Card.Body></Card.Root>; })}</SimpleGrid>}
      </Stack>}

      {step === STAFF_STEP && <Stack gap="4">
        <Box><Heading size="md">Select Staff</Heading><Text fontSize="sm" color="fg.muted">Choose who will provide the service.</Text></Box>
        {staffQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="20" />)}</SimpleGrid>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{staffForService.map((s: any) => { const selected = String(form.staff_id) === String(s.id); const name = getStaffDisplayName(s); return <Card.Root key={s.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => setForm({ ...form, staff_id: s.id, slot: "" })}><Card.Body py="3"><Flex justify="space-between" gap="3"><HStack gap="3"><Avatar.Root size="sm"><Avatar.Image src={getStaffImageUrl(s)} /><Avatar.Fallback name={name} /></Avatar.Root><Box><Text fontWeight="medium" fontSize="sm">{name}</Text><Text fontSize="xs" color="fg.muted">{(s.specialties || []).join(", ") || "Staff member"}</Text></Box></HStack>{selected && <Box color="brand.fg"><LuCheck /></Box>}</Flex></Card.Body></Card.Root>; })}{staffForService.length === 0 && <Text color="fg.muted">No staff assigned to this service.</Text>}</SimpleGrid>}
      </Stack>}

      {step === ADDONS_STEP && <Stack gap="4">
        <Box><Heading size="md">Add-ons</Heading><Text fontSize="sm" color="fg.muted">Optional extras for {selectedService?.name || "this service"}. Select as many as you like.</Text></Box>
        {addonsQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="20" />)}</SimpleGrid>
        : applicableAddons.length === 0 ? <Card.Root variant="subtle"><Card.Body><Text color="fg.muted">No add-ons available for this service. Continue to the next step.</Text></Card.Body></Card.Root>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{applicableAddons.map((a: any) => {
            const selected = form.addon_ids.includes(String(a.id));
            return <Card.Root key={a.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => toggleAddon(String(a.id))}>
              <Card.Body py="3"><Flex justify="space-between" gap="3"><HStack gap="3"><Avatar.Root size="sm" rounded="md"><Avatar.Image src={a.image_url || undefined} /><Avatar.Fallback name={a.name} /></Avatar.Root><Box><HStack gap="2"><Text fontWeight="medium" fontSize="sm">{a.name}</Text><Badge size="sm" colorPalette={a.category==="product"?"blue":a.category==="upgrade"?"purple":"green"}>{a.category}</Badge></HStack><Text fontSize="xs" color="fg.muted" lineClamp="2">{a.description}</Text><Text fontSize="xs" color="fg.muted">+{a.duration_minutes} min</Text></Box></HStack><Box textAlign="right"><Text fontWeight="semibold" fontSize="sm">{formatNaira(a.price)}</Text>{selected && <Box color="brand.fg" mt="1"><LuCheck /></Box>}</Box></Flex></Card.Body>
            </Card.Root>;
          })}</SimpleGrid>}
        {selectedAddons.length > 0 && <HStack justify="space-between" borderTopWidth="1px" pt="3"><Text fontSize="sm" color="fg.muted">{selectedAddons.length} add-on(s) selected</Text><Text fontWeight="semibold">+{formatNaira(addonsTotal)}</Text></HStack>}
      </Stack>}

      {step === PACKAGES_STEP && <Stack gap="4">
        <Box><Heading size="md">Packages</Heading><Text fontSize="sm" color="fg.muted">Optional: apply a value package instead of {selectedService?.name || "the service"}. Packages are separate from add-ons.</Text></Box>
        {packagesQ.isLoading ? <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">{[...Array(4)].map((_, i) => <Skeleton key={i} h="24" />)}</SimpleGrid>
        : packages.length === 0 ? <Card.Root variant="subtle"><Card.Body><Text color="fg.muted">No packages available. Continue to the next step.</Text></Card.Body></Card.Root>
        : <SimpleGrid columns={{ base: 1, md: 2 }} gap="3">
            {packages.map((p: any) => {
              const selected = String(form.package_id) === String(p.id);
              return <Card.Root key={p.id} variant="outline" cursor="pointer" borderColor={selected?"brand.solid":undefined} bg={selected?"brand.subtle":undefined} onClick={() => setForm((prev) => ({ ...prev, package_id: selected ? "" : String(p.id) }))}>
                <Card.Body gap="2"><Flex justify="space-between" gap="3"><Heading size="sm" lineClamp="1">{p.name}</Heading>{selected ? <Box color="brand.fg"><LuCheck /></Box> : p.is_featured && <Badge colorPalette="purple">Featured</Badge>}</Flex><Text fontSize="sm" color="fg.muted" lineClamp="2">{p.description || "Value bundle."}</Text><HStack justify="space-between" fontSize="sm" borderTopWidth="1px" pt="2"><Text fontWeight="semibold">{formatNaira(p.package_price)}</Text><Text color="fg.muted">Save {formatNaira(p.discount_amount)}</Text></HStack><Text fontSize="xs" color="fg.muted">{p.total_duration_minutes || 0} min · {p.services?.length || 0} services</Text></Card.Body>
              </Card.Root>;
            })}
          </SimpleGrid>}
        {selectedPackage && <HStack justify="space-between" borderTopWidth="1px" pt="3"><HStack gap="2"><LuPackage /><Text fontSize="sm">Package selected: {selectedPackage.name}</Text></HStack><Button size="xs" variant="ghost" onClick={() => setForm((p) => ({ ...p, package_id: "" }))}>Remove</Button></HStack>}
      </Stack>}

      {step === TIME_STEP && <Stack gap="4">
        <Box><Heading size="md">Select Date & Time</Heading><Text fontSize="sm" color="fg.muted">Pick an available slot for the {selectedPackage?.total_duration_minutes || selectedService?.duration_minutes || 0}-minute appointment.</Text></Box>
        <Field.Root maxW="320px"><Field.Label><LuCalendar /> Date</Field.Label><Input type="date" min={todayStr()} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value, slot: "" })} /></Field.Root>
        {slotsQ.isLoading ? <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap="2">{[...Array(8)].map((_, i) => <Skeleton key={i} h="10" />)}</SimpleGrid>
        : slots.length > 0 ? <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap="2">{slots.map((slot: any) => { const selected = form.slot === slot.start_time; return <Button key={slot.start_time} variant={selected?"solid":"outline"} colorPalette={selected?"brand":"gray"} disabled={!slot.isAvailable} onClick={() => setForm({ ...form, slot: slot.start_time })}>{slot.start_time}</Button>; })}</SimpleGrid>
        : <Stack align="start" gap="2"><Text color="fg.muted">No available slots for this date. Check this staff member’s availability or choose another date.</Text><Button size="sm" variant="outline" onClick={() => navigate(`/staff/${form.staff_id}`)}>Manage staff availability</Button></Stack>}
        {slotsQ.isError && <Text color="fg.error" fontSize="sm">{(slotsQ.error as any)?.response?.data?.detail || "Could not load availability for the selected staff/service/date."}</Text>}
      </Stack>}

      {step === CONFIRM_STEP && <Stack gap="5">
        <Box><Heading size="md">Confirm Booking</Heading><Text fontSize="sm" color="fg.muted">Review details before creating the booking.</Text></Box>
        <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuUser /> Customer</HStack><Text fontWeight="medium">{customerMode === "existing" ? ([selectedCustomer?.first_name, selectedCustomer?.last_name].filter(Boolean).join(" ") || selectedCustomer?.email || "—") : customerMode === "new" ? `${form.first_name} ${form.last_name}`.trim() || "—" : form.guest_name || "—"}</Text>{customerMode === "new" && <Text fontSize="sm" color="fg.muted">{form.email} {form.phone}</Text>}{customerMode === "guest" && <Text fontSize="sm" color="fg.muted">{form.guest_email} {form.guest_phone}</Text>}</Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><Text fontSize="sm" color="fg.muted">Service</Text><HStack><Box w="12" h="12" rounded="md" overflow="hidden" flexShrink="0" bg="bg.muted">{selectedService?.public_image_url ? <Image src={selectedService.public_image_url} alt={selectedService.name} w="full" h="full" objectFit="cover" /> : <Flex w="full" h="full" align="center" justify="center" color="fg.muted"><LuUser /></Flex>}</Box><Box><Text fontWeight="medium">{selectedService?.name || "—"}</Text><Text fontSize="sm" color="fg.muted">{selectedService?.duration_minutes} min · {formatNaira(selectedService?.price)}</Text></Box></HStack></Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><Text fontSize="sm" color="fg.muted">Staff</Text><HStack><Avatar.Root size="sm"><Avatar.Image src={getStaffImageUrl(selectedStaff)} /><Avatar.Fallback name={getStaffDisplayName(selectedStaff)} /></Avatar.Root><Text fontWeight="medium">{getStaffDisplayName(selectedStaff, "—")}</Text></HStack></Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuCalendar /> Date & Time</HStack><Text fontWeight="medium">{form.date} {form.slot} - {endTime}</Text></Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuPlus /> Add-ons</HStack>{selectedAddons.length ? <Stack gap="1">{selectedAddons.map((a: any) => <HStack key={a.id} justify="space-between" fontSize="sm"><Text>{a.name}</Text><Text>{formatNaira(a.price)}</Text></HStack>)}</Stack> : <Text fontSize="sm" color="fg.muted">None</Text>}</Card.Body></Card.Root>
          <Card.Root variant="outline"><Card.Body gap="2"><HStack color="fg.muted" fontSize="sm"><LuPackage /> Package</HStack><Text fontWeight="medium">{selectedPackage ? `${selectedPackage.name} · ${formatNaira(selectedPackage.package_price)}` : "None"}</Text></Card.Body></Card.Root>
          <Card.Root variant="outline" gridColumn={{ md: "span 2" }}><Card.Body gap="2"><HStack justify="space-between"><Text fontWeight="semibold">Total Price</Text><Text fontWeight="bold" fontSize="lg">{formatNaira(totalPrice)}</Text></HStack><Text fontSize="xs" color="fg.muted">Service {formatNaira(selectedService?.price || 0)}{selectedAddons.length ? ` + add-ons ${formatNaira(addonsTotal)}` : ""}{selectedPackage ? ` · package ${formatNaira(selectedPackage.package_price)}` : ""}</Text></Card.Body></Card.Root>
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
      : <Button colorPalette="brand" loading={create.isPending || createCustomer.isPending} onClick={submit} disabled={!canNext()}><LuCheck /> Create Booking</Button>}
    </Flex>
  </Stack>;
}
