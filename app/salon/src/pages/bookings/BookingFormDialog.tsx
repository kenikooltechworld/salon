import { useEffect, useState } from "react";
import { Button, Dialog, Field, Grid, Input, NativeSelect, Portal, Stack, Textarea } from "@chakra-ui/react";
import { toaster } from "@/components/ui/toaster";
import { useCreateBooking, useDeleteBooking, useUpdateBooking, type Booking } from "@/features/bookings";
import { getStaffDisplayName } from "@/features/staff";

const toLocal = (iso?: string) => { if (!iso) return ""; const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const toIso = (local: string) => local ? new Date(local).toISOString() : "";

export function BookingFormDialog({ open, onOpenChange, booking, staff, services, customers }: { open: boolean; onOpenChange: (v: boolean) => void; booking?: Booking | null; staff: any[]; services: any[]; customers: any[] }) {
  const create = useCreateBooking(); const update = useUpdateBooking(); const del = useDeleteBooking();
  const isEdit = !!booking?.id;
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    setForm(booking ? {
      customer_id: booking.customer_id || "", staff_id: booking.staff_id || "", service_id: booking.service_id || "",
      start_time: toLocal(booking.start_time), end_time: toLocal(booking.end_time), notes: booking.notes || "",
      price: booking.price ?? "", status: booking.status || "scheduled", is_guest: !!booking.is_guest,
      guest_name: booking.guest_name || "", guest_email: booking.guest_email || "", guest_phone: booking.guest_phone || "",
      payment_option: booking.payment_option || "", payment_status: booking.payment_status || "",
    } : { customer_id: "", staff_id: staff[0]?.id || "", service_id: services[0]?.id || "", start_time: "", end_time: "", notes: "", price: "", status: "scheduled", is_guest: false, guest_name: "", guest_email: "", guest_phone: "", payment_option: "", payment_status: "" });
  }, [open, booking?.id]);

  useEffect(() => {
    if (!open || isEdit) return;
    const svc = services.find((s) => String(s.id) === String(form.service_id));
    if (svc && form.start_time && !form.end_time) {
      const start = new Date(form.start_time);
      if (!Number.isNaN(start.getTime())) { start.setMinutes(start.getMinutes() + Number(svc.duration_minutes || 30)); setForm((p: any) => ({ ...p, end_time: toLocal(start.toISOString()), price: p.price === "" ? svc.price : p.price })); }
    }
  }, [form.service_id, form.start_time, open, isEdit]);

  const submit = async () => {
    if (!form.staff_id || !form.service_id || !form.start_time || !form.end_time) { toaster.create({ title: "Staff, service, start and end time are required", type: "error" }); return; }
    try {
      if (isEdit) {
        await update.mutateAsync({ id: booking!.id, payload: { status: form.status, notes: form.notes || null, payment_status: form.payment_status || null } });
        toaster.create({ title: "Booking updated", type: "success" });
      } else {
        await create.mutateAsync({ staff_id: form.staff_id, service_id: form.service_id, customer_id: form.is_guest ? null : form.customer_id || null, start_time: toIso(form.start_time), end_time: toIso(form.end_time), notes: form.notes || null, price: form.price === "" ? null : form.price, is_guest: !!form.is_guest, guest_name: form.is_guest ? form.guest_name || null : null, guest_email: form.is_guest ? form.guest_email || null : null, guest_phone: form.is_guest ? form.guest_phone || null : null, payment_option: form.payment_option || null });
        toaster.create({ title: "Booking created", type: "success" });
      }
      onOpenChange(false);
    } catch (e: any) { toaster.create({ title: "Save failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  const remove = async () => {
    if (!booking?.id || !confirm(`Delete booking?`)) return;
    try { await del.mutateAsync(booking.id); toaster.create({ title: "Booking deleted", type: "success" }); onOpenChange(false); }
    catch (e: any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" scrollBehavior="inside"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{isEdit ? "Booking Details" : "New Booking"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Service *</Field.Label><NativeSelect.Root disabled={isEdit}><NativeSelect.Field value={form.service_id || ""} onChange={(e) => setForm({ ...form, service_id: e.target.value })}><option value="">Select service</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        <Field.Root><Field.Label>Staff *</Field.Label><NativeSelect.Root disabled={isEdit}><NativeSelect.Field value={form.staff_id || ""} onChange={(e) => setForm({ ...form, staff_id: e.target.value })}><option value="">Select staff</option>{staff.map((s) => <option key={s.id} value={s.id}>{getStaffDisplayName(s)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      {!isEdit && <Button size="sm" variant={form.is_guest ? "solid" : "outline"} w="fit-content" onClick={() => setForm({ ...form, is_guest: !form.is_guest, customer_id: "" })}>{form.is_guest ? "Guest booking" : "Customer booking"}</Button>}
      {!form.is_guest ? <Field.Root><Field.Label>Customer</Field.Label><NativeSelect.Root disabled={isEdit}><NativeSelect.Field value={form.customer_id || ""} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}><option value="">Select customer</option>{customers.map((c) => <option key={c.id} value={c.id}>{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || c.id}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      : <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="4"><Field.Root><Field.Label>Guest name</Field.Label><Input value={form.guest_name || ""} onChange={(e) => setForm({ ...form, guest_name: e.target.value })} disabled={isEdit} /></Field.Root><Field.Root><Field.Label>Guest email</Field.Label><Input value={form.guest_email || ""} onChange={(e) => setForm({ ...form, guest_email: e.target.value })} disabled={isEdit} /></Field.Root><Field.Root><Field.Label>Guest phone</Field.Label><Input value={form.guest_phone || ""} onChange={(e) => setForm({ ...form, guest_phone: e.target.value })} disabled={isEdit} /></Field.Root></Grid>}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Start *</Field.Label><Input type="datetime-local" value={form.start_time || ""} onChange={(e) => setForm({ ...form, start_time: e.target.value })} disabled={isEdit} /></Field.Root>
        <Field.Root><Field.Label>End *</Field.Label><Input type="datetime-local" value={form.end_time || ""} onChange={(e) => setForm({ ...form, end_time: e.target.value })} disabled={isEdit} /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Price</Field.Label><Input type="number" min={0} value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value })} disabled={isEdit} /></Field.Root>
        <Field.Root><Field.Label>Status</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.status || "scheduled"} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="scheduled">Scheduled</option><option value="confirmed">Confirmed</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option><option value="no_show">No show</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
        <Field.Root><Field.Label>Payment status</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.payment_status || ""} onChange={(e) => setForm({ ...form, payment_status: e.target.value })}><option value="">Unset</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Field.Root><Field.Label>Notes</Field.Label><Textarea rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field.Root>
    </Stack></Dialog.Body>
    <Dialog.Footer>
      {isEdit && <Button mr="auto" colorPalette="red" variant="ghost" loading={del.isPending} onClick={remove}>Delete</Button>}
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button colorPalette="brand" loading={create.isPending || update.isPending} onClick={submit}>{isEdit ? "Save changes" : "Create booking"}</Button>
    </Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}
