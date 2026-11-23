import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, Portal, Skeleton, Stack, Tabs, Text, Textarea, NativeSelect,
} from "@chakra-ui/react";
import { LuArrowLeft, LuMail, LuPencil, LuRefreshCw, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import {
  useCustomer, useCustomerBalance, useCustomerBookingEligibility, useCustomerHistory, useCustomerPreferences,
  useDeleteCustomer, useResendCustomerPortalInvitation, useUpdateCustomerBalance, useUpdateCustomerPreferences,
} from "@/features/customers";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { CustomerFormDialog } from "./CustomerFormDialog";

function canManage(role?: string) { return ["owner", "admin", "manager", "staff"].includes((role || "").toLowerCase()); }
function canDelete(role?: string) { return ["owner", "admin", "manager"].includes((role || "").toLowerCase()); }
const TIME_SLOTS = [{ value: "morning", label: "Morning (6AM - 12PM)" }, { value: "afternoon", label: "Afternoon (12PM - 6PM)" }, { value: "evening", label: "Evening (6PM - 12AM)" }];
const COMM_METHODS = [{ value: "email", label: "Email" }, { value: "sms", label: "SMS" }, { value: "phone", label: "Phone" }];
const LANGUAGES = [{ value: "en", label: "English" }, { value: "es", label: "Spanish" }, { value: "fr", label: "French" }, { value: "de", label: "German" }, { value: "it", label: "Italian" }, { value: "pt", label: "Portuguese" }];
function money(v: number | string | undefined) { return `₦${Number(v || 0).toLocaleString()}`; }

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const removeAllowed = canDelete(role);

  const { data: customer, isLoading, refetch } = useCustomer(id);
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useCustomerBalance(id);
  const { data: eligibility, refetch: refetchEligibility } = useCustomerBookingEligibility(id);
  const { data: historyResp, isLoading: historyLoading } = useCustomerHistory(id, { page: 1, page_size: 20 });
  const { data: preferences, isLoading: prefLoading } = useCustomerPreferences(id);
  const servicesQ = useQuery({ queryKey: ["services", "all"], queryFn: async () => (await apiClient.get("/services", { params: { page: 1, page_size: 200 } })).data, staleTime: 60000 });
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data, staleTime: 60000 });
  const services = Array.isArray((servicesQ.data as any)?.services) ? (servicesQ.data as any).services : Array.isArray(servicesQ.data) ? servicesQ.data : [];
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];

  const del = useDeleteCustomer();
  const resendInvite = useResendCustomerPortalInvitation();
  const updateBalance = useUpdateCustomerBalance();
  const updatePrefs = useUpdateCustomerPreferences();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [prefForm, setPrefForm] = useState({ preferred_staff_ids: [] as string[], preferred_service_ids: [] as string[], communication_methods: ["email"] as string[], preferred_time_slots: [] as string[], language: "en", notes: "" });

  useEffect(() => {
    if (preferences) setPrefForm({
      preferred_staff_ids: preferences.preferred_staff_ids || [],
      preferred_service_ids: preferences.preferred_service_ids || [],
      communication_methods: preferences.communication_methods?.length ? preferences.communication_methods : ["email"],
      preferred_time_slots: preferences.preferred_time_slots || [],
      language: preferences.language || "en",
      notes: preferences.notes || "",
    });
  }, [preferences]);

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6"><Skeleton h="72" /><Skeleton h="72" /></Grid></Stack>;
  if (!customer) return <Card.Root><Card.Body><Text>Customer not found</Text><Button mt="3" onClick={() => navigate("/customers")}>Back</Button></Card.Body></Card.Root>;

  const history = historyResp?.history || [];
  const remove = async () => {
    try { await del.mutateAsync(customer.id); toaster.create({ title: "Customer deleted", description: "Customer and related data deletion was requested successfully.", type: "success" }); navigate("/customers"); }
    catch (e: any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  const resend = async () => {
    try { const res = await resendInvite.mutateAsync(customer.id); toaster.create({ title: "Invitation sent", description: res.data?.message || "Portal setup invitation sent.", type: "success" }); refetch(); }
    catch (e: any) { toaster.create({ title: "Failed to send", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  const recalc = async () => {
    try { await updateBalance.mutateAsync(customer.id); await Promise.all([refetchBalance(), refetchEligibility(), refetch()]); toaster.create({ title: "Balance updated", type: "success" }); }
    catch (e: any) { toaster.create({ title: "Balance update failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  const savePrefs = async () => {
    try { await updatePrefs.mutateAsync({ id: customer.id, payload: prefForm }); setEditingPrefs(false); toaster.create({ title: "Preferences saved", type: "success" }); }
    catch (e: any) { toaster.create({ title: "Save failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  const toggle = (key: "communication_methods" | "preferred_time_slots" | "preferred_staff_ids" | "preferred_service_ids", value: string) => setPrefForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));
  const staffLabel = (m: any, fallback?: string) => m?.name || [m?.first_name, m?.last_name].filter(Boolean).join(" ") || m?.email || fallback || m?.id || "Unknown Staff";
  const serviceLabel = (sid: string) => services.find((s: any) => String(s.id) === String(sid))?.name || "Unknown Service";
  const preferredStaffName = (() => { const sid = customer.preferred_staff_id; if (!sid) return null; const m = staff.find((s: any) => String(s.id) === String(sid)); return staffLabel(m, String(sid)); })();
  const preferredServiceNames = (customer.preferred_services || []).map((sid) => serviceLabel(String(sid)));

  return (
    <Stack gap="6">
      <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
        <HStack align="start"><Button variant="ghost" onClick={() => navigate("/customers")}><LuArrowLeft /> Back</Button><Box>
          <Heading size="xl">{customer.first_name} {customer.last_name}</Heading>
          <Text color="fg.muted" fontSize="sm">{customer.email}</Text>
        </Box></HStack>
        {manage && <HStack flexWrap="wrap">
          {!customer.has_portal_access && <Button variant="outline" loading={resendInvite.isPending} onClick={resend}><LuMail /> Send Portal Invite</Button>}
          <Button variant="outline" onClick={() => setEditOpen(true)}><LuPencil /> Edit</Button>
          {removeAllowed && <Button colorPalette="red" variant="outline" onClick={() => setDeleteOpen(true)}><LuTrash2 /> Delete</Button>}
        </HStack>}
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
        <Box>
          <Tabs.Root defaultValue="profile">
            <Tabs.List>
              <Tabs.Trigger value="profile">Profile</Tabs.Trigger>
              <Tabs.Trigger value="balance">Balance</Tabs.Trigger>
              <Tabs.Trigger value="preferences">Preferences</Tabs.Trigger>
              <Tabs.Trigger value="history">History</Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="profile" pt="4">
              <Card.Root><Card.Body><Heading size="md" mb="4">Contact Information</Heading><Stack gap="4">
                <Box><Text fontSize="xs" color="fg.muted">Email</Text><Text>{customer.email}</Text></Box>
                <Box><Text fontSize="xs" color="fg.muted">Phone</Text><Text>{customer.phone}</Text></Box>
                {customer.address && <Box><Text fontSize="xs" color="fg.muted">Address</Text><Text>{customer.address}</Text></Box>}
                {customer.date_of_birth && <Box><Text fontSize="xs" color="fg.muted">Date of Birth</Text><Text>{new Date(customer.date_of_birth).toLocaleDateString()}</Text></Box>}
                <Box><Text fontSize="xs" color="fg.muted">Member Since</Text><Text>{new Date(customer.created_at).toLocaleDateString()}</Text></Box>
                <Box><Text fontSize="xs" color="fg.muted">Preferred Staff</Text><Text>{preferredStaffName || "No preference"}</Text></Box>
                <Box><Text fontSize="xs" color="fg.muted">Preferred Services</Text>{preferredServiceNames.length ? <HStack wrap="wrap" mt="1">{preferredServiceNames.map((n, i) => <Badge key={`${n}-${i}`} colorPalette="blue">{n}</Badge>)}</HStack> : <Text>No preferred services</Text>}</Box>
              </Stack></Card.Body></Card.Root>
            </Tabs.Content>

            <Tabs.Content value="balance" pt="4">
              <Card.Root><Card.Body>
                <Flex justify="space-between" align="center" mb="4"><Heading size="md">Balance</Heading><Button size="sm" variant="outline" loading={updateBalance.isPending} onClick={recalc}><LuRefreshCw /> Recalculate</Button></Flex>
                {balanceLoading ? <Skeleton h="24" /> : balance ? <Stack gap="4">
                  <Box bg="bg.muted" p="4" rounded="md">
                    <Flex justify="space-between" gap="2" wrap="wrap"><Text fontSize="sm" color="fg.muted">Outstanding Balance</Text>{eligibility && <Badge colorPalette={eligibility.is_eligible_to_book ? "green" : "red"}>{eligibility.is_eligible_to_book ? "Can Book" : "Cannot Book"}</Badge>}</Flex>
                    <Heading size="lg" mt="1">{money(balance.outstanding_balance)}</Heading>
                    {balance.unpaid_invoice_count > 0 && <Text fontSize="sm" color="fg.muted">({balance.unpaid_invoice_count} unpaid invoice{balance.unpaid_invoice_count > 1 ? "s" : ""})</Text>}
                    {eligibility && !eligibility.is_eligible_to_book && <Text fontSize="sm" color="fg.muted" mt="2">{eligibility.reason}</Text>}
                  </Box>
                  <Box><Text fontWeight="medium" mb="2">Unpaid Invoices</Text>
                    {balance.unpaid_invoices?.length ? <Stack gap="2">{balance.unpaid_invoices.map((inv) => <Flex key={inv.invoice_id} justify="space-between" p="3" bg="bg.muted" rounded="md"><Box><Text fontSize="sm" fontWeight="medium">Invoice #{String(inv.invoice_id).slice(-8)}</Text><Text fontSize="xs" color="fg.muted">{inv.status}{inv.due_date ? ` · Due ${new Date(inv.due_date).toLocaleDateString()}` : ""}</Text></Box><Text fontSize="sm" fontWeight="semibold">{money(inv.amount)}</Text></Flex>)}</Stack> : <Text color="fg.muted">No unpaid invoices / no outstanding balance.</Text>}
                  </Box>
                </Stack> : <Text color="fg.muted">Failed to load balance information.</Text>}
              </Card.Body></Card.Root>
            </Tabs.Content>

            <Tabs.Content value="preferences" pt="4">
              <Card.Root><Card.Body>
                <Flex justify="space-between" align="center" mb="4"><Heading size="md">Preferences</Heading>{manage && (editingPrefs ? <HStack><Button size="sm" variant="outline" onClick={() => setEditingPrefs(false)}>Cancel</Button><Button size="sm" colorPalette="brand" loading={updatePrefs.isPending} onClick={savePrefs}>Save</Button></HStack> : <Button size="sm" variant="outline" onClick={() => setEditingPrefs(true)}>Edit</Button>)}</Flex>
                {prefLoading ? <Skeleton h="40" /> : <Stack gap="5">
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Preferred Staff</Text>{editingPrefs ? <Stack gap="2">{staff.map((m: any) => <HStack key={m.id} as="label"><input type="checkbox" checked={prefForm.preferred_staff_ids.includes(String(m.id))} onChange={() => toggle("preferred_staff_ids", String(m.id))} /><Text fontSize="sm">{staffLabel(m)}</Text></HStack>)}</Stack> : <HStack wrap="wrap">{prefForm.preferred_staff_ids.length ? prefForm.preferred_staff_ids.map((sid) => { const m = staff.find((s: any) => String(s.id) === sid); return <Badge key={sid}>{staffLabel(m, sid)}</Badge>; }) : <Text fontSize="sm" color="fg.muted">No preferences set</Text>}</HStack>}</Box>
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Preferred Services</Text>{editingPrefs ? <Stack gap="2">{services.map((s: any) => <HStack key={s.id} as="label" align="start"><input type="checkbox" checked={prefForm.preferred_service_ids.includes(String(s.id))} onChange={() => toggle("preferred_service_ids", String(s.id))} /><Box><Text fontSize="sm">{s.name}</Text>{s.description && <Text fontSize="xs" color="fg.muted">{s.description}</Text>}</Box></HStack>)}</Stack> : <HStack wrap="wrap">{prefForm.preferred_service_ids.length ? prefForm.preferred_service_ids.map((sid) => { services.find((x: any) => String(x.id) === sid); return <Badge key={sid}>{serviceLabel(sid)}</Badge>; }) : <Text fontSize="sm" color="fg.muted">No preferences set</Text>}</HStack>}</Box>
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Preferred Time Slots</Text>{editingPrefs ? <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="2">{TIME_SLOTS.map((t) => <HStack key={t.value} as="label"><input type="checkbox" checked={prefForm.preferred_time_slots.includes(t.value)} onChange={() => toggle("preferred_time_slots", t.value)} /><Text fontSize="sm">{t.label}</Text></HStack>)}</Grid> : <HStack wrap="wrap">{prefForm.preferred_time_slots.length ? prefForm.preferred_time_slots.map((t) => <Badge key={t}>{TIME_SLOTS.find((x) => x.value === t)?.label || t}</Badge>) : <Text fontSize="sm" color="fg.muted">No preferences set</Text>}</HStack>}</Box>
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Communication Methods</Text>{editingPrefs ? <Grid templateColumns={{ base: "1fr", md: "repeat(3,1fr)" }} gap="2">{COMM_METHODS.map((m) => <HStack key={m.value} as="label"><input type="checkbox" checked={prefForm.communication_methods.includes(m.value)} onChange={() => toggle("communication_methods", m.value)} /><Text fontSize="sm">{m.label}</Text></HStack>)}</Grid> : <HStack wrap="wrap">{prefForm.communication_methods.map((m) => <Badge key={m}>{COMM_METHODS.find((x) => x.value === m)?.label || m}</Badge>)}</HStack>}</Box>
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Language</Text>{editingPrefs ? <NativeSelect.Root maxW="240px"><NativeSelect.Field value={prefForm.language} onChange={(e) => setPrefForm({ ...prefForm, language: e.target.value })}>{LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root> : <Badge>{LANGUAGES.find((l) => l.value === prefForm.language)?.label || prefForm.language}</Badge>}</Box>
                  <Box><Text fontSize="sm" fontWeight="medium" mb="2">Notes</Text>{editingPrefs ? <Textarea value={prefForm.notes} onChange={(e) => setPrefForm({ ...prefForm, notes: e.target.value })} /> : <Text fontSize="sm" color={prefForm.notes ? "fg" : "fg.muted"}>{prefForm.notes || "No notes added"}</Text>}</Box>
                </Stack>}
              </Card.Body></Card.Root>
            </Tabs.Content>

            <Tabs.Content value="history" pt="4">
              <Card.Root><Card.Body>
                <Heading size="md" mb="4">Appointment History {historyResp?.total ? `(${historyResp.total})` : ""}</Heading>
                {historyLoading ? <Skeleton h="24" /> : history.length ? <Stack gap="3">
                  {history.slice(0, 5).map((h) => <Box key={h.id} borderBottomWidth="1px" pb="3"><Flex justify="space-between" gap="3"><Box><Text fontWeight="medium">{h.service_name}</Text><Text fontSize="sm" color="fg.muted">with {h.staff_name}</Text></Box><Text fontSize="sm" color="fg.muted">{h.appointment_date ? new Date(h.appointment_date).toLocaleDateString() : "-"}</Text></Flex>{h.rating > 0 && <Text fontSize="xs" color="fg.muted" mt="1">Rating: {h.rating}/5</Text>}</Box>)}
                  {Number(historyResp?.total || 0) > 5 && <Button variant="outline" onClick={() => navigate(`/customers/${id}/appointments`)}>View All Appointments ({historyResp?.total})</Button>}
                </Stack> : <Text color="fg.muted">No appointment history yet</Text>}
              </Card.Body></Card.Root>
            </Tabs.Content>
          </Tabs.Root>
        </Box>

        <Stack gap="6">
          <Card.Root><Card.Body><Heading size="md" mb="4">Status</Heading><Stack gap="3">
            <Box><Text fontSize="xs" color="fg.muted">Account Status</Text><Badge mt="1" colorPalette={customer.status === "active" ? "green" : "gray"}>{customer.status}</Badge></Box>
            <Box><Text fontSize="xs" color="fg.muted">Total Appointments</Text><Text fontWeight="semibold">{historyResp?.total ?? history.length}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Last Appointment</Text><Text>{history[0]?.appointment_date ? new Date(history[0].appointment_date).toLocaleDateString() : "No appointments"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Communication</Text><Text>{customer.communication_preference}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Guest</Text><Text>{customer.is_guest ? "Yes" : "No"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Portal Access</Text><Text>{customer.has_portal_access ? "Yes" : "No"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Outstanding Balance</Text><Text fontWeight="semibold">{money(customer.outstanding_balance)}</Text></Box>
          </Stack></Card.Body></Card.Root>
        </Stack>
      </Grid>

      <CustomerFormDialog open={editOpen} onOpenChange={setEditOpen} customer={customer} onSuccess={() => { setEditOpen(false); refetch(); }} />
      <Dialog.Root open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
          <Dialog.Header><Dialog.Title>Delete Customer</Dialog.Title></Dialog.Header>
          <Dialog.Body><Text>Are you sure you want to delete this customer? This will permanently delete the customer and related data where supported. This action cannot be undone.</Text></Dialog.Body>
          <Dialog.Footer><Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button colorPalette="red" loading={del.isPending} onClick={remove}>Delete</Button></Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </Stack>
  );
}

