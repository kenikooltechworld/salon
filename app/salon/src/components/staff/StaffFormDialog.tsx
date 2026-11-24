import { useEffect, useState, type ReactNode } from "react";
import { Avatar, Badge, Box, Button, Dialog, Flex, Grid, HStack, IconButton, Input, NativeSelect, Portal, Skeleton, Stack, Text, Textarea, Wrap, WrapItem } from "@chakra-ui/react";
import { LuChevronDown, LuX } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { toaster } from "@/components/ui/toaster";
import { apiClient } from "@/lib/api";
import { useImageUpload } from "@/hooks/useImageUpload";
import { useServices } from "@/features/services";
import { formatNaira } from "@/components/ui/naira";
import { useCreateStaff, useUpdateStaff, type Staff, type StaffPayload } from "@/features/staff";

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <Stack gap="1"><Text fontSize="sm" fontWeight="medium">{label}</Text>{children}{error && <Text fontSize="xs" color="red.500">{error}</Text>}</Stack>;
}

export function StaffFormDialog({ open, onOpenChange, initial }: { open: boolean; onOpenChange: (v: boolean) => void; initial?: Staff | null }) {
  const isEdit = !!initial?.id;
  const create = useCreateStaff();
  const update = useUpdateStaff();
  const servicesQ = useServices({ page: 1, page_size: 100, active_only: true });
  const rolesQ = useQuery({ queryKey: ["roles"], queryFn: async () => { try { return (await apiClient.get("/roles")).data; } catch { return { roles: [] }; } }, staleTime: 60000 });
  const upload = useImageUpload({ folder: "staff-profiles" });
  const certUpload = useImageUpload({ folder: "staff-certificates", mediaType: "document" });
  const services = servicesQ.data?.services || [];
  const roles = Array.isArray((rolesQ.data as any)?.roles) ? (rolesQ.data as any).roles : Array.isArray(rolesQ.data) ? rolesQ.data : [];
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [servicesOpen, setServicesOpen] = useState(false);
  const [form, setForm] = useState<StaffPayload>({ firstName: "", lastName: "", email: "", phone: "", role_ids: [], service_ids: [], specialties: [], certifications: [], certification_files: [], payment_type: "hourly", payment_rate: 0, hire_date: "", bio: "", profile_image_url: "", status: "active", is_available_for_public_booking: false });

  useEffect(() => {
    if (!open) return;
    setErrors({}); setSpecialtyInput(""); setCertInput(""); setServicesOpen(false); upload.clearPreview();
    setForm(initial ? {
      firstName: initial.firstName || "", lastName: initial.lastName || "", email: initial.email || "", phone: initial.phone || "",
      role_ids: initial.role_ids || [], service_ids: initial.service_ids || [], specialties: initial.specialties || [],
      certifications: initial.certifications || [], certification_files: initial.certification_files || [],
      payment_type: initial.payment_type || "hourly", payment_rate: Number(initial.payment_rate || 0),
      hire_date: initial.hire_date || "", bio: initial.bio || "", profile_image_url: initial.profile_image_url || "",
      status: initial.status || "active", is_available_for_public_booking: !!initial.is_available_for_public_booking,
    } : { firstName: "", lastName: "", email: "", phone: "", role_ids: [], service_ids: [], specialties: [], certifications: [], certification_files: [], payment_type: "hourly", payment_rate: 0, hire_date: "", bio: "", profile_image_url: "", status: "active", is_available_for_public_booking: false });
    if (initial?.profile_image_url) upload.setPreview(initial.profile_image_url);
  }, [open, initial?.id]);

  const validate = () => { const e: Record<string, string> = {}; if (!form.firstName.trim()) e.firstName = "First name is required"; if (!form.lastName.trim()) e.lastName = "Last name is required"; if (!form.email.trim()) e.email = "Email is required"; setErrors(e); return Object.keys(e).length === 0; };
  const set = (k: keyof StaffPayload, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: "role_ids" | "service_ids", id: string) => setForm((f) => ({ ...f, [k]: (f[k] || []).includes(id) ? (f[k] || []).filter((x) => x !== id) : [...(f[k] || []), id] }));
  const addTag = (k: "specialties" | "certifications", v: string, clear: () => void) => { const t = v.trim(); if (!t) return; setForm((f) => ({ ...f, [k]: (f[k] || []).includes(t) ? f[k] : [...(f[k] || []), t] })); clear(); };
  const removeTag = (k: "specialties" | "certifications" | "certification_files", i: number) => setForm((f) => ({ ...f, [k]: (f[k] || []).filter((_, idx) => idx !== i) }));

  const onSubmit = async () => {
    if (!validate()) return;
    const payload: StaffPayload = { ...form, payment_rate: Number(form.payment_rate || 0), hire_date: form.hire_date || null, phone: form.phone || null, bio: form.bio || null, profile_image_url: form.profile_image_url || null };
    try {
      if (isEdit) await update.mutateAsync({ id: initial!.id, payload });
      else await create.mutateAsync(payload);
      toaster.create({ title: isEdit ? "Staff updated" : "Staff created", type: "success" });
      onOpenChange(false);
    } catch (e: any) { toaster.create({ title: "Save failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  const busy = create.isPending || update.isPending || upload.isUploading || certUpload.isUploading;
  return <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" scrollBehavior="inside">
    <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
      <Dialog.Header><Dialog.Title>{isEdit ? "Edit Staff Member" : "Add Staff Member"}</Dialog.Title></Dialog.Header>
      <Dialog.Body><Stack gap="4">
        <Flex gap="4" align="center" direction={{ base: "column", sm: "row" }}>
          <Box position="relative"><Avatar.Root size="xl"><Avatar.Image src={upload.preview || form.profile_image_url || undefined} /><Avatar.Fallback name={`${form.firstName} ${form.lastName}`.trim() || "Staff"} /></Avatar.Root>{(upload.preview || form.profile_image_url) && <IconButton aria-label="Remove image" position="absolute" top="-1" right="-1" size="2xs" colorPalette="red" rounded="full" onClick={() => { upload.clearPreview(); set("profile_image_url", ""); }}><LuX /></IconButton>}</Box>
          <Stack flex="1" w="full" gap="1"><Text fontSize="sm" fontWeight="medium">Profile Image</Text><Input type="file" accept="image/*" disabled={busy} onChange={async (e) => { const f = upload.handleFileChange(e); if (!f) return; try { const url = await upload.uploadImage(f); set("profile_image_url", url); } catch (err: any) { toaster.create({ title: "Upload failed", description: err?.message, type: "error" }); } }} /><Text fontSize="xs" color="fg.muted">{upload.isUploading ? `Uploading ${upload.uploadProgress}%` : "PNG/JPG, max 5MB"}</Text></Stack>
        </Flex>
        <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
          <Field label="First Name *" error={errors.firstName}><Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
          <Field label="Last Name *" error={errors.lastName}><Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <Field label="Email *" error={errors.email}><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field label="Payment Type"><NativeSelect.Root><NativeSelect.Field value={form.payment_type} onChange={(e) => set("payment_type", e.target.value as any)}><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="commission">Commission</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field>
          <Field label={form.payment_type === "commission" ? "Commission Rate (%)" : "Payment Rate"}><Input type="number" min={0} step="0.01" value={String(form.payment_rate)} onChange={(e) => set("payment_rate", e.target.value)} /></Field>
          <Field label="Hire Date"><Input type="date" value={form.hire_date || ""} onChange={(e) => set("hire_date", e.target.value)} /></Field>
          <Field label="Status"><NativeSelect.Root><NativeSelect.Field value={form.status} onChange={(e) => set("status", e.target.value as any)}><option value="active">Active</option><option value="inactive">Inactive</option><option value="on_leave">On Leave</option><option value="terminated">Terminated</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field>
        </Grid>
        <Field label="Bio"><Textarea rows={3} value={form.bio || ""} onChange={(e) => set("bio", e.target.value)} /></Field>
        <Field label="Roles"><Box borderWidth="1px" rounded="md" p="3" maxH="180px" overflowY="auto">{roles.length === 0 ? <Text fontSize="sm" color="fg.muted">No roles available (user role will be used).</Text> : <Stack gap="2">{roles.map((r: any) => <HStack key={r.id || r.name} as="label"><input type="checkbox" checked={(form.role_ids || []).includes(r.id || r.name)} onChange={() => toggle("role_ids", r.id || r.name)} /><Text fontSize="sm">{r.name || r.id}</Text></HStack>)}</Stack>}</Box></Field>
        <Field label="Services">
          <Box position="relative">
            <Button w="full" variant="outline" justifyContent="space-between" onClick={() => setServicesOpen((v) => !v)} disabled={servicesQ.isLoading}>
              <Text fontSize="sm" fontWeight="normal" truncate>{(form.service_ids || []).length > 0 ? `${(form.service_ids || []).length} service${(form.service_ids || []).length === 1 ? "" : "s"} selected` : "Select services"}</Text>
              <LuChevronDown />
            </Button>
            {servicesOpen && (
              <Box position="absolute" top="calc(100% + 4px)" left="0" right="0" zIndex="20" borderWidth="1px" rounded="md" bg="bg.panel" shadow="md" p="3" maxH="240px" overflowY="auto">
                {servicesQ.isLoading ? <Stack gap="2">{[...Array(4)].map((_, i) => <Skeleton key={i} h="5" />)}</Stack> : servicesQ.isError ? <Stack align="start" gap="2"><Text fontSize="sm" color="red.500">Unable to load active services.</Text><Button size="xs" variant="outline" onClick={() => servicesQ.refetch()}>Retry loading services</Button></Stack> : services.length === 0 ? <Text fontSize="sm" color="fg.muted">No active services available.</Text> : <Stack gap="2">
                  {services.map((s: any) => (
                    <HStack key={s.id} as="label" align="start" cursor="pointer">
                      <input type="checkbox" checked={(form.service_ids || []).includes(s.id)} onChange={() => toggle("service_ids", s.id)} style={{ marginTop: 3 }} />
                      <Avatar.Root size="sm"><Avatar.Image src={s.public_image_url || undefined} /><Avatar.Fallback name={s.name} /></Avatar.Root>
                      <Box>
                        <Text fontSize="sm" fontWeight="medium">{s.name}</Text>
                        <Text fontSize="xs" color="fg.muted">{s.category ? `${s.category} · ` : ""}{s.duration_minutes} min · {formatNaira(s.price)}</Text>
                      </Box>
                    </HStack>
                  ))}
                </Stack>}
              </Box>
            )}
          </Box>
          {(form.service_ids || []).length > 0 && <Wrap mt="2">{(form.service_ids || []).map((sid) => { const s = services.find((x: any) => x.id === sid); return <WrapItem key={sid}><Badge colorPalette="blue" display="inline-flex" gap="1" alignItems="center">{s?.name || sid}<IconButton aria-label="Remove service" size="2xs" variant="ghost" onClick={() => toggle("service_ids", sid)}><LuX /></IconButton></Badge></WrapItem>; })}</Wrap>}
        </Field>
        <Field label="Specialties"><Stack gap="2"><HStack><Input value={specialtyInput} onChange={(e) => setSpecialtyInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("specialties", specialtyInput, () => setSpecialtyInput("")); } }} placeholder="Type specialty and press Enter" /><Button onClick={() => addTag("specialties", specialtyInput, () => setSpecialtyInput(""))}>Add</Button></HStack><Wrap>{(form.specialties || []).map((s, i) => <WrapItem key={`${s}-${i}`}><Badge colorPalette="blue" display="inline-flex" gap="1" alignItems="center">{s}<IconButton aria-label="Remove" size="2xs" variant="ghost" onClick={() => removeTag("specialties", i)}><LuX /></IconButton></Badge></WrapItem>)}</Wrap></Stack></Field>
        <Field label="Certifications"><Stack gap="2"><HStack><Input value={certInput} onChange={(e) => setCertInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag("certifications", certInput, () => setCertInput("")); } }} placeholder="Type certification and press Enter" /><Button onClick={() => addTag("certifications", certInput, () => setCertInput(""))}>Add</Button></HStack><Wrap>{(form.certifications || []).map((s, i) => <WrapItem key={`${s}-${i}`}><Badge colorPalette="purple" display="inline-flex" gap="1" alignItems="center">{s}<IconButton aria-label="Remove" size="2xs" variant="ghost" onClick={() => removeTag("certifications", i)}><LuX /></IconButton></Badge></WrapItem>)}</Wrap></Stack></Field>
        <Field label="Certificate Files">
          <Stack gap="2">
            <Input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,image/*" disabled={busy} onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;
              const uploaded: string[] = [];
              for (const file of files) {
                try {
                  const url = await certUpload.uploadImage(file);
                  uploaded.push(url);
                } catch (err: any) {
                  toaster.create({ title: "Upload failed", description: err?.message || `Failed to upload ${file.name}`, type: "error" });
                }
              }
              if (uploaded.length > 0) setForm((p) => ({ ...p, certification_files: [...(p.certification_files || []), ...uploaded] }));
              e.target.value = "";
            }} />
            <Text fontSize="xs" color="fg.muted">{certUpload.isUploading ? `Uploading ${certUpload.uploadProgress}%` : "Select one or more files (PDF, images, DOC). Each file is stored in certificate files."}</Text>
            <Wrap>{(form.certification_files || []).map((url, i) => <WrapItem key={`${url}-${i}`}><HStack borderWidth="1px" rounded="md" p="2" maxW="full"><Text fontSize="xs" maxW="260px" truncate>{url.split("/").pop() || url}</Text><IconButton aria-label="Remove file" size="2xs" variant="ghost" onClick={() => removeTag("certification_files", i)}><LuX /></IconButton></HStack></WrapItem>)}</Wrap>
          </Stack>
        </Field>
      </Stack></Dialog.Body>
      <Dialog.Footer><Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button><Button colorPalette="brand" loading={busy} onClick={onSubmit}>{isEdit ? "Update Staff Member" : "Add Staff Member"}</Button></Dialog.Footer>
    </Dialog.Content></Dialog.Positioner></Portal>
  </Dialog.Root>;
}
