import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Button, Card, Dialog, Field, Flex, Grid, Heading, HStack, IconButton, Image, Input, NativeSelect, Portal, SimpleGrid, Skeleton, Stack, Switch, Text, Textarea } from "@chakra-ui/react";
import { LuArrowLeft, LuEye, LuEyeOff, LuImagePlus, LuPencil, LuPlus, LuStar, LuTrash2, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import { useCreateServicePackage, useDeleteServicePackage, useServicePackages, useServices, useTogglePackageActive, useTogglePackageFeatured, useUpdateServicePackage, type ServicePackage } from "@/features/services";
import { useImageUpload } from "@/hooks/useImageUpload";

const fmt = (v:any) => `₦${Number(v||0).toLocaleString()}`;
const canManage = (role?: string) => ["owner","admin","manager"].includes((role||"").toLowerCase());

function Confirm({ open, onOpenChange, onConfirm, loading, title, desc }: any) {
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{title}</Dialog.Title></Dialog.Header><Dialog.Body><Text color="fg.muted">{desc}</Text></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function PackageForm({ open, onOpenChange, pkg }: { open:boolean; onOpenChange:(v:boolean)=>void; pkg?:ServicePackage|null }) {
  const create = useCreateServicePackage(); const update = useUpdateServicePackage();
  const servicesQ = useServices({ page:1, page_size:200, active_only:true });
  const upload = useImageUpload({ folder: "salon-packages" });
  const isEdit = !!pkg?.id;
  const [form, setForm] = useState<any>({});
  useEffect(() => { if (!open) return; upload.clearPreview(); setForm(pkg ? {
    name: pkg.name, description: pkg.description||"", package_price: String(pkg.package_price), valid_from: pkg.valid_from?.slice(0,10)||"", valid_until: pkg.valid_until?.slice(0,10)||"", is_active: pkg.is_active, is_featured: pkg.is_featured, max_bookings_per_customer: pkg.max_bookings_per_customer ?? "", total_bookings_limit: pkg.total_bookings_limit ?? "", image_url: pkg.image_url||"", display_order: pkg.display_order||0,
    services: (pkg.services||[]).map((s:any)=>({ service_id: s.service_id, quantity: s.quantity||1 })),
  } : { name:"", description:"", package_price:"0", valid_from:"", valid_until:"", is_active:true, is_featured:false, max_bookings_per_customer:"", total_bookings_limit:"", image_url:"", display_order:0, services:[] }); if (pkg?.image_url) upload.setPreview(pkg.image_url); }, [open, pkg?.id]);

  const services = servicesQ.data?.services || [];
  const addService = (serviceId:string) => { if (!serviceId || form.services?.some((s:any)=>s.service_id===serviceId)) return; setForm((p:any)=>({...p, services:[...p.services, {service_id:serviceId, quantity:1}]})); };
  const updateQty = (serviceId:string, qty:number) => setForm((p:any)=>({...p, services:p.services.map((s:any)=>s.service_id===serviceId?{...s, quantity:Math.max(1,qty)}:s)}));
  const removeService = (serviceId:string) => setForm((p:any)=>({...p, services:p.services.filter((s:any)=>s.service_id!==serviceId)}));
  const original = (form.services||[]).reduce((sum:number, item:any) => { const svc = services.find(s=>s.id===item.service_id); return sum + Number(svc?.price||0)*Number(item.quantity||1); }, 0);
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => { const file = upload.handleFileChange(e); if (!file) return; try { const url = await upload.uploadImage(file); setForm((p:any)=>({...p,image_url:url})); } catch(err:any){ toaster.create({ title:"Upload failed", description:err?.message, type:"error" }); } };
  const submit = async () => {
    if (!form.name?.trim()) { toaster.create({ title:"Name is required", type:"error" }); return; }
    if ((form.services||[]).length < 2) { toaster.create({ title:"Add at least two services", type:"error" }); return; }
    const payload = { ...form, package_price: Number(form.package_price||0), display_order:Number(form.display_order||0), max_bookings_per_customer: form.max_bookings_per_customer===""?null:Number(form.max_bookings_per_customer), total_bookings_limit: form.total_bookings_limit===""?null:Number(form.total_bookings_limit), valid_from: form.valid_from||null, valid_until: form.valid_until||null };
    try { if (isEdit) await update.mutateAsync({ id: pkg!.id, payload }); else await create.mutateAsync(payload); toaster.create({ title: isEdit?"Package updated":"Package created", type:"success" }); onOpenChange(false); }
    catch(e:any){ toaster.create({ title:"Save failed", description:e?.response?.data?.detail||e?.message, type:"error" }); }
  };

  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)} size="xl" scrollBehavior="inside"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{isEdit?"Edit Package":"Create Package"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Field.Root><Field.Label>Name *</Field.Label><Input value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Description</Field.Label><Textarea rows={3} value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Image</Field.Label>{upload.preview||form.image_url ? <Box position="relative" mb="2"><Image src={upload.preview||form.image_url} alt="preview" w="full" h="160px" objectFit="cover" rounded="md" /><IconButton aria-label="Remove image" position="absolute" top="2" right="2" size="sm" colorPalette="red" onClick={()=>{upload.clearPreview(); setForm({...form,image_url:""});}}><LuX /></IconButton></Box>:null}<Input type="file" accept="image/*" onChange={onFile} /></Field.Root>
      <Box><Text fontSize="sm" fontWeight="medium" mb="2">Services</Text>
        <NativeSelect.Root mb="2"><NativeSelect.Field defaultValue="" onChange={(e)=>{addService(e.target.value); e.target.value="";}}><option value="">Add a service...</option>{services.filter(s=>!(form.services||[]).some((x:any)=>x.service_id===s.id)).map(s=><option key={s.id} value={s.id}>{s.name} - {fmt(s.price)}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
        <Stack gap="2">{(form.services||[]).map((item:any)=>{ const svc=services.find(s=>s.id===item.service_id); return <Flex key={item.service_id} gap="2" align="center" borderWidth="1px" rounded="md" p="2"><Box flex="1"><Text fontSize="sm" fontWeight="medium">{svc?.name||item.service_id}</Text><Text fontSize="xs" color="fg.muted">{fmt(svc?.price)} each</Text></Box><Input w="80px" type="number" min={1} value={item.quantity} onChange={(e)=>updateQty(item.service_id, Number(e.target.value))} /><IconButton aria-label="Remove service" size="sm" variant="ghost" colorPalette="red" onClick={()=>removeService(item.service_id)}><LuX /></IconButton></Flex>; })}</Stack>
      </Box>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Original Price</Field.Label><Input value={fmt(original)} readOnly /></Field.Root>
        <Field.Root><Field.Label>Package Price (₦)</Field.Label><Input type="number" min={0} value={form.package_price} onChange={(e)=>setForm({...form,package_price:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Savings</Field.Label><Input value={fmt(Math.max(0, original - Number(form.package_price||0)))} readOnly /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Valid from</Field.Label><Input type="date" value={form.valid_from||""} onChange={(e)=>setForm({...form,valid_from:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Valid until</Field.Label><Input type="date" value={form.valid_until||""} onChange={(e)=>setForm({...form,valid_until:e.target.value})} /></Field.Root>
      </Grid>
      <Grid templateColumns={{ base:"1fr", md:"1fr 1fr 1fr" }} gap="4">
        <Field.Root><Field.Label>Max per customer</Field.Label><Input type="number" min={0} value={form.max_bookings_per_customer} onChange={(e)=>setForm({...form,max_bookings_per_customer:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Total booking limit</Field.Label><Input type="number" min={0} value={form.total_bookings_limit} onChange={(e)=>setForm({...form,total_bookings_limit:e.target.value})} /></Field.Root>
        <Field.Root><Field.Label>Display order</Field.Label><Input type="number" value={form.display_order} onChange={(e)=>setForm({...form,display_order:e.target.value})} /></Field.Root>
      </Grid>
      <HStack gap="6"><HStack><Switch.Root checked={!!form.is_active} onCheckedChange={(e)=>setForm({...form,is_active:e.checked})}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root><Text fontSize="sm">Active</Text></HStack><HStack><Switch.Root checked={!!form.is_featured} onCheckedChange={(e)=>setForm({...form,is_featured:e.checked})}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root><Text fontSize="sm">Featured</Text></HStack></HStack>
    </Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="brand" loading={create.isPending||update.isPending||upload.isUploading} onClick={submit}>{isEdit?"Update Package":"Create Package"}</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function ServicePackagesPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ is_active?: boolean; is_featured?: boolean }>({});
  const [showForm, setShowForm] = useState(false); const [editing, setEditing] = useState<ServicePackage|null>(null); const [del, setDel] = useState<ServicePackage|null>(null);
  const { data, isLoading } = useServicePackages({ page, page_size: 20, ...filters });
  const delM = useDeleteServicePackage(); const toggleActive = useTogglePackageActive(); const toggleFeatured = useTogglePackageFeatured();
  const packages = data?.packages || [];
  const totalPages = data?.total_pages || 1;

  const onDelete = async () => { if (!del) return; try { await delM.mutateAsync(del.id); toaster.create({ title:"Package deleted", type:"success" }); setDel(null); } catch(e:any){ toaster.create({ title:"Delete failed", description:e?.response?.data?.detail||e?.message, type:"error" }); } };

  return <Stack gap="6">
    <Flex justify="space-between" gap="4" direction={{ base:"column", md:"row" }} align={{ md:"center" }}>
      <HStack><Button variant="ghost" onClick={()=>navigate("/services")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Service Packages</Heading><Text color="fg.muted">Manage bundled service packages</Text></Box></HStack>
      {manage && <Button colorPalette="brand" onClick={()=>{setEditing(null); setShowForm(true);}}><LuPlus /> Create Package</Button>}
    </Flex>
    <HStack gap="2" wrap="wrap">
      <Button size="sm" variant={filters.is_active===undefined && filters.is_featured===undefined?"solid":"outline"} onClick={()=>setFilters({})}>All</Button>
      <Button size="sm" variant={filters.is_active===true?"solid":"outline"} onClick={()=>setFilters({ is_active:true })}>Active</Button>
      <Button size="sm" variant={filters.is_active===false?"solid":"outline"} onClick={()=>setFilters({ is_active:false })}>Inactive</Button>
      <Button size="sm" variant={filters.is_featured===true?"solid":"outline"} onClick={()=>setFilters({ is_featured: filters.is_featured?undefined:true })}>Featured</Button>
    </HStack>
    <Stack gap="4">
      {isLoading ? [...Array(4)].map((_,i)=><Card.Root key={i}><Card.Body><Skeleton h="24" /></Card.Body></Card.Root>)
      : packages.map(pkg => <Card.Root key={pkg.id}><Card.Body>
        <Flex gap="4" direction={{ base:"column", md:"row" }}>
          {pkg.image_url ? <Image src={pkg.image_url} alt={pkg.name} w={{ base:"full", md:"180px" }} h="140px" objectFit="cover" rounded="md" /> : <Flex w={{ base:"full", md:"180px" }} h="140px" bg="bg.muted" align="center" justify="center" rounded="md" color="fg.muted"><LuImagePlus /></Flex>}
          <Box flex="1">
            <Flex justify="space-between" gap="3" direction={{ base:"column", md:"row" }}>
              <Box><HStack gap="2" wrap="wrap"><Heading size="md">{pkg.name}</Heading>{pkg.is_featured && <Badge colorPalette="yellow"><LuStar /> Featured</Badge>}{!pkg.is_active && <Badge>Inactive</Badge>}{pkg.is_valid===false && <Badge colorPalette="red">Expired</Badge>}</HStack><Text color="fg.muted" mt="1">{pkg.description}</Text></Box>
              {manage && <HStack gap="1" align="start">
                <IconButton aria-label="Toggle active" size="sm" variant="ghost" onClick={()=>toggleActive.mutate(pkg.id)}>{pkg.is_active?<LuEyeOff/>:<LuEye/>}</IconButton>
                <IconButton aria-label="Toggle featured" size="sm" variant="ghost" onClick={()=>toggleFeatured.mutate(pkg.id)}><LuStar /></IconButton>
                <IconButton aria-label="Edit package" size="sm" variant="ghost" onClick={()=>{setEditing(pkg); setShowForm(true);}}><LuPencil /></IconButton>
                <IconButton aria-label="Delete package" size="sm" variant="ghost" colorPalette="red" onClick={()=>setDel(pkg)}><LuTrash2 /></IconButton>
              </HStack>}
            </Flex>
            <SimpleGrid columns={{ base:2, md:4 }} gap="4" mt="4">
              <Box><Text fontSize="xs" color="fg.muted">Services</Text><Text fontWeight="medium">{pkg.services?.length||0} services</Text></Box>
              <Box><Text fontSize="xs" color="fg.muted">Duration</Text><Text fontWeight="medium">{pkg.total_duration_minutes||pkg.total_duration||0} min</Text></Box>
              <Box><Text fontSize="xs" color="fg.muted">Bookings</Text><Text fontWeight="medium">{pkg.current_bookings_count}{pkg.total_bookings_limit?` / ${pkg.total_bookings_limit}`:""}</Text></Box>
              <Box><Text fontSize="xs" color="fg.muted">Price</Text><Text fontWeight="medium">{fmt(pkg.package_price)} <Text as="span" fontSize="xs" color="fg.muted" textDecoration="line-through">{fmt(pkg.original_price)}</Text></Text></Box>
            </SimpleGrid>
          </Box>
        </Flex>
      </Card.Body></Card.Root>)}
    </Stack>
    {!isLoading && packages.length===0 && <Box textAlign="center" py="10" color="fg.muted">No service packages found.</Box>}
    {totalPages>1 && <HStack justify="center"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Previous</Button><Text fontSize="sm" color="fg.muted">Page {page} of {totalPages}</Text><Button variant="outline" disabled={page>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>Next</Button></HStack>}
    <PackageForm open={showForm} onOpenChange={setShowForm} pkg={editing} />
    <Confirm open={!!del} onOpenChange={(v:boolean)=>!v && setDel(null)} onConfirm={onDelete} loading={delM.isPending} title="Delete package" desc={`Delete "${del?.name}"?`} />
  </Stack>;
}
