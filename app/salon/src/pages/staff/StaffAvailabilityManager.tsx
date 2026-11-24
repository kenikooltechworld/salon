import { useState } from "react";
import {
  Badge, Box, Button, Card, Dialog, Field, Flex, Grid, Heading, Input, NativeSelect,
  Portal, Stack, Text,
} from "@chakra-ui/react";
import { LuPlus, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import {
  useCreateAvailability, useDeleteAvailability, useStaffAvailability, useUpdateAvailability,
  type AvailabilityBreak, type AvailabilityPayload, type StaffAvailability,
} from "@/features/availability";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const emptyForm = (): AvailabilityPayload => ({
  day_of_week: 0,
  start_time: "09:00",
  end_time: "17:00",
  is_recurring: true,
  effective_from: today(),
  effective_to: null,
  breaks: [],
  slot_interval_minutes: 30,
  buffer_time_minutes: 15,
  concurrent_bookings_allowed: 1,
  is_active: true,
  notes: null,
});

const formatDate = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "No end date";

export function StaffAvailabilityManager({ staffId, canManage }: { staffId: string; canManage: boolean }) {
  const availability = useStaffAvailability(staffId);
  const create = useCreateAvailability(staffId);
  const update = useUpdateAvailability(staffId);
  const remove = useDeleteAvailability(staffId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffAvailability | null>(null);
  const [editing, setEditing] = useState<StaffAvailability | null>(null);
  const [form, setForm] = useState<AvailabilityPayload>(emptyForm);
  const rows = availability.data?.availabilities || [];

  const formFromSchedule = (item: StaffAvailability): AvailabilityPayload => ({
      day_of_week: item.day_of_week,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      is_recurring: item.is_recurring,
      effective_from: item.effective_from,
      effective_to: item.effective_to,
      breaks: item.breaks.map((breakItem) => ({
        start_time: breakItem.start_time.slice(0, 5),
        end_time: breakItem.end_time.slice(0, 5),
      })),
      slot_interval_minutes: item.slot_interval_minutes,
      buffer_time_minutes: item.buffer_time_minutes,
      concurrent_bookings_allowed: item.concurrent_bookings_allowed,
      is_active: item.is_active,
      notes: item.notes,
    });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (item: StaffAvailability) => {
    setEditing(item);
    setForm(formFromSchedule(item));
    setDialogOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      day_of_week: form.is_recurring ? form.day_of_week : null,
      effective_to: form.effective_to || null,
      breaks: form.breaks.filter((item) => item.start_time && item.end_time),
      notes: form.notes?.trim() || null,
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      toaster.create({ title: editing ? "Availability updated" : "Availability added", type: "success" });
      setDialogOpen(false);
      setEditing(null);
    } catch (error: any) {
      toaster.create({
        title: "Could not save availability",
        description: error?.response?.data?.detail || error?.message || "Please check the schedule details.",
        type: "error",
      });
    }
  };

  const toggleActive = async (item: StaffAvailability) => {
    try {
      await update.mutateAsync({ id: item.id, payload: { is_active: !item.is_active } });
      toaster.create({ title: item.is_active ? "Availability paused" : "Availability activated", type: "success" });
    } catch (error: any) {
      toaster.create({
        title: "Could not update availability",
        description: error?.response?.data?.detail || error?.message,
        type: "error",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toaster.create({ title: "Availability deleted", type: "success" });
      setDeleteTarget(null);
    } catch (error: any) {
      toaster.create({
        title: "Could not delete availability",
        description: error?.response?.data?.detail || error?.message,
        type: "error",
      });
    }
  };

  return (
    <>
      <Card.Root>
        <Card.Body>
          <Flex justify="space-between" align={{ base: "start", sm: "center" }} gap="3" direction={{ base: "column", sm: "row" }}>
            <Box>
              <Heading size="md">Staff Availability</Heading>
              <Text mt="1" color="fg.muted" fontSize="sm">Set recurring work hours and date-specific shifts used by booking slots. Times use {browserTimeZone}.</Text>
            </Box>
            {canManage && <Button colorPalette="brand" onClick={openNew}><LuPlus /> Add hours</Button>}
          </Flex>

          {availability.isLoading ? <Text mt="4" color="fg.muted">Loading availability…</Text>
            : availability.isError ? <Text mt="4" color="fg.error">Availability could not be loaded. Refresh and try again.</Text>
            : rows.length === 0 ? <Box mt="4" p="4" rounded="md" bg="bg.muted">
              <Text fontWeight="medium">No availability is set for this staff member.</Text>
              <Text mt="1" fontSize="sm" color="fg.muted">Bookings cannot be scheduled until working hours are added.</Text>
            </Box>
            : <Stack mt="4" gap="3">{rows.map((item) => (
              <Flex key={item.id} p="3" rounded="md" borderWidth="1px" gap="3" align={{ base: "stretch", sm: "center" }} direction={{ base: "column", sm: "row" }}>
                <Box flex="1" minW="0">
                  <Flex gap="2" align="center" wrap="wrap">
                    <Text fontWeight="semibold">{item.is_recurring ? `${days[item.day_of_week ?? 0]} · Weekly` : "One-time availability"}</Text>
                    <Badge colorPalette={item.is_active ? "green" : "gray"}>{item.is_active ? "Active" : "Paused"}</Badge>
                  </Flex>
                  <Text fontSize="sm" mt="1">{item.start_time.slice(0, 5)}–{item.end_time.slice(0, 5)}</Text>
                  <Text fontSize="xs" color="fg.muted">
                    {formatDate(item.effective_from)} – {formatDate(item.effective_to)}
                    {item.breaks.length > 0 && ` · ${item.breaks.length} break${item.breaks.length === 1 ? "" : "s"}`}
                    {` · ${item.slot_interval_minutes} min slots`}
                  </Text>
                </Box>
                {canManage && <Flex gap="2" wrap="wrap">
                  <Button size="sm" variant="outline" onClick={() => openEdit(item)}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleActive(item)} loading={update.isPending}>{item.is_active ? "Pause" : "Activate"}</Button>
                  <Button size="sm" colorPalette="red" variant="ghost" aria-label="Delete availability" onClick={() => setDeleteTarget(item)}><LuTrash2 /></Button>
                </Flex>}
              </Flex>
            ))}</Stack>}
        </Card.Body>
      </Card.Root>

      <Dialog.Root open={dialogOpen} onOpenChange={(event) => setDialogOpen(event.open)} size="lg" scrollBehavior="inside">
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
          <Dialog.Header><Dialog.Title>{editing ? "Edit availability" : "Add staff availability"}</Dialog.Title></Dialog.Header>
          <Dialog.Body><Stack gap="4">
            <Field.Root>
              <Field.Label>Schedule type</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={form.is_recurring ? "recurring" : "specific"} onChange={(event) => setForm((current) => ({ ...current, is_recurring: event.target.value === "recurring", day_of_week: event.target.value === "recurring" ? current.day_of_week ?? 0 : null }))}>
                  <option value="recurring">Recurring weekly hours</option>
                  <option value="specific">Date-specific hours</option>
                </NativeSelect.Field><NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            {form.is_recurring && <Field.Root>
              <Field.Label>Day of week</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field value={form.day_of_week ?? 0} onChange={(event) => setForm((current) => ({ ...current, day_of_week: Number(event.target.value) }))}>
                  {days.map((day, index) => <option key={day} value={index}>{day}</option>)}
                </NativeSelect.Field><NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>}
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
              <Field.Root required><Field.Label>{form.is_recurring ? "Effective from" : "Date"}</Field.Label><Input type="date" required value={form.effective_from} onChange={(event) => setForm((current) => ({ ...current, effective_from: event.target.value }))} /></Field.Root>
              <Field.Root><Field.Label>Effective to (optional)</Field.Label><Input type="date" min={form.effective_from} value={form.effective_to || ""} onChange={(event) => setForm((current) => ({ ...current, effective_to: event.target.value || null }))} /></Field.Root>
            </Grid>
            <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap="3">
              <Field.Root required><Field.Label>Start time</Field.Label><Input type="time" required value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} /></Field.Root>
              <Field.Root required><Field.Label>End time</Field.Label><Input type="time" required value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} /></Field.Root>
            </Grid>
            <Box>
              <Flex justify="space-between" align="center" mb="2">
                <Text fontSize="sm" fontWeight="medium">Breaks</Text>
                <Button size="xs" variant="outline" onClick={() => setForm((current) => ({ ...current, breaks: [...current.breaks, { start_time: "12:00", end_time: "13:00" }] }))}><LuPlus /> Add break</Button>
              </Flex>
              <Stack gap="2">{form.breaks.map((item: AvailabilityBreak, index) => (
                <Grid key={`${index}`} templateColumns="1fr 1fr auto" gap="2" alignItems="end">
                  <Field.Root><Field.Label>Break start</Field.Label><Input type="time" value={item.start_time} onChange={(event) => setForm((current) => ({ ...current, breaks: current.breaks.map((breakItem, breakIndex) => breakIndex === index ? { ...breakItem, start_time: event.target.value } : breakItem) }))} /></Field.Root>
                  <Field.Root><Field.Label>Break end</Field.Label><Input type="time" value={item.end_time} onChange={(event) => setForm((current) => ({ ...current, breaks: current.breaks.map((breakItem, breakIndex) => breakIndex === index ? { ...breakItem, end_time: event.target.value } : breakItem) }))} /></Field.Root>
                  <Button aria-label="Remove break" variant="ghost" colorPalette="red" onClick={() => setForm((current) => ({ ...current, breaks: current.breaks.filter((_, breakIndex) => breakIndex !== index) }))}><LuTrash2 /></Button>
                </Grid>
              ))}</Stack>
            </Box>
            <Grid templateColumns={{ base: "1fr", sm: "repeat(2,1fr)" }} gap="3">
              <Field.Root required><Field.Label>Slot interval (minutes)</Field.Label><Input type="number" min={5} max={240} step={5} value={form.slot_interval_minutes} onChange={(event) => setForm((current) => ({ ...current, slot_interval_minutes: Number(event.target.value) }))} /></Field.Root>
              <Field.Root required><Field.Label>Buffer after bookings (minutes)</Field.Label><Input type="number" min={0} max={240} value={form.buffer_time_minutes} onChange={(event) => setForm((current) => ({ ...current, buffer_time_minutes: Number(event.target.value) }))} /></Field.Root>
            </Grid>
            <Field.Root><Field.Label>Notes (optional)</Field.Label><Input maxLength={500} value={form.notes || ""} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} /></Field.Root>
          </Stack></Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button colorPalette="brand" loading={create.isPending || update.isPending} onClick={save}>{editing ? "Save changes" : "Add availability"}</Button>
          </Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>

      <Dialog.Root open={!!deleteTarget} onOpenChange={(event) => { if (!event.open) setDeleteTarget(null); }}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
          <Dialog.Header><Dialog.Title>Delete availability?</Dialog.Title></Dialog.Header>
          <Dialog.Body><Text>This schedule will no longer be used to generate booking slots.</Text></Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Keep schedule</Button>
            <Button colorPalette="red" loading={remove.isPending} onClick={confirmDelete}>Delete schedule</Button>
          </Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </>
  );
}
