import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Box, Button, Card, Flex, Grid, Heading, HStack, Skeleton, Stack, Text } from "@chakra-ui/react";
import { LuArrowLeft, LuPencil, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useDeleteService, useService } from "@/features/services";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

function money(v: any) { const n = Number(v || 0); return `₦${n.toLocaleString()}`; }

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = ["owner","admin","manager"].includes((role||"").toLowerCase());
  const { data: service, isLoading } = useService(id);
  const del = useDeleteService();
  const staffQ = useQuery({ queryKey: ["staff","all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];
  const assigned = useMemo(() => staff.filter((s: any) => (service?.staff_ids || []).includes(s.id)), [staff, service?.staff_ids]);

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (!service) return <Card.Root><Card.Body><Text>Service not found.</Text><Button mt="3" onClick={() => navigate("/services")}>Back</Button></Card.Body></Card.Root>;

  const remove = async () => {
    if (!confirm(`Delete ${service.name}?`)) return;
    try { await del.mutateAsync(service.id); toaster.create({ title: "Service deactivated", type: "success" }); navigate("/services"); }
    catch (e: any) { toaster.create({ title: "Delete failed", description: e?.message, type: "error" }); }
  };

  return (
    <Stack gap="6">
      <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
        <HStack><Button variant="ghost" onClick={() => navigate("/services")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">{service.name}</Heading><Text color="fg.muted">{service.category}</Text></Box></HStack>
        {manage && <HStack><Button variant="outline" onClick={() => navigate(`/services?edit=${service.id}`)}><LuPencil /> Edit in list</Button><Button colorPalette="red" variant="outline" loading={del.isPending} onClick={remove}><LuTrash2 /> Delete</Button></HStack>}
      </Flex>

      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
        <Stack gap="6">
          {service.public_image_url && <Card.Root overflow="hidden"><img src={service.public_image_url} alt={service.name} style={{ width: "100%", maxHeight: 360, objectFit: "cover" }} /></Card.Root>}
          <Card.Root><Card.Body><Heading size="md" mb="3">Description</Heading><Text color="fg.muted">{service.description || "No description provided."}</Text></Card.Body></Card.Root>
          <Card.Root><Card.Body><Heading size="md" mb="4">Details</Heading>
            <Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4,1fr)" }} gap="4">
              <Box><Text fontSize="xs" color="fg.muted">Duration</Text><Text fontWeight="semibold">{service.duration_minutes} min</Text></Box>
              <Box><Text fontSize="xs" color="fg.muted">Price</Text><Text fontWeight="semibold">{money(service.price)}</Text></Box>
              <Box><Text fontSize="xs" color="fg.muted">Status</Text><Badge colorPalette={service.is_active ? "green" : "gray"}>{service.is_active ? "Active" : "Inactive"}</Badge></Box>
              <Box><Text fontSize="xs" color="fg.muted">Published</Text><Badge colorPalette={service.is_published ? "blue" : "gray"}>{service.is_published ? "Yes" : "No"}</Badge></Box>
            </Grid>
          </Card.Body></Card.Root>
        </Stack>
        <Stack gap="6">
          <Card.Root><Card.Body><Heading size="md" mb="4">Quick info</Heading><Stack gap="3">
            <Box><Text fontSize="xs" color="fg.muted">Public booking</Text><Text fontWeight="medium">{service.allow_public_booking ? "Allowed" : "Disabled"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Pay now</Text><Text fontWeight="medium">{service.allow_pay_now ? "Allowed" : "Disabled"}</Text></Box>
            <Box><Text fontSize="xs" color="fg.muted">Commission</Text><Text fontWeight="medium">{service.commission_percentage ?? "-"}%</Text></Box>
          </Stack></Card.Body></Card.Root>
          <Card.Root><Card.Body><Heading size="md" mb="3">Assigned staff</Heading><Stack gap="2">{assigned.map((s: any) => <Text key={s.id} fontSize="sm">{s.first_name} {s.last_name}</Text>)}{assigned.length===0 && <Text fontSize="sm" color="fg.muted">No staff assigned.</Text>}</Stack></Card.Body></Card.Root>
          <Card.Root><Card.Body><Heading size="md" mb="3">Tags</Heading><HStack gap="2" flexWrap="wrap">{(service.tags||[]).map(t => <Badge key={t}>{t}</Badge>)}{(!service.tags||service.tags.length===0) && <Text fontSize="sm" color="fg.muted">No tags.</Text>}</HStack></Card.Body></Card.Root>
        </Stack>
      </Grid>
    </Stack>
  );
}
