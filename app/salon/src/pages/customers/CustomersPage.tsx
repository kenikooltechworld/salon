import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, IconButton, Input, NativeSelect,
  Portal, Skeleton, Stack, Table, Text, Textarea,
} from "@chakra-ui/react";
import { LuMail, LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import {
  useCreateCustomer, useCustomers, useDeleteCustomer, useResendCustomerPortalInvitation, useUpdateCustomer, type Customer,
} from "@/features/customers";

function canManage(role?: string) { return ["owner", "admin", "manager", "staff"].includes((role || "").toLowerCase()); }
function canDelete(role?: string) { return ["owner", "admin", "manager"].includes((role || "").toLowerCase()); }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box><Text fontSize="sm" mb="1" fontWeight="medium">{label}</Text>{children}</Box>;
}

function ConfirmDelete({ open, onOpenChange, title, onConfirm, loading }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; onConfirm: () => void; loading?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>Confirm Delete</Dialog.Title></Dialog.Header>
        <Dialog.Body><Text>{title}</Text></Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}

type CustomerFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  date_of_birth: string;
  communication_preference: "email" | "sms" | "phone" | "none";
  status: "active" | "inactive";
};

const emptyForm: CustomerFormState = {
  first_name: "", last_name: "", email: "", phone: "", address: "", date_of_birth: "",
  communication_preference: "email", status: "active",
};

export function CustomerFormDialog({ open, onOpenChange, customer }: { open: boolean; onOpenChange: (v: boolean) => void; customer?: Customer | null }) {
  const create = useCreateCustomer();
  const update = useUpdateCustomer();
  const [form, setForm] = useState<CustomerFormState>(emptyForm);
  const isEdit = !!customer?.id;

  useMemo(() => {
    setForm(customer ? {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address || "",
      date_of_birth: customer.date_of_birth || "",
      communication_preference: customer.communication_preference,
      status: customer.status,
    } : emptyForm);
  }, [customer, open]);

  const submit = async () => {
    const payload = {
      ...form,
      address: form.address.trim() || null,
      date_of_birth: form.date_of_birth || null,
    };
    try {
      if (isEdit) await update.mutateAsync({ id: customer!.id, payload });
      else await create.mutateAsync(payload);
      toaster.create({ title: isEdit ? "Customer updated" : "Customer created", type: "success" });
      onOpenChange(false);
    } catch (e: any) {
      toaster.create({ title: "Save failed", description: e?.message || "Request failed", type: "error" });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="lg" scrollBehavior="inside">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>{isEdit ? "Edit Customer" : "Create Customer"}</Dialog.Title></Dialog.Header>
        <Dialog.Body>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Field label="First name"><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></Field>
            <Field label="Last name"><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Date of birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></Field>
            <Field label="Communication preference">
              <NativeSelect.Root><NativeSelect.Field value={form.communication_preference} onChange={(e) => setForm({ ...form, communication_preference: e.target.value as CustomerFormState["communication_preference"] })}>
                <option value="email">Email</option><option value="sms">SMS</option><option value="phone">Phone</option><option value="none">None</option>
              </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Field>
            <Box gridColumn={{ md: "span 2" }}><Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field></Box>
            <Field label="Status">
              <NativeSelect.Root><NativeSelect.Field value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CustomerFormState["status"] })}>
                <option value="active">Active</option><option value="inactive">Inactive</option>
              </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Field>
          </Grid>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button colorPalette="brand" loading={create.isPending || update.isPending} onClick={submit}>{isEdit ? "Update" : "Create"}</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}

export default function CustomersPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const removeAllowed = canDelete(role);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const params = { page, page_size: pageSize, search: q || undefined, status: status || undefined };
  const { data, isLoading } = useCustomers(params);
  const del = useDeleteCustomer();
  const resendInvite = useResendCustomerPortalInvitation();
  const customers = data?.customers || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [toDelete, setToDelete] = useState<Customer | null>(null);

  const onDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toaster.create({ title: "Customer deleted", type: "success" });
      setToDelete(null);
    } catch (e: any) {
      toaster.create({ title: "Delete failed", description: e?.message, type: "error" });
    }
  };

  const onResend = async (c: Customer) => {
    try {
      const res = await resendInvite.mutateAsync(c.id);
      toaster.create({ title: "Invitation sent", description: res.data?.message, type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Failed to send invitation", description: e?.message, type: "error" });
    }
  };

  return (
    <Stack gap="6">
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="4" direction={{ base: "column", md: "row" }}>
        <Box>
          <Heading size="xl">Customers</Heading>
          <Text color="fg.muted">Manage customer profiles and contact details.</Text>
        </Box>
        {manage && <Button colorPalette="brand" onClick={() => { setEditing(null); setOpen(true); }}><LuPlus /> Customer</Button>}
      </Flex>

      <Card.Root><Card.Body><Stack gap="4">
        <Grid templateColumns={{ base: "1fr", md: "1fr 200px" }} gap="3">
          <HStack><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search name, email, or phone" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></HStack>
          <NativeSelect.Root><NativeSelect.Field value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
          </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
        </Grid>

        {isLoading ? <Stack>{[...Array(5)].map((_, i) => <Skeleton key={i} h="12" />)}</Stack> : (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header><Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Phone</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
              </Table.Row></Table.Header>
              <Table.Body>
                {customers.map((c) => (
                  <Table.Row key={c.id} cursor="pointer" _hover={{ bg: "bg.muted" }} onClick={() => navigate(`/customers/${c.id}`)}>
                    <Table.Cell><Text fontWeight="medium">{c.first_name} {c.last_name}</Text></Table.Cell>
                    <Table.Cell>{c.email}</Table.Cell>
                    <Table.Cell>{c.phone}</Table.Cell>
                    <Table.Cell><Badge colorPalette={c.status === "active" ? "green" : "gray"}>{c.status}</Badge></Table.Cell>
                    <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
                      {manage && <HStack justify="end">
                        {!c.has_portal_access && <IconButton aria-label="Resend portal invitation" size="xs" variant="ghost" loading={resendInvite.isPending} onClick={() => onResend(c)}><LuMail /></IconButton>}
                        <IconButton aria-label="Edit" size="xs" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><LuPencil /></IconButton>
                        {removeAllowed && <IconButton aria-label="Delete" size="xs" variant="ghost" colorPalette="red" onClick={() => setToDelete(c)}><LuTrash2 /></IconButton>}
                      </HStack>}
                    </Table.Cell>
                  </Table.Row>
                ))}
                {customers.length === 0 && <Table.Row><Table.Cell colSpan={5}><Text color="fg.muted">No customers found.</Text></Table.Cell></Table.Row>}
              </Table.Body>
            </Table.Root>
          </Box>
        )}

        <Flex justify="space-between" align="center">
          <Text fontSize="sm" color="fg.muted">{total} total</Text>
          <HStack>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>Prev</Button>
            <Text fontSize="sm">{page} / {totalPages}</Text>
            <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>Next</Button>
          </HStack>
        </Flex>
      </Stack></Card.Body></Card.Root>

      <CustomerFormDialog open={open} onOpenChange={setOpen} customer={editing} />
      <ConfirmDelete open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)} title={`Delete ${toDelete?.first_name || ""} ${toDelete?.last_name || "customer"}?`} onConfirm={onDelete} loading={del.isPending} />
    </Stack>
  );
}
