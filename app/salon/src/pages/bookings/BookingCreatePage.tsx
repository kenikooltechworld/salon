import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Card, Field, Flex, Grid, Heading, HStack, Input, NativeSelect, Stack, Text, Textarea } from "@chakra-ui/react";
import { LuArrowLeft } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { toaster } from "@/components/ui/toaster";
import { useCreateBooking } from "@/features/bookings";

const toIso = (v: string) => v ? new Date(v).toISOString() : "";
const toLocal = (d: Date) => { const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function BookingCreatePage() {
  const navigate = useNavigate();
  const create = useCreateBooking();
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services?page=1&page_size=100&active_only=true")).data });
  const customersQ = useQuery({ queryKey: ["customers", "all"], queryFn: async () => (await apiClient.get("/customers?page=1&page_size=100")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : Array.isArray(staffQ.data?.staff) ? staffQ.data.staff : [];
  const services = Array.isArray(servicesQ.data?.services) ? servicesQ.data.services : [];
  const customers = Array.isArray(customersQ.data?.customers) ? customersQ.data.customers : [];

  const [form, setForm] = useState({ is_guest: false, customer_id: "", guest_name: "", guest_email: "", guest_phone: "", service_id: "", staff_id: "", start_time: "", end_time: "", price: "", notes: "", payment_option: "later" as "now" | "later", payment_status: "pending" });
  const selectedService = useMemo(() => services.find((s: any) => String(s.id) === String(form.service_id)), [services, form.service_id]);

  useEffect(() => { if (!form.service_id && services[0]) setForm((p) => ({ ...p, service_id: services[0].id })); }, [services, form.service_id]);
  useEffect(() => { if (!form.staff_id && staff[0]) setForm((p) => ({ ...p, staff_id: staff[0].id })); }, [staff, form.staff_id]);
  useEffect(() => {
    if (!selectedService) return;
    setForm((p) => {
      if (p.price !== "" && p.end_time !== "") return p;
      const next = { ...p };
      if (p.price === "") next.price = String(selectedService.price ?? "");
      if (p.start_time && !p.end_time) { const s = new Date(p.start_time); s.setMinutes(s.getMinutes() + Number(selectedService.duration_minutes || 30)); next.end_time = toLocal(s); }
      return next;
    });
  }, [selectedService, form.start_time]);

  const submit = async () => {
    if (!form.service_id || !form.staff_id || !form.start_time || !form.end_time) { toaster.create({ title: "Service, staff, start and end are required", type: "error" }); return; }
    if (!form.is_guest && !form.customer_id) { toaster.create({ title: "Select a customer or use guest booking", type: "error" }); return; }
    if (form.is_guest && !form.guest_name.trim()) { toaster.create({ title: "Guest name is required", type: "error" }); return; }
    try {
      await create.mutateAsync({ service_id: form.service_id, staff_id: form.staff_id, customer_id: form.is_guest ? null : form.customer_id, start_time: toIso(form.start_time), end_time: toIso(form.end_time), notes: form.notes || null, price: form.price === "" ? null : form.price, is_guest: form.is_guest, guest_name: form.is_guest ? form.guest_name : null, guest_email: form.is_guest ? form.guest_email || null : null, guest_phone: form.is_guest ? form.guest_phone || null : null, payment_option: form.payment_option, payment_status: form.payment_status });
      toaster.create({ title: "Booking created", type: "success" });
      navigate("/bookings");
    } catch (e: any) { toaster.create({ title: "Create failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Stack gap="6">
    <HStack><Button variant="ghost" onClick={() => navigate("/bookings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">New Booking</Heading><Text color="fg.muted">Create a booking for a customer or guest</Text></Box></HStack>
    <Card.Root><Card.Body><Stack gap="4">
      <HStack><Button size="sm" variant={!form.is_guest ? "solid" : "outline"} onClick={() => setForm({ ...form, is_guest: false })}>Customer</Button><Button size="sm" variant={form.is_guest ? "solid" : "outline"} onClick={() => setForm({ ...form, is_guest: true, customer_id: "" })}>Guest</Button></HStack>
      {!form.is_guest ? <Field.Root><Field.Label>Customer *</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Select customer</option>{customers.map((c: any) => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      : <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="4"><Field.Root><Field.Label>Guest name *</Field.Label><Input value={form.guest_name} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} /></Field.Root><Field.Root><Field.Label>Guest email</Field.Label><Input value={form.guest_email} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} /></Field.Root><Field.Root><Field.Label>Guest phone</Field.Label><Input value={form.guest_phone} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} /></Field.Root></Grid>}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Service *</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value, end_time: "", price: "" })}><option value="">Select service</option>{services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        <Field.Root><Field.Label>Staff *</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}><option value="">Select staff</option>{staff.map((s: any) => <option key={s.id} value={s.id}>{[s.first_name, s.last_name].filter(Boolean).join(" ") || s.name || s.email || s.id}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Start *</Field.Label><Input type="datetime-local" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value, end_time: "" })} /></Field.Root>
        <Field.Root><Field.Label>End *</Field.Label><Input type="datetime-local" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="4">
        <Field.Root><Field.Label>Price</Field.Label><Input type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field.Root>
        <Field.Root><Field.Label>Payment option</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.payment_option} onChange={(e) => setForm({ ...form, payment_option: e.target.value as "now" | "later" })}><option value="later">Pay later</option><option value="now">Pay now</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        <Field.Root><Field.Label>Payment status</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Field.Root><Field.Label>Notes</Field.Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field.Root>
      <Flex justify="end" gap="3"><Button variant="outline" onClick={() => navigate("/bookings")}>Cancel</Button><Button colorPalette="brand" loading={create.isPending} onClick={submit}>Create Booking</Button></Flex>
    </Stack></Card.Body></Card.Root>
  </Stack>;
}
