import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Flex, Grid, Heading, HStack, IconButton, Input, NativeSelect, Skeleton, Stack, Table, Text, useBreakpointValue,
} from "@chakra-ui/react";
import { LuChevronLeft, LuChevronRight, LuChevronsLeft, LuChevronsRight, LuPencil, LuPlus, LuSearch, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useCustomers, useDeleteCustomer, type Customer } from "@/features/customers";
import { CustomerFormDialog } from "./CustomerFormDialog";

function canManage(role?: string) { return ["owner", "admin", "manager", "staff"].includes((role || "").toLowerCase()); }
function canDelete(role?: string) { return ["owner", "admin", "manager"].includes((role || "").toLowerCase()); }

export default function CustomersPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const removeAllowed = canDelete(role);
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedTable, setExpandedTable] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const params = useMemo(() => ({
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page: currentPage,
    page_size: pageSize,
  }), [searchTerm, statusFilter, currentPage, pageSize]);

  const { data, isLoading, error, refetch } = useCustomers(params);
  const deleteMutation = useDeleteCustomer();

  const customers = data?.customers || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const onDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
      toaster.create({ title: "Customer deleted", description: "Customer has been deleted successfully.", type: "success" });
      setDeleteConfirm(null);
      refetch();
    } catch (e: any) {
      toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message || "Failed to delete customer", type: "error" });
    }
  };

  const pageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);
    if (start > 1) { pages.push(1); if (start > 2) pages.push("..."); }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) { if (end < totalPages - 1) pages.push("..."); pages.push(totalPages); }
    return pages;
  };

  const StatusBadges = ({ c }: { c: Customer }) => (
    <Stack gap="1" align="flex-start">
      <Badge colorPalette={c.status === "active" ? "green" : "gray"}>{c.status === "active" ? "Active" : "Inactive"}</Badge>
      {Number(c.outstanding_balance || 0) > 0 && <Badge colorPalette="red">Outstanding Balance</Badge>}
      {c.is_guest && <Badge colorPalette="blue">Guest</Badge>}
    </Stack>
  );

  const DeleteConfirmBox = ({ id }: { id: string }) => (
    <Box position="absolute" right="0" top="100%" mt="2" bg="bg.panel" borderWidth="1px" borderColor="border" rounded="md" shadow="lg" p="3" zIndex="10" w="220px">
      <Text fontSize="sm" fontWeight="medium" mb="3">Are you sure? This action cannot be undone.</Text>
      <HStack gap="2">
        <Button size="xs" variant="outline" flex="1" onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null); }}>Cancel</Button>
        <Button size="xs" colorPalette="red" flex="1" loading={deleteMutation.isPending} onClick={(e) => { e.stopPropagation(); onDelete(id); }}>Delete</Button>
      </HStack>
    </Box>
  );

  return (
    <Stack gap="6">
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="4" direction={{ base: "column", md: "row" }}>
        <Box>
          <Heading size="xl">Customers</Heading>
          <Text color="fg.muted">Manage your salon customers ({total} total)</Text>
        </Box>
        {manage && <Button colorPalette="brand" onClick={() => setCreateOpen(true)} w={{ base: "full", md: "auto" }}><LuPlus /> Add Customer</Button>}
      </Flex>

      {error && (
        <Card.Root borderColor="red.200" bg="red.50"><Card.Body py="3"><Text fontSize="sm" fontWeight="medium" color="red.700">Failed to load customers</Text><Text fontSize="xs" color="red.600">{(error as any)?.message || "Please try again"}</Text></Card.Body></Card.Root>
      )}

      <Grid templateColumns={{ base: "1fr", md: "1fr 220px" }} gap="3">
        <HStack><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search by name, email, or phone..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} /></HStack>
        <NativeSelect.Root><NativeSelect.Field value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
          <option value="all">All Statuses</option><option value="active">Active</option><option value="inactive">Inactive</option>
        </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      </Grid>

      <Card.Root overflow="hidden">
        {isMobile && (
          <Flex justify="space-between" align="center" p="3" borderBottomWidth="1px" bg="bg.muted">
            <Text fontSize="sm" fontWeight="medium">{expandedTable ? "Full Table View" : "Compact View"}</Text>
            <Button size="xs" variant="outline" onClick={() => setExpandedTable((v) => !v)}>{expandedTable ? "Collapse" : "Expand"}</Button>
          </Flex>
        )}

        {(!isMobile || expandedTable) ? (
          <Box overflowX="auto">
            <Table.Root size="sm">
              <Table.Header><Table.Row>
                <Table.ColumnHeader>Name</Table.ColumnHeader>
                <Table.ColumnHeader>Email</Table.ColumnHeader>
                <Table.ColumnHeader>Phone</Table.ColumnHeader>
                <Table.ColumnHeader>Status</Table.ColumnHeader>
                <Table.ColumnHeader>Created</Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
              </Table.Row></Table.Header>
              <Table.Body>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <Table.Row key={i}>{Array.from({ length: 6 }).map((__, j) => <Table.Cell key={j}><Skeleton h="4" /></Table.Cell>)}</Table.Row>
                )) : customers.length > 0 ? customers.map((c) => (
                  <Table.Row key={c.id} cursor="pointer" _hover={{ bg: "bg.muted" }} onClick={() => navigate(`/customers/${c.id}`)}>
                    <Table.Cell><Text fontWeight="medium">{c.first_name} {c.last_name}</Text></Table.Cell>
                    <Table.Cell><Text color="fg.muted">{c.email}</Text></Table.Cell>
                    <Table.Cell><Text color="fg.muted">{c.phone}</Text></Table.Cell>
                    <Table.Cell><StatusBadges c={c} /></Table.Cell>
                    <Table.Cell><Text color="fg.muted">{new Date(c.created_at).toLocaleDateString()}</Text></Table.Cell>
                    <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
                      {manage && <HStack justify="end" position="relative">
                        <IconButton aria-label="Edit" size="xs" variant="ghost" onClick={() => setEditCustomer(c)}><LuPencil /></IconButton>
                        {removeAllowed && <Box position="relative">
                          <IconButton aria-label="Delete" size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteConfirm(deleteConfirm === c.id ? null : c.id)}><LuTrash2 /></IconButton>
                          {deleteConfirm === c.id && <DeleteConfirmBox id={c.id} />}
                        </Box>}
                      </HStack>}
                    </Table.Cell>
                  </Table.Row>
                )) : (
                  <Table.Row><Table.Cell colSpan={6}><Text color="fg.muted" textAlign="center" py="6">No customers found</Text></Table.Cell></Table.Row>
                )}
              </Table.Body>
            </Table.Root>
          </Box>
        ) : (
          <Stack gap="3" p="4">
            {isLoading ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} h="24" rounded="md" />) : customers.length > 0 ? customers.map((c) => (
              <Box key={c.id} bg="bg.muted" rounded="md" p="4" cursor="pointer" onClick={() => navigate(`/customers/${c.id}`)}>
                <Flex justify="space-between" gap="3">
                  <Box minW="0" flex="1">
                    <Text fontWeight="semibold" truncate>{c.first_name} {c.last_name}</Text>
                    <Text fontSize="sm" color="fg.muted" truncate>{c.email}</Text>
                    <Text fontSize="sm" color="fg.muted">{c.phone}</Text>
                  </Box>
                  {manage && <HStack align="start" onClick={(e) => e.stopPropagation()}>
                    <IconButton aria-label="Edit" size="xs" variant="ghost" onClick={() => setEditCustomer(c)}><LuPencil /></IconButton>
                    {removeAllowed && <Box position="relative">
                      <IconButton aria-label="Delete" size="xs" variant="ghost" colorPalette="red" onClick={() => setDeleteConfirm(deleteConfirm === c.id ? null : c.id)}><LuTrash2 /></IconButton>
                      {deleteConfirm === c.id && <DeleteConfirmBox id={c.id} />}
                    </Box>}
                  </HStack>}
                </Flex>
                <Flex mt="3" pt="3" borderTopWidth="1px" justify="space-between" align="center" gap="2">
                  <StatusBadges c={c} />
                  <Text fontSize="xs" color="fg.muted">{new Date(c.created_at).toLocaleDateString()}</Text>
                </Flex>
              </Box>
            )) : <Text color="fg.muted" textAlign="center" py="6">No customers found</Text>}
          </Stack>
        )}
      </Card.Root>

      {!isLoading && customers.length > 0 && (
        <Card.Root><Card.Body>
          <Flex direction={{ base: "column", md: "row" }} justify="space-between" align={{ base: "stretch", md: "center" }} gap="4">
            <Text fontSize="sm" color="fg.muted">Showing <Text as="span" fontWeight="semibold" color="fg">{(currentPage - 1) * pageSize + 1}</Text> to <Text as="span" fontWeight="semibold" color="fg">{Math.min(currentPage * pageSize, total)}</Text> of <Text as="span" fontWeight="semibold" color="fg">{total}</Text> customers</Text>
            <HStack><Text fontSize="sm" color="fg.muted">Rows per page:</Text><NativeSelect.Root size="sm" w="90px"><NativeSelect.Field value={String(pageSize)} onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(1); }}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></HStack>
          </Flex>
          <Flex justify="center" align="center" gap="1" mt="4" wrap="wrap">
            <IconButton aria-label="First page" size="sm" variant="outline" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><LuChevronsLeft /></IconButton>
            <IconButton aria-label="Previous page" size="sm" variant="outline" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}><LuChevronLeft /></IconButton>
            {pageNumbers().map((p, i) => typeof p === "string" ? <Text key={`e-${i}`} px="2" color="fg.muted">...</Text> : <Button key={p} size="sm" variant={p === currentPage ? "solid" : "outline"} colorPalette={p === currentPage ? "brand" : "gray"} onClick={() => setCurrentPage(p)}>{p}</Button>)}
            <IconButton aria-label="Next page" size="sm" variant="outline" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}><LuChevronRight /></IconButton>
            <IconButton aria-label="Last page" size="sm" variant="outline" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}><LuChevronsRight /></IconButton>
          </Flex>
        </Card.Body></Card.Root>
      )}

      <CustomerFormDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={() => refetch()} />
      <CustomerFormDialog open={!!editCustomer} onOpenChange={(v) => !v && setEditCustomer(null)} customer={editCustomer} onSuccess={() => { setEditCustomer(null); refetch(); }} />
    </Stack>
  );
}
