import { useState } from "react";
import { Badge, Box, Button, Card, Flex, Grid, Heading, HStack, IconButton, Image, Input, NativeSelect, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { formatNaira } from "@/components/ui/naira";
import { useDeleteStaff, useStaff, type Staff } from "@/features/staff";
import { StaffFormDialog } from "@/components/staff/StaffFormDialog";
import { Dialog, Portal } from "@chakra-ui/react";

const canManage = (role?: string) => ["owner", "admin", "manager"].includes((role || "").toLowerCase());
function statusColor(status: string) { return status === "active" ? "green" : status === "inactive" ? "gray" : status === "on_leave" ? "orange" : "red"; }
function statusLabel(status: string) { return status.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "); }

function ConfirmDialog({ open, onOpenChange, title, desc, onConfirm, loading }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; desc: string; onConfirm: () => void; loading?: boolean }) {
  return <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header><Dialog.Body><Text color="fg.muted">{desc}</Text></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function StaffPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [del, setDel] = useState<Staff | null>(null);
  const { data, isLoading } = useStaff({ page: 1, page_size: 100, status: status || undefined });
  const delMut = useDeleteStaff();
  const staff = data?.staff || [];
  const filtered = staff.filter((m) => { const q = search.toLowerCase().trim(); if (!q) return true; return `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q); });
  const onDelete = async () => { if (!del) return; try { await delMut.mutateAsync(del.id); toaster.create({ title: "Staff deleted", type: "success" }); setDel(null); } catch (e: any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); } };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base: "column", md: "row" }} align={{ md: "center" }}>
      <Box><Heading size="xl">Staff</Heading><Text color="fg.muted">Manage your salon staff members</Text></Box>
      {manage && <Button colorPalette="brand" onClick={() => { setEditing(null); setOpen(true); }}><LuPlus /> Add Staff Member</Button>}
    </Flex>
    <Grid templateColumns={{ base: "1fr", md: "1fr 220px" }} gap="3">
      <HStack><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} /></HStack>
      <NativeSelect.Root><NativeSelect.Field value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="on_leave">On Leave</option><option value="terminated">Terminated</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </Grid>
    <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)", xl: "repeat(3,1fr)" }} gap="4">
      {isLoading ? [...Array(6)].map((_, i) => <Card.Root key={i}><Card.Body><Stack gap="3"><Skeleton h="20" /><Skeleton h="5" /><Skeleton h="4" /></Stack></Card.Body></Card.Root>) : filtered.map((m) => (
        <Card.Root key={m.id} cursor="pointer" onClick={() => navigate(`/staff/${m.id}`)} _hover={{ shadow: "md" }}>
          {m.profile_image_url ? <Image src={m.profile_image_url} alt={`${m.firstName} ${m.lastName}`} h="180px" w="full" objectFit="cover" /> : <Flex h="180px" bg="bg.muted" align="center" justify="center" color="fg.muted"><Text fontWeight="bold" fontSize="3xl">{m.firstName?.[0]}{m.lastName?.[0]}</Text></Flex>}
          <Card.Body><Stack gap="3">
            <Flex justify="space-between" gap="2" align="start"><Box minW="0"><Heading size="sm" lineClamp="1">{m.firstName} {m.lastName}</Heading><Text fontSize="sm" color="fg.muted" lineClamp="1">{m.email}</Text></Box><Badge colorPalette={statusColor(m.status)}>{statusLabel(m.status)}</Badge></Flex>
            <Text fontSize="sm" color="fg.muted" lineClamp="2">{m.bio || "No bio provided."}</Text>
            <Flex justify="space-between" fontSize="sm"><Text color="fg.muted">Payment</Text><Text fontWeight="medium">{m.payment_type === "commission" ? `${Number(m.payment_rate)}%` : formatNaira(m.payment_rate)}</Text></Flex>
            <HStack justify="space-between"><Text fontSize="xs" color="fg.muted" lineClamp="1">{(m.specialties || []).slice(0, 2).join(", ") || "No specialties"}</Text>{manage && <HStack gap="1" onClick={(e) => e.stopPropagation()}><IconButton aria-label="Edit" size="xs" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }}><LuPencil /></IconButton><IconButton aria-label="Delete" size="xs" variant="ghost" colorPalette="red" onClick={() => setDel(m)}><LuTrash2 /></IconButton></HStack>}</HStack>
          </Stack></Card.Body>
        </Card.Root>
      ))}
    </Grid>
    {!isLoading && filtered.length === 0 && <Box textAlign="center" py="10" color="fg.muted">No staff members found</Box>}
    <StaffFormDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }} initial={editing} />
    <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} title="Delete Staff Member" desc={`Are you sure you want to delete ${del?.firstName || ""} ${del?.lastName || ""}?`} onConfirm={onDelete} loading={delMut.isPending} />
  </Stack>;
}
