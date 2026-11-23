import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Field, Flex, Grid, Heading, HStack, IconButton, Image, Input, NativeSelect,
  Portal, SimpleGrid, Skeleton, Stack, Text, Textarea, VStack,
} from "@chakra-ui/react";
import { LuArrowLeft, LuImagePlus, LuPencil, LuPlus, LuSearch, LuTrash2, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useCreateServiceAddon, useDeleteServiceAddon, useServiceAddons, useServices, useUpdateServiceAddon, type ServiceAddon } from "@/features/services";
import { useImageUpload } from "@/hooks/useImageUpload";

const fmt = (v: any) => `₦${Number(v || 0).toLocaleString()}`;
const canManage = (role?: string) => ["owner","admin","manager"].includes((role||"").toLowerCase());

function ConfirmDialog({ open, onOpenChange, title, desc, onConfirm, loading }: any) {
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header><Dialog.Body><Text color="fg.muted">{desc}</Text></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function AddonForm({ open, onOpenChange, addon }: { open:boolean; onOpenChange:(v:boolean)=>void; addon?:ServiceAddon|null }) {
  const create = useCreateServiceAddon(); const update = useUpdateServiceAddon();
  const servicesQ = useServices({ page:1, page_size:200, active_only:true });
  const upload = useImageUpload({ folder: "salon-addons" });
  const isEdit = !!addon?.id;
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (!open) return; upload.clearPreview(); setForm(addon ? {
    name: addon.name, description: addon.description||"", price: String(addon.price), duration_minutes: addon.duration_minutes, image_url: addon.image_url||"", is_active: addon.is_active, category: addon.category||"product", display_order: addon.display_order||0, applicable_service_ids: addon.applicable_service_ids||addon.applicable_services||[],
  } : { name:"", description:"", price:"0", duration_minutes:15, image_url:"", is_active:true, category:"product", display_order:0, applicable_service_ids:[] }); if (addon?.image_url) upload.setPreview(addon.image_url); }, [open, addon?.id]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = upload.handleFileChange(e); if (!file) return; try { const url = await upload.uploadImage(file); setForm((p:any)=>({...p, image_url:url})); } catch(err:any){ toaster.create({ title:"Upload failed", description:err?.message, type:"error" }); } };
  const toggleService = (id:string) => setForm((p:any)=>({ ...p, applicable_service_ids: p.applicable_service_ids.includes(id) ? p.applicable_service_ids.filter((x:string)=>x!==id) : [...p.applicable_service_ids,id] }));
  const submit = async () => {
    if (!form.name?.trim()) { toaster.create({ title:"Name is required", type:"error" }); return; }
    const payload = { ...form, price:String(form.price), duration_minutes:Number(form.duration_minutes), display_order:Number(form.display_order||0) };
    try { if (isEdit) await update.mutateAsync({ id: addon!.id, payload }); else await create.mutateAsync(payload); toaster.create({ title: isEdit?"Add-on updated":"Add-on created", type:"success" }); onOpenChange(false); }
    catch(e:any){ toaster.create({ title:"Save failed", description:e?.response?.data?.detail||e?.message, type:"error" }); }
  };
  const services = servicesQ.data?.services || [];
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)} size="xl" scrollBehavior="inside"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{isEdit?"Edit Add-on":"Create Add-on"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Name *</Field.Label><Input value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Category</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.category||"product"} onChange={(e)=>setForm({...form,category:e.target.value})}><option value="product">Product</option><option value="upgrade">Upgrade</option><option value="treatment">Treatment</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Field.Root><Field.Label>Description</Field.Label><Textarea rows={3} value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Image</Field.Label>{upload.preview || form.image_url ? <Box position="relative" mb="2"><Image src={upload.preview||form.image_url} alt="preview" w="full" h="160px" objectFit="cover" rounded="md" /><IconButton aria-label="Remove image" position="absolute" top="2" right="2" size="sm" colorPalette="red" onClick={()=>{upload.clearPreview(); setForm({...form,image_url:""});}}><LuX /></IconButton></Box> : null}<Input type="file" accept="image/*" onChange={onFile} /></Field.Root>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Price (₦)</Field.Label><Input type="number" min={0} value={form.price} onChange={(e)=>setForm({...form,price:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Duration (min)</Field.Label><Input type="number" min={0} step={5} value={form.duration_minutes} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Display order</Field.Label><Input type="number" value={form.display_order} onChange={(e)=>setForm({...form,display_order:e.target.value})} /></Field.Root>
      </Grid>
      <Box><Text fontSize="sm" fontWeight="medium" mb="2">Applicable Services</Text><Flex gap="2" wrap="wrap">{services.map(s => { const active=form.applicable_service_ids?.includes(s.id); return <Button key={s.id} size="xs" variant={active?"solid":"outline"} colorPalette={active?"brand":"gray"} onClick={()=>toggleService(s.id)}>{s.name}</Button>; })}</Flex></Box>
      <Button size="sm" w="fit-content" variant={form.is_active?"solid":"outline"} colorPalette={form.is_active?"green":"gray"} onClick={()=>setForm({...form,is_active:!form.is_active})}>{form.is_active?"Active":"Inactive"}</Button>
    </Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="brand" loading={create.isPending||update.isPending||upload.isUploading} onClick={submit}>{isEdit?"Update":"Create"}</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function ServiceAddonsPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [search, setSearch] = useState(""); const [category, setCategory] = useState(""); const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<ServiceAddon|null>(null); const [del, setDel] = useState<ServiceAddon|null>(null);
  const q = { search: search||undefined, category: category||undefined, is_active: status==="all"?undefined:status==="active" };
  const { data, isLoading } = useServiceAddons(q);
  const delM = useDeleteServiceAddon();
  const addons = data?.addons || [];
  const filtered = useMemo(() => addons, [addons]);
  const onDelete = async () => { if (!del) return; try { await delM.mutateAsync(del.id); toaster.create({ title:"Add-on deleted", type:"success" }); setDel(null); } catch(e:any){ toaster.create({ title:"Delete failed", description:e?.response?.data?.detail||e?.message, type:"error" }); } };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base:"column", md:"row" }} align={{ md:"center" }}>
      <HStack><Button variant="ghost" onClick={()=>navigate("/services")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Service Add-ons</Heading><Text color="fg.muted">Manage additional services and products</Text></Box></HStack>
      {manage && <Button colorPalette="brand" onClick={()=>{setEditing(null); setShowForm(true);}}><LuPlus /> Add Service Add-on</Button>}
    </Flex>
    <Flex gap="3" direction={{ base:"column", md:"row" }}>
      <HStack flex="1"><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search add-ons..." value={search} onChange={(e)=>setSearch(e.target.value)} /></HStack>
      <NativeSelect.Root maxW={{ md:"220px" }}><NativeSelect.Field value={category} onChange={(e)=>setCategory(e.target.value)}><option value="">All Categories</option><option value="product">Product</option><option value="upgrade">Upgrade</option><option value="treatment">Treatment</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
      <NativeSelect.Root maxW={{ md:"180px" }}><NativeSelect.Field value={status} onChange={(e)=>setStatus(e.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
    </Flex>
    <SimpleGrid columns={{ base:1, sm:2, lg:3 }} gap="4">
      {isLoading ? [...Array(6)].map((_,i)=><Card.Root key={i}><Skeleton h="128px" /><Card.Body><Stack gap="3"><Skeleton h="5" /><Skeleton h="12" /><Skeleton h="8" /></Stack></Card.Body></Card.Root>)
      : filtered.map(addon => <Card.Root key={addon.id} overflow="hidden" opacity={addon.is_active?1:0.6}>
        {addon.image_url ? <Image src={addon.image_url} alt={addon.name} h="128px" w="full" objectFit="cover" /> : <Flex h="128px" bg="bg.muted" align="center" justify="center" color="fg.muted"><VStack gap="1"><LuImagePlus /><Text fontSize="sm">No image</Text></VStack></Flex>}
        <Card.Body><Stack gap="3">
          <Flex justify="space-between" gap="2"><Box><HStack><Heading size="sm">{addon.name}</Heading>{!addon.is_active && <Badge>Inactive</Badge>}</HStack><Badge mt="1" colorPalette={addon.category==="product"?"blue":addon.category==="upgrade"?"purple":"green"}>{addon.category}</Badge></Box>
            {manage && <HStack gap="1"><IconButton aria-label="Edit add-on" size="xs" variant="ghost" onClick={()=>{setEditing(addon); setShowForm(true);}}><LuPencil /></IconButton><IconButton aria-label="Delete add-on" size="xs" variant="ghost" colorPalette="red" onClick={()=>setDel(addon)}><LuTrash2 /></IconButton></HStack>}
          </Flex>
          <Text fontSize="sm" color="fg.muted" lineClamp="2">{addon.description}</Text>
          <Flex justify="space-between" pt="2" borderTopWidth="1px"><Box><Text fontSize="xs" color="fg.muted">Duration</Text><Text fontSize="sm" fontWeight="medium">+{addon.duration_minutes} min</Text></Box><Box textAlign="right"><Text fontSize="xs" color="fg.muted">Price</Text><Text fontSize="sm" fontWeight="medium">{fmt(addon.price)}</Text></Box></Flex>
        </Stack></Card.Body>
      </Card.Root>)}
    </SimpleGrid>
    {!isLoading && filtered.length===0 && <Box textAlign="center" py="10" color="fg.muted">No service add-ons found.</Box>}
    <AddonForm open={showForm} onOpenChange={setShowForm} addon={editing} />
    <ConfirmDialog open={!!del} onOpenChange={(v:boolean)=>!v && setDel(null)} title="Delete Add-on" desc={`Delete "${del?.name}"?`} onConfirm={onDelete} loading={delM.isPending} />
  </Stack>;
}
