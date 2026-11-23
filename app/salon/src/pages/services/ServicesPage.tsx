import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Field, Flex, Grid, Heading, HStack, IconButton, Image, Input, NativeSelect,
  Portal, SimpleGrid, Skeleton, Stack, Text, Textarea, VStack,
} from "@chakra-ui/react";
import { motion } from "motion/react";
import { LuImagePlus, LuPencil, LuPlus, LuSearch, LuTrash2, LuUsers, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import {
  useCreateService, useCreateServiceCategory, useDeleteService, useServiceCategories, useServices, useUpdateService,
  type Service, type ServiceCategory,
} from "@/features/services";
import { useImageUpload } from "@/hooks/useImageUpload";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const fmt = (v: any) => `₦${Number(v || 0).toLocaleString()}`;
const canManage = (role?: string) => ["owner","admin","manager"].includes((role||"").toLowerCase());
const ICONS = ["Scissors","Sparkles","Droplets","Brush","Heart","Star","Flower2","Hand","User","Crown"];
const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#6366F1","#F97316","#64748B"];

function ConfirmDialog({ open, onOpenChange, title, desc, onConfirm, loading }: any) {
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Text color="fg.muted">{desc}</Text></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function CategoryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v:boolean)=>void }) {
  const create = useCreateServiceCategory();
  const [form, setForm] = useState({ name: "", description: "", color: "#3B82F6", icon: "Scissors", is_active: true });
  useEffect(() => { if (open) setForm({ name: "", description: "", color: "#3B82F6", icon: "Scissors", is_active: true }); }, [open]);
  const submit = async () => {
    if (!form.name.trim()) { toaster.create({ title: "Category name is required", type: "error" }); return; }
    try { await create.mutateAsync(form as any); toaster.create({ title: "Category created", type: "success" }); onOpenChange(false); }
    catch (e: any) { toaster.create({ title: "Failed to create category", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>Add Service Category</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Field.Root><Field.Label>Category Name *</Field.Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Description</Field.Label><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field.Root>
      <Grid templateColumns="1fr 1fr" gap="4">
        <Field.Root><Field.Label>Color</Field.Label><HStack wrap="wrap">{COLORS.map(c => <Box key={c} as="button" {...({type:"button"} as any)} w="7" h="7" rounded="full" bg={c} borderWidth="2px" borderColor={form.color===c?"fg":"transparent"} onClick={()=>setForm({...form,color:c})} />)}</HStack></Field.Root>
        <Field.Root><Field.Label>Icon</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.icon} onChange={(e)=>setForm({...form,icon:e.target.value})}>{ICONS.map(i=><option key={i} value={i}>{i}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
    </Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="brand" loading={create.isPending} onClick={submit}>Create Category</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function ServiceFormModal({ open, onOpenChange, service, categories, staff }: { open:boolean; onOpenChange:(v:boolean)=>void; service?:Service|null; categories:ServiceCategory[]; staff:any[] }) {
  const create = useCreateService(); const update = useUpdateService();
  const upload = useImageUpload({ folder: "salon-services" });
  const isEdit = !!service?.id;
  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!open) return;
    upload.clearPreview();
    setForm(service ? {
      name: service.name, description: service.description || "", duration_minutes: service.duration_minutes, price: String(service.price),
      category: service.category || categories[0]?.name || "", color: service.color || "#3B82F6", icon: service.icon || "Scissors",
      public_image_url: service.public_image_url || "", public_description: service.public_description || "",
      is_active: service.is_active, is_published: service.is_published, allow_public_booking: service.allow_public_booking, allow_pay_now: service.allow_pay_now,
      tags: (service.tags||[]).join(", "), benefits: (service.benefits||[]).join(", "), commission_percentage: service.commission_percentage ?? "", staff_ids: service.staff_ids || [],
    } : { name:"", description:"", duration_minutes:30, price:"0", category:categories[0]?.name||"", color:"#3B82F6", icon:"Scissors", public_image_url:"", public_description:"", is_active:true, is_published:false, allow_public_booking:false, allow_pay_now:false, tags:"", benefits:"", commission_percentage:"", staff_ids:[] });
    if (service?.public_image_url) upload.setPreview(service.public_image_url);
  }, [open, service?.id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = upload.handleFileChange(e);
    if (!file) return;
    try { const url = await upload.uploadImage(file); setForm((p:any)=>({...p, public_image_url:url})); toaster.create({ title:"Image uploaded", type:"success" }); }
    catch (err:any) { toaster.create({ title:"Upload failed", description: err?.message, type:"error" }); }
  };
  const toggleStaff = (id: string) => setForm((p:any)=>({ ...p, staff_ids: p.staff_ids.includes(id) ? p.staff_ids.filter((x:string)=>x!==id) : [...p.staff_ids,id] }));
  const submit = async () => {
    if (!form.name?.trim() || !form.category) { toaster.create({ title:"Name and category are required", type:"error" }); return; }
    const payload = { ...form, duration_minutes:Number(form.duration_minutes), price:String(form.price), commission_percentage: form.commission_percentage===""?null:form.commission_percentage, tags:String(form.tags||"").split(",").map((s:string)=>s.trim()).filter(Boolean), benefits:String(form.benefits||"").split(",").map((s:string)=>s.trim()).filter(Boolean) };
    try {
      if (isEdit) await update.mutateAsync({ id: service!.id, payload });
      else await create.mutateAsync(payload);
      toaster.create({ title: isEdit ? "Service updated" : "Service created", type: "success" }); onOpenChange(false);
    } catch (e:any) { toaster.create({ title:"Save failed", description: e?.response?.data?.detail || e?.message, type:"error" }); }
  };

  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)} size="xl" scrollBehavior="inside"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{isEdit ? "Edit Service" : "Create Service"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Service Name *</Field.Label><Input value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Category *</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.category||""} onChange={(e)=>setForm({...form,category:e.target.value})}><option value="">Select category</option>{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Field.Root><Field.Label>Description</Field.Label><Textarea rows={3} value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Service Image</Field.Label>
        {upload.preview || form.public_image_url ? <Box position="relative" mb="2"><Image src={upload.preview || form.public_image_url} alt="preview" w="full" h="180px" objectFit="cover" rounded="md" /><IconButton aria-label="Remove image" position="absolute" top="2" right="2" size="sm" colorPalette="red" onClick={()=>{upload.clearPreview(); setForm({...form,public_image_url:""});}}><LuX /></IconButton></Box> : null}
        <Input type="file" accept="image/*" onChange={onFile} />
        {upload.isUploading && <Text fontSize="xs" color="fg.muted">Uploading {upload.uploadProgress}%</Text>}
      </Field.Root>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Duration (minutes)</Field.Label><Input type="number" min={5} step={5} value={form.duration_minutes} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Price (₦)</Field.Label><Input type="number" min={0} value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Color</Field.Label><HStack wrap="wrap">{COLORS.map(c=><Box key={c} as="button" {...({type:"button"} as any)} w="7" h="7" rounded="full" bg={c} borderWidth="2px" borderColor={form.color===c?"fg":"transparent"} onClick={()=>setForm({...form,color:c})} />)}</HStack></Field.Root>
        <Field.Root><Field.Label>Icon</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.icon||"Scissors"} onChange={(e)=>setForm({...form,icon:e.target.value})}>{ICONS.map(i=><option key={i} value={i}>{i}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Commission %</Field.Label><Input type="number" min={0} max={100} value={form.commission_percentage ?? ""} onChange={(e)=>setForm({...form,commission_percentage:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Public Description</Field.Label><Input value={form.public_description||""} onChange={(e)=>setForm({...form,public_description:e.target.value})} /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Tags (comma separated)</Field.Label><Input value={form.tags||""} onChange={(e)=>setForm({...form,tags:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Benefits (comma separated)</Field.Label><Input value={form.benefits||""} onChange={(e)=>setForm({...form,benefits:e.target.value})} /></Field.Root>
      </Grid>
      <Box><Text fontSize="sm" fontWeight="medium" mb="2">Assigned Staff</Text><Flex gap="2" wrap="wrap">{staff.map((s:any)=>{ const active=form.staff_ids?.includes(s.id); const name = [s.first_name,s.last_name].filter(Boolean).join(" ") || s.email || s.user_id; return <Button key={s.id} size="xs" variant={active?"solid":"outline"} colorPalette={active?"brand":"gray"} onClick={()=>toggleStaff(s.id)}>{name}</Button>; })}{staff.length===0 && <Text fontSize="sm" color="fg.muted">No staff members found.</Text>}</Flex></Box>
      <HStack gap="3" wrap="wrap">{[["is_active","Active"],["is_published","Published"],["allow_public_booking","Public booking"],["allow_pay_now","Pay now"]].map(([k,label])=> <Button key={k} size="sm" variant={form[k]?"solid":"outline"} colorPalette={form[k]?"green":"gray"} onClick={()=>setForm({...form,[k]:!form[k]})}>{label}</Button>)}</HStack>
    </Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="brand" loading={create.isPending||update.isPending||upload.isUploading} onClick={submit}>{isEdit?"Update Service":"Create Service"}</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showCategory, setShowCategory] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const [del, setDel] = useState<Service | null>(null);
  const { data, isLoading } = useServices({ page: 1, page_size: 100, search: search || undefined });
  const catsQ = useServiceCategories();
  const delSvc = useDeleteService();
  const staffQ = useQuery({ queryKey: ["staff","all"], queryFn: async () => (await apiClient.get("/staff")).data });
  const services = data?.services || [];
  const categories = catsQ.data?.categories || [];
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];

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
                <Box textAlign="right"><Text fontSize="xs" color="fg.muted">Price</Text><Text fontSize="sm" fontWeight="medium">{fmt(service.price)}</Text></Box>
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

    <ServiceFormModal open={showForm} onOpenChange={setShowForm} service={editing} categories={categories} staff={staff} />
    <CategoryModal open={showCategory} onOpenChange={setShowCategory} />
    {manage && <Button variant="ghost" size="sm" w="fit-content" onClick={()=>setShowCategory(true)}><LuPlus /> Add Category</Button>}
    <ConfirmDialog open={!!del} onOpenChange={(v:boolean)=>!v && setDel(null)} title="Delete Service" desc={`Are you sure you want to delete "${del?.name}"? This action cannot be undone.`} onConfirm={onDelete} loading={delSvc.isPending} />
  </Stack>;
}
