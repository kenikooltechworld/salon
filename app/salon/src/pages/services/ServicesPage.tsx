import { formatNaira } from "@/components/ui/naira";
﻿import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Flex, Heading, HStack, IconButton, Image, Input,
  Portal, SimpleGrid, Skeleton, Stack, Text, VStack,
} from "@chakra-ui/react";
import { motion } from "motion/react";
import { LuImagePlus, LuPencil, LuPlus, LuSearch, LuTrash2, LuUsers } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { CategoryModal, ServiceFormDialog } from "./ServiceFormDialog";
import {
  useDeleteService, useDeleteServiceCategory, useServiceCategories, useServices,
  type Service, type ServiceCategory,
} from "@/features/services";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const canManage = (role?: string) => ["owner","admin","manager"].includes((role||"").toLowerCase());

function ConfirmDialog({ open, onOpenChange, title, desc, onConfirm, loading }: any) {
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Text color="fg.muted">{desc}</Text></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [del, setDel] = useState<Service | null>(null);
  const [delCat, setDelCatState] = useState<ServiceCategory | null>(null);
  const { data, isLoading } = useServices({ page: 1, page_size: 100, search: search || undefined });
  const catsQ = useServiceCategories();
  const delSvc = useDeleteService();
  const delCatMut = useDeleteServiceCategory();
  const staffQ = useQuery({ queryKey: ["staff","all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const services = data?.services || [];
  const categories = catsQ.data?.categories || [];
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || services.length === 0) return;
    const s = services.find((x) => x.id === editId);
    if (s) { setEditing(s); setShowForm(true); setSearchParams({}, { replace: true }); }
  }, [searchParams, services, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return services;
    return services.filter((s) => s.name.toLowerCase().includes(q) || (s.category||"").toLowerCase().includes(q));
  }, [services, search]);

  const onDelete = async () => {
    if (!del) return;
    try { await delSvc.mutateAsync(del.id); toaster.create({ title: "Service deleted", type: "success" }); setDel(null); }
    catch (e:any) { toaster.create({ title: "Delete failed", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base:"column", md:"row" }} align={{ md:"center" }}>
      <Box><Heading size="xl">Services</Heading><Text color="fg.muted">Manage your salon services and add-ons</Text></Box>
      {manage && <HStack gap="2" wrap="wrap"><Button variant="outline" onClick={()=>navigate("/services/addons")}>Manage Add-ons</Button><Button variant="outline" onClick={()=>navigate("/services/packages")}>Packages</Button><Button variant="outline" onClick={()=>navigate("/services/commissions")}>Commissions</Button><Button colorPalette="brand" onClick={()=>{setEditing(null); setShowForm(true);}}><LuPlus /> Add Service</Button></HStack>}
    </Flex>

    <HStack><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search services..." value={search} onChange={(e)=>setSearch(e.target.value)} /></HStack>

    <SimpleGrid columns={{ base:1, sm:2, lg:3 }} gap="4">
      {isLoading ? [...Array(6)].map((_,i)=><Card.Root key={i} overflow="hidden"><Skeleton h="160px" /><Card.Body><Stack gap="3"><Skeleton h="5" w="70%" /><Skeleton h="4" w="40%" /><Skeleton h="12" /><Skeleton h="8" /></Stack></Card.Body></Card.Root>)
      : filtered.map((service) => (
        <motion.div key={service.id} whileHover={{ y: -2 }}>
          <Card.Root overflow="hidden" cursor="pointer" onClick={()=>navigate(`/services/${service.id}`)} _hover={{ shadow:"md" }}>
            {service.public_image_url ? <Image src={service.public_image_url} alt={service.name} h="160px" w="full" objectFit="cover" /> : <Flex h="160px" bg="bg.muted" align="center" justify="center" color="fg.muted"><VStack gap="2"><LuImagePlus size={28} /><Text fontSize="sm">No image</Text></VStack></Flex>}
            <Card.Body><Stack gap="3">
              <Flex justify="space-between" gap="3" align="start">
                <Box minW="0"><Heading size="sm" lineClamp="1">{service.name}</Heading><Text fontSize="xs" color="fg.muted">{service.category}</Text></Box>
                {manage && <HStack gap="1" onClick={(e)=>e.stopPropagation()}>
                  <IconButton aria-label="Edit service" size="xs" variant="ghost" onClick={()=>{setEditing(service); setShowForm(true);}}><LuPencil /></IconButton>
                  <IconButton aria-label="Delete service" size="xs" variant="ghost" colorPalette="red" onClick={()=>setDel(service)}><LuTrash2 /></IconButton>
                </HStack>}
              </Flex>
              <Text fontSize="sm" color="fg.muted" lineClamp="2">{service.description || "No description"}</Text>
              <Flex justify="space-between" pt="2" borderTopWidth="1px">
                <Box><Text fontSize="xs" color="fg.muted">Duration</Text><Text fontSize="sm" fontWeight="medium">{service.duration_minutes} min</Text></Box>
                <Box textAlign="right"><Text fontSize="xs" color="fg.muted">Price</Text><Text fontSize="sm" fontWeight="medium">{formatNaira(service.price)}</Text></Box>
              </Flex>
              <HStack justify="space-between">
                <HStack gap="1" color="fg.muted" fontSize="xs"><LuUsers /><Text>{service.staff_ids?.length || 0} staff assigned</Text></HStack>
                <HStack gap="1">{!service.is_active && <Badge colorPalette="gray">Inactive</Badge>}{service.is_published && <Badge colorPalette="green">Published</Badge>}</HStack>
              </HStack>
            </Stack></Card.Body>
          </Card.Root>
        </motion.div>
      ))}
    </SimpleGrid>
    {!isLoading && filtered.length===0 && <Box textAlign="center" py="10" color="fg.muted">No services found</Box>}

    <ServiceFormDialog open={showForm} onOpenChange={setShowForm} service={editing} categories={categories} staff={staff} />
    <CategoryModal open={showCategory} onOpenChange={(v)=>{setShowCategory(v); if(!v) setEditingCategory(null);}} category={editingCategory} />
    {manage && <Card.Root><Card.Body><Flex justify="space-between" align="center" mb="3"><Heading size="sm">Categories</Heading><Button size="sm" variant="outline" onClick={()=>{setEditingCategory(null); setShowCategory(true);}}><LuPlus /> Add Category</Button></Flex><Flex gap="2" wrap="wrap">{categories.map(c => <HStack key={c.id} borderWidth="1px" rounded="md" px="3" py="2" gap="2"><Box w="3" h="3" rounded="full" bg={c.color||"gray.400"} /><Text fontSize="sm">{c.name}</Text>{!c.is_active && <Badge size="sm">Inactive</Badge>}<IconButton aria-label="Edit category" size="xs" variant="ghost" onClick={()=>{setEditingCategory(c); setShowCategory(true);}}><LuPencil /></IconButton><IconButton aria-label="Delete category" size="xs" variant="ghost" colorPalette="red" onClick={()=>setDelCatState(c)}><LuTrash2 /></IconButton></HStack>)}{categories.length===0 && <Text fontSize="sm" color="fg.muted">No categories.</Text>}</Flex></Card.Body></Card.Root>}
    <ConfirmDialog open={!!del} onOpenChange={(v:boolean)=>!v && setDel(null)} title="Delete Service" desc={`Are you sure you want to delete "${del?.name}"? This action cannot be undone.`} onConfirm={onDelete} loading={delSvc.isPending} />
    <ConfirmDialog open={!!delCat} onOpenChange={(v:boolean)=>!v && setDelCatState(null)} title="Delete Category" desc={`Delete category "${delCat?.name}"?`} onConfirm={async()=>{ if(!delCat) return; try { await delCatMut.mutateAsync(delCat.id); toaster.create({title:"Category deleted", type:"success"}); setDelCatState(null);} catch(e:any){ toaster.create({title:"Delete failed", description:e?.response?.data?.detail||e?.message, type:"error"}); } }} loading={delCatMut.isPending} />
  </Stack>;
}
