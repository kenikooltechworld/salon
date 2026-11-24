import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Avatar, Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, Image, Portal, Skeleton, Stack, Text, VStack } from "@chakra-ui/react";
import { formatNaira } from "@/components/ui/naira";
import { LuArrowLeft, LuPencil, LuTrash2, LuUsers } from "react-icons/lu";
import { useQuery } from "@tanstack/react-query";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useDeleteService, useService, useServiceCategories } from "@/features/services";
import { apiClient } from "@/lib/api";
import { ServiceFormDialog } from "./ServiceFormDialog";
import { ImageLightbox } from "@/components/services/ImageLightbox";
import { getStaffDisplayName, getStaffImageUrl } from "@/features/staff";


export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = ["owner", "admin", "manager"].includes((role || "").toLowerCase());
  const { data: service, isLoading } = useService(id);
  const catsQ = useServiceCategories();
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff", { params: { page:1, page_size:200 } })).data });
  const staffData = staffQ.data as any; const staff = Array.isArray(staffData) ? staffData : (staffData?.staff || []);
  const del = useDeleteService();
  const [showEdit, setShowEdit] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const categories = catsQ.data?.categories || [];
  const assigned = useMemo(() => staff.filter((s: any) => (service?.staff_ids || []).includes(s.id)), [staff, service?.staff_ids]);

  useEffect(() => { if (!showEdit) { /* refetch handled by query invalidation */ } }, [showEdit]);

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (!service) return <Card.Root><Card.Body><Text>Service not found.</Text><Button mt="3" onClick={() => navigate("/services")}>Back</Button></Card.Body></Card.Root>;

  const remove = async () => {
    try { await del.mutateAsync(service.id); toaster.create({ title: "Service deactivated", type: "success" }); navigate("/services"); }
    catch (e: any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Stack gap="6">
    <Flex justify="space-between" gap="3" direction={{ base: "column", md: "row" }}>
      <HStack><Button variant="ghost" onClick={() => navigate("/services")}><LuArrowLeft /> Back</Button><Box><HStack gap="2"><Avatar.Root size="md"><Avatar.Image src={service.public_image_url || undefined} /><Avatar.Fallback name={service.name} /></Avatar.Root><Heading size="xl">{service.name}</Heading></HStack><Text color="fg.muted">{service.category}</Text></Box></HStack>
      {manage && <HStack><Button variant="outline" onClick={() => setShowEdit(true)}><LuPencil /> Edit</Button><Button colorPalette="red" variant="outline" onClick={() => setConfirmOpen(true)}><LuTrash2 /> Delete</Button></HStack>}
    </Flex>

    <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap="6">
      <Stack gap="6">
        {service.public_image_url ? <Card.Root overflow="hidden"><Image src={service.public_image_url} alt={service.name} w="full" maxH="360px" objectFit="cover" cursor="zoom-in" onClick={() => setLightbox(true)} /></Card.Root> : <Card.Root><Card.Body><Flex h="220px" bg="bg.muted" rounded="md" align="center" justify="center" color="fg.muted"><VStack><Text fontSize="lg">No image</Text></VStack></Flex></Card.Body></Card.Root>}
        <Card.Root><Card.Body><Heading size="md" mb="3">Description</Heading><Text color="fg.muted" whiteSpace="pre-wrap">{service.description || "No description provided."}</Text></Card.Body></Card.Root>
        <Card.Root><Card.Body><Heading size="md" mb="4">Details</Heading><Grid templateColumns={{ base: "1fr 1fr", md: "repeat(4,1fr)" }} gap="4">
          <Box><Text fontSize="xs" color="fg.muted">Duration</Text><Text fontWeight="semibold">{service.duration_minutes} min</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Price</Text><Text fontWeight="semibold">{formatNaira(service.price)}</Text></Box>
          <Box><Text fontSize="xs" color="fg.muted">Status</Text><Badge colorPalette={service.is_active ? "green" : "gray"}>{service.is_active ? "Active" : "Inactive"}</Badge></Box>
          <Box><Text fontSize="xs" color="fg.muted">Published</Text><Badge colorPalette={service.is_published ? "blue" : "gray"}>{service.is_published ? "Published" : "Hidden"}</Badge></Box>
        </Grid></Card.Body></Card.Root>
        {service.public_description && <Card.Root><Card.Body><Heading size="md" mb="3">Public Description</Heading><Text color="fg.muted">{service.public_description}</Text></Card.Body></Card.Root>}
      </Stack>
      <Stack gap="6">
        <Card.Root><Card.Body><Heading size="md" mb="4">Quick Info</Heading><Stack gap="3">
          <Flex justify="space-between"><Text fontSize="sm" color="fg.muted">Public booking</Text><Badge colorPalette={service.allow_public_booking ? "green" : "gray"}>{service.allow_public_booking ? "Allowed" : "Disabled"}</Badge></Flex>
          <Flex justify="space-between"><Text fontSize="sm" color="fg.muted">Pay now</Text><Badge colorPalette={service.allow_pay_now ? "green" : "gray"}>{service.allow_pay_now ? "Allowed" : "Disabled"}</Badge></Flex>
          <Flex justify="space-between"><Text fontSize="sm" color="fg.muted">Commission</Text><Text fontWeight="medium">{service.commission_percentage ?? 0}%</Text></Flex>
          <Flex justify="space-between"><Text fontSize="sm" color="fg.muted">Category</Text><Text fontWeight="medium">{service.category}</Text></Flex>
        </Stack></Card.Body></Card.Root>
        <Card.Root><Card.Body><HStack mb="3"><LuUsers /><Heading size="md">Assigned Staff ({assigned.length})</Heading></HStack><Stack gap="2">{assigned.map((s: any) => <Flex key={s.id} justify="space-between" align="center" gap="3" fontSize="sm"><HStack minW="0"><Avatar.Root size="sm"><Avatar.Image src={getStaffImageUrl(s)} /><Avatar.Fallback name={getStaffDisplayName(s)} /></Avatar.Root><Text fontWeight="medium" lineClamp="1">{getStaffDisplayName(s)}</Text></HStack><Text color="fg.muted">{s.title || s.role || ""}</Text></Flex>)}{assigned.length === 0 && <Text fontSize="sm" color="fg.muted">No staff assigned.</Text>}</Stack></Card.Body></Card.Root>
        <Card.Root><Card.Body><Heading size="md" mb="3">Tags</Heading><HStack gap="2" flexWrap="wrap">{(service.tags || []).map((t) => <Badge key={t}>{t}</Badge>)}{(!service.tags || service.tags.length === 0) && <Text fontSize="sm" color="fg.muted">No tags.</Text>}</HStack></Card.Body></Card.Root>
        <Card.Root><Card.Body><Heading size="md" mb="3">Benefits</Heading><Stack gap="1">{(service.benefits || []).map((b) => <Text key={b} fontSize="sm" color="fg.muted">• {b}</Text>)}{(!service.benefits || service.benefits.length === 0) && <Text fontSize="sm" color="fg.muted">No benefits.</Text>}</Stack></Card.Body></Card.Root>
      </Stack>
    </Grid>

    <ServiceFormDialog open={showEdit} onOpenChange={setShowEdit} service={service} categories={categories} staff={staff} />

    <Dialog.Root open={confirmOpen} onOpenChange={(e) => setConfirmOpen(e.open)}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>Delete service</Dialog.Title></Dialog.Header>
        <Dialog.Body><Text>Delete <b>{service.name}</b>? This will deactivate the service.</Text></Dialog.Body>
        <Dialog.Footer><Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button><Button colorPalette="red" loading={del.isPending} onClick={remove}>Delete</Button></Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>

    {service.public_image_url && <ImageLightbox isOpen={lightbox} imageUrl={service.public_image_url} alt={service.name} onClose={() => setLightbox(false)} />}
  </Stack>;
}
