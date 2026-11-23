import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, Portal, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft, LuMail, LuPencil, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useCustomer, useDeleteCustomer, useResendCustomerPortalInvitation } from "@/features/customers";
import { useState } from "react";
import { CustomerFormDialog } from "./CustomersPage";

function canManage(role?: string) { return ["owner", "admin", "manager", "staff"].includes((role || "").toLowerCase()); }
function canDelete(role?: string) { return ["owner", "admin", "manager"].includes((role || "").toLowerCase()); }

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const removeAllowed = canDelete(role);
  const { data: customer, isLoading } = useCustomer(id);
  const del = useDeleteCustomer();
  const resendInvite = useResendCustomerPortalInvitation();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (!customer) return <Card.Root><Card.Body><Text>Customer not found.</Text><Button mt="3" onClick={() => navigate("/customers")}>Back</Button></Card.Body></Card.Root>;

  const remove = async () => {
    try {
      await del.mutateAsync(customer.id);
      toaster.create({ title: "Customer deleted", type: "success" });
      navigate("/customers");
    } catch (e: any) {
      toaster.create({ title: "Delete failed", description: e?.message, type: "error" });
    }
  };

  const resend = async () => {
    try {
      const res = await resendInvite.mutateAsync(customer.id);
      toaster.create({ title: "Invitation sent", description: res.data?.message, type: "success" });
    } catch (e: any) {
      toaster.create({ title: "Failed to send invitation", description: e?.message, type: "error" });
    }
  };

  return (
    <Stack gap="6">
      <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
        <HStack>
          <Button variant="ghost" onClick={() => navigate("/customers")}><LuArrowLeft /> Back</Button>
          <Box>
            <Heading size="xl">{customer.first_name} {customer.last_name}</Heading>
            <Text color="fg.muted">{customer.email}</Text>
          </Box>
        </HStack>
        {manage && <HStack>
          {!customer.has_portal_access && <Button variant="outline" loading={resendInvite.isPending} onClick={resend}><LuMail /> Send Portal Invite</Button>}
          <Button variant="outline" onClick={() => setEditOpen(true)}><LuPencil /> Edit</Button>
          {removeAllowed && <Button colorPalette="red" variant="outline" onClick={() => setDeleteOpen(true)}><LuTrash2 /> Delete</Button>}
        </HStack>}
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
        <Card.Root><Card.Body><Heading size="md" mb="4">Contact</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Box><Text fontSize="xs" color="fg.muted">Email</Text><Text fontWeight="medium">{customer.email}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Phone</Text><Text fontWeight="medium">{customer.phone}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Address</Text><Text fontWeight="medium">{customer.address || "-"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Date of birth</Text><Text fontWeight="medium">{customer.date_of_birth || "-"}</Text></Box>
          </Grid>
        </Card.Body></Card.Root>

        <Stack gap="6">
          <Card.Root><Card.Body><Heading size="md" mb="4">Status</Heading><Stack gap="3">
            <Box><Text fontSize="xs" color="fg.muted">Status</Text><Badge colorPalette={customer.status === "active" ? "green" : "gray"}>{customer.status}</Badge></Box>
            <Box><Text fontSize="xs" color="fg.muted">Communication</Text><Text fontWeight="medium">{customer.communication_preference}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Guest</Text><Text fontWeight="medium">{customer.is_guest ? "Yes" : "No"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Outstanding balance</Text><Text fontWeight="medium">₦{Number(customer.outstanding_balance || 0).toLocaleString()}</Text></Box>
          </Stack></Card.Body></Card.Root>
        </Stack>
      </Grid>

      {/* Reuse form dialog by rendering inline simple version via stateful portal-less approach is avoided; quick edit uses list dialog pattern */}
      {editOpen && <InlineEdit customer={customer} onClose={() => setEditOpen(false)} />}

      <Dialog.Root open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)}>
        <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
          <Dialog.Header><Dialog.Title>Confirm Delete</Dialog.Title></Dialog.Header>
          <Dialog.Body><Text>Delete {customer.first_name} {customer.last_name}?</Text></Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button colorPalette="red" loading={del.isPending} onClick={remove}>Delete</Button>
          </Dialog.Footer>
        </Dialog.Content></Dialog.Positioner></Portal>
      </Dialog.Root>
    </Stack>
  );
}

function InlineEdit({ customer, onClose }: { customer: any; onClose: () => void }) {
  return <CustomerFormDialog open onOpenChange={(v) => !v && onClose()} customer={customer} />;
}
