import { useEffect, useState } from "react";
import {
  Avatar, Badge, Box, Button, Dialog, Flex, Grid, HStack, IconButton, Input, NativeSelect, Portal, Skeleton, Stack, Text, Textarea, Wrap, WrapItem,
} from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { useImageUpload } from "@/hooks/useImageUpload";
import { toaster } from "@/components/ui/toaster";
import { Naira } from "@/components/ui/naira";
import { useCreateCustomer, useUpdateCustomer, type Customer } from "@/features/customers";
import { useServices } from "@/features/services";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

type FormState = {
  first_name: string; last_name: string; email: string; phone: string; address: string; date_of_birth: string; profile_image_url: string;
  preferred_staff_id: string; communication_preference: "email" | "sms" | "phone" | "none"; status: "active" | "inactive"; preferred_services: string[];
};
const empty: FormState = { first_name: "", last_name: "", email: "", phone: "", address: "", date_of_birth: "", profile_image_url: "", preferred_staff_id: "", communication_preference: "email", status: "active", preferred_services: [] };

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <Stack gap="1"><Text fontSize="sm" fontWeight="medium">{label}</Text>{children}{error && <Text fontSize="xs" color="red.500">{error}</Text>}</Stack>;
}

export function CustomerFormDialog({ open, onOpenChange, customer, onSuccess }: { open: boolean; onOpenChange: (v: boolean) => void; customer?: Customer | null; onSuccess?: () => void }) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const isEdit = !!customer?.id;
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const servicesQ = useServices({ page: 1, page_size: 200, active_only: true });
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data, staleTime: 60000 });
  const upload = useImageUpload({ folder: "salon-customers" });
  const services = servicesQ.data?.services || [];
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];

  useEffect(() => {
    if (!open) return;
    setErrors({});
    upload.clearPreview();
    setForm(customer ? {
      first_name: customer.first_name || "", last_name: customer.last_name || "", email: customer.email || "", phone: customer.phone || "",
      address: customer.address || "", date_of_birth: customer.date_of_birth || "", profile_image_url: customer.profile_image_url || "",
      preferred_staff_id: customer.preferred_staff_id || "",
      communication_preference: customer.communication_preference || "email", status: customer.status || "active",
      preferred_services: Array.isArray(customer.preferred_services) ? customer.preferred_services : [],
    } : empty);
    if (customer?.profile_image_url) upload.setPreview(customer.profile_image_url);
  }, [open, customer]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.first_name.trim()) e.first_name = "First name is required";
    if (!form.last_name.trim()) e.last_name = "Last name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
    if (!form.phone.trim()) e.phone = "Phone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const toggleService = (id: string) => setForm((f) => ({ ...f, preferred_services: f.preferred_services.includes(id) ? f.preferred_services.filter((s) => s !== id) : [...f.preferred_services, id] }));

  const submit = async () => {
    if (!validate()) return;
    const payload = { ...form, address: form.address.trim() || null, date_of_birth: form.date_of_birth || null, profile_image_url: form.profile_image_url || null, preferred_staff_id: form.preferred_staff_id || null, preferred_services: form.preferred_services };
    try {
      if (isEdit) await update.mutateAsync({ id: customer!.id, payload });
      else await create.mutateAsync(payload);
      toaster.create({ title: isEdit ? "Customer updated" : "Customer created", description: isEdit ? "Customer updated successfully" : "Customer created successfully", type: "success" });
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      toaster.create({ title: "Save failed", description: e?.response?.data?.detail || e?.message || "Failed to save customer", type: "error" });
    }
  };

  const loading = create.isPending || update.isPending;
  return (
    <Dialog.Root open={open} onOpenChange={(e) => !loading && onOpenChange(e.open)} size="xl" scrollBehavior="inside">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>{isEdit ? "Edit Customer" : "Add New Customer"}</Dialog.Title></Dialog.Header>
        <Dialog.Body>
          <Stack gap="4">
            <Flex align="center" gap="4" direction={{ base: "column", sm: "row" }}>
              <Box position="relative">
                <Avatar.Root size="xl"><Avatar.Image src={upload.preview || form.profile_image_url || undefined} /><Avatar.Fallback name={`${form.first_name} ${form.last_name}`.trim() || "Customer"} /></Avatar.Root>
                {(upload.preview || form.profile_image_url) && <IconButton aria-label="Remove image" position="absolute" top="-1" right="-1" size="2xs" colorPalette="red" rounded="full" onClick={() => { upload.clearPreview(); setForm((f) => ({ ...f, profile_image_url: "" })); }}><LuX /></IconButton>}
              </Box>
              <Stack gap="1" flex="1" w="full">
                <Text fontSize="sm" fontWeight="medium">Profile Image</Text>
                <Input type="file" accept="image/*" disabled={loading || upload.isUploading} onChange={async (e) => {
                  const file = upload.handleFileChange(e);
                  if (!file) return;
                  try { const url = await upload.uploadImage(file); setForm((f) => ({ ...f, profile_image_url: url })); }
                  catch (err: any) { toaster.create({ title: "Upload failed", description: err?.message, type: "error" }); }
                }} />
                <Text fontSize="xs" color="fg.muted">{upload.isUploading ? `Uploading ${upload.uploadProgress}%` : "PNG/JPG, max 5MB"}</Text>
              </Stack>
            </Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
              <Field label="First Name *" error={errors.first_name}><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} disabled={loading} /></Field>
              <Field label="Last Name *" error={errors.last_name}><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} disabled={loading} /></Field>
              <Field label="Email *" error={errors.email}><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={loading} /></Field>
              <Field label="Phone *" error={errors.phone}><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} disabled={loading} /></Field>
              <Field label="Date of Birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} disabled={loading} /></Field>
              <Field label="Preferred Staff"><NativeSelect.Root disabled={loading || staffQ.isLoading}><NativeSelect.Field value={form.preferred_staff_id} onChange={(e) => setForm({ ...form, preferred_staff_id: e.target.value })}><option value="">No preference</option>{staff.map((s: any) => <option key={s.id} value={s.id}>{s.name || [s.first_name, s.last_name].filter(Boolean).join(" ") || s.email || (() => { throw new Error(`Missing staff display name for ${s.id}`); })()}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field>
              <Field label="Communication Preference"><NativeSelect.Root disabled={loading}><NativeSelect.Field value={form.communication_preference} onChange={(e) => setForm({ ...form, communication_preference: e.target.value as FormState["communication_preference"] })}><option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone</option><option value="none">None</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field>
              <Field label="Status"><NativeSelect.Root disabled={loading}><NativeSelect.Field value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"] })}><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field>
            </Grid>
            <Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} disabled={loading} /></Field>
            <Field label="Preferred Services">
              <Box borderWidth="1px" rounded="md" p="3" maxH="220px" overflowY="auto">
                {servicesQ.isLoading ? <Stack gap="2">{[...Array(4)].map((_, i) => <Skeleton key={i} h="5" />)}</Stack> : services.length === 0 ? <Text fontSize="sm" color="fg.muted">No active services available.</Text> : <Stack gap="2">
                  {services.map((s: any) => (
                    <HStack key={s.id} as="label" align="start" cursor="pointer">
                      <input type="checkbox" checked={form.preferred_services.includes(s.id)} onChange={() => toggleService(s.id)} disabled={loading} style={{ marginTop: 3 }} />
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">{s.name}</Text>
                        <Text fontSize="xs" color="fg.muted">{s.category ? `${s.category} · ` : ""}{s.duration_minutes} min · <Naira value={s.price} /></Text>
                      </Box>
                    </HStack>
                  ))}
                </Stack>}
              </Box>
              {form.preferred_services.length > 0 && <Wrap mt="2">{form.preferred_services.map((sid) => { const s = services.find((x: any) => x.id === sid); if (!s?.name) throw new Error(`Missing service name for service ${sid}`); return <WrapItem key={sid}><Badge colorPalette="blue">{s.name}</Badge></WrapItem>; })}</Wrap>}
            </Field>
          </Stack>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
          <Button colorPalette="brand" loading={loading} onClick={submit}>{isEdit ? "Update Customer" : "Create Customer"}</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}
