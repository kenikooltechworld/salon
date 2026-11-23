import { useEffect, useState } from "react";
import { Box, Button, Dialog, Field, Flex, Grid, HStack, IconButton, Image, Input, NativeSelect, Portal, Stack, Text, Textarea } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useCreateService, useCreateServiceCategory, useUpdateService, useUpdateServiceCategory, type Service, type ServiceCategory } from "@/features/services";
import { useImageUpload } from "@/hooks/useImageUpload";

const ICONS = ["Scissors","Sparkles","Droplets","Brush","Heart","Star","Flower2","Hand","User","Crown"];
const COLORS = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#EC4899","#14B8A6","#6366F1","#F97316","#64748B"];

export function CategoryModal({ open, onOpenChange, category }: { open: boolean; onOpenChange: (v:boolean)=>void; category?: ServiceCategory | null }) {
  const create = useCreateServiceCategory();
  const update = useUpdateServiceCategory();
  const isEdit = !!category?.id;
  const [form, setForm] = useState({ name: "", description: "", color: "#3B82F6", icon: "Scissors", is_active: true });
  useEffect(() => { if (open) setForm(category ? { name: category.name, description: category.description||"", color: category.color||"#3B82F6", icon: category.icon||"Scissors", is_active: category.is_active } : { name: "", description: "", color: "#3B82F6", icon: "Scissors", is_active: true }); }, [open, category?.id]);
  const submit = async () => {
    if (!form.name.trim()) { toaster.create({ title: "Category name is required", type: "error" }); return; }
    try {
      if (isEdit) await update.mutateAsync({ id: category!.id, payload: form as any });
      else await create.mutateAsync(form as any);
      toaster.create({ title: isEdit ? "Category updated" : "Category created", type: "success" }); onOpenChange(false);
    }
    catch (e: any) { toaster.create({ title: isEdit ? "Failed to update category" : "Failed to create category", description: e?.response?.data?.detail || e?.message, type: "error" }); }
  };
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{isEdit ? "Edit Service Category" : "Add Service Category"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="4">
      <Field.Root><Field.Label>Category Name *</Field.Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field.Root>
      <Field.Root><Field.Label>Description</Field.Label><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field.Root>
      <Grid templateColumns="1fr 1fr" gap="4">
        <Field.Root><Field.Label>Color</Field.Label><HStack wrap="wrap">{COLORS.map(c => <Box key={c} as="button" {...({type:"button"} as any)} w="7" h="7" rounded="full" bg={c} borderWidth="2px" borderColor={form.color===c?"fg":"transparent"} onClick={()=>setForm({...form,color:c})} />)}</HStack></Field.Root>
        <Field.Root><Field.Label>Icon</Field.Label><NativeSelect.Root><NativeSelect.Field value={form.icon} onChange={(e)=>setForm({...form,icon:e.target.value})}>{ICONS.map(i=><option key={i} value={i}>{i}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field.Root>
      </Grid>
      <Button size="sm" w="fit-content" variant={form.is_active?"solid":"outline"} colorPalette={form.is_active?"green":"gray"} onClick={()=>setForm({...form,is_active:!form.is_active})}>{form.is_active?"Active":"Inactive"}</Button>
    </Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button colorPalette="brand" loading={create.isPending||update.isPending} onClick={submit}>{isEdit?"Update Category":"Create Category"}</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export function ServiceFormDialog({ open, onOpenChange, service, categories, staff }: { open:boolean; onOpenChange:(v:boolean)=>void; service?:Service|null; categories:ServiceCategory[]; staff:any[] }) {
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

