import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Badge, Box, Button, Card, Dialog, Flex, Grid, Heading, HStack, IconButton, Input, NativeSelect,
  Portal, Skeleton, Stack, Table, Tabs, Text, Textarea,
} from "@chakra-ui/react";
import { motion } from "motion/react";
import { LuCheck, LuPencil, LuPlus, LuSearch, LuTrash2, LuX } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/features/auth";
import {
  useCreateService, useCreateServiceAddon, useCreateServiceCategory, useCreateServicePackage,
  useDeleteService, useDeleteServiceAddon, useDeleteServiceCategory, useDeleteServicePackage,
  useServiceAddons, useServiceCategories, useServicePackages, useServices,
  useUpdateService, useUpdateServiceAddon, useUpdateServiceCategory, useUpdateServicePackage,
  type Service, type ServiceAddon, type ServiceCategory, type ServicePackage,
} from "@/features/services";
import { apiClient } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

function money(v: string | number | null | undefined) {
  const n = typeof v === "number" ? v : Number(v || 0);
  return `₦${n.toLocaleString()}`;
}
function canManage(role?: string) { return ["owner", "admin", "manager"].includes((role || "").toLowerCase()); }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <Box><Text fontSize="sm" mb="1" fontWeight="medium">{label}</Text>{children}</Box>;
}

function ConfirmDelete({ open, onOpenChange, title, onConfirm, loading }: { open: boolean; onOpenChange: (v: boolean) => void; title: string; onConfirm: () => void; loading?: boolean }) {
  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>Confirm Delete</Dialog.Title></Dialog.Header>
        <Dialog.Body><Text>{title}</Text></Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button colorPalette="red" loading={loading} onClick={onConfirm}>Delete</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}

function ServiceFormDialog({ open, onOpenChange, service, categories, staff }: { open: boolean; onOpenChange: (v: boolean) => void; service?: Service | null; categories: ServiceCategory[]; staff: any[] }) {
  const create = useCreateService(); const update = useUpdateService();
  const [form, setForm] = useState<any>({});
  const isEdit = !!service?.id;
  useMemo(() => {
    setForm(service ? {
      name: service.name, description: service.description || "", duration_minutes: service.duration_minutes, price: String(service.price),
      category: service.category, color: service.color || "#3B82F6", icon: service.icon || "Scissors", is_active: service.is_active,
      is_published: service.is_published, public_description: service.public_description || "", public_image_url: service.public_image_url || "",
      allow_public_booking: service.allow_public_booking, allow_pay_now: service.allow_pay_now, tags: (service.tags || []).join(", "),
      benefits: (service.benefits || []).join(", "), commission_percentage: service.commission_percentage ?? "", staff_ids: service.staff_ids || [],
    } : { name: "", description: "", duration_minutes: 30, price: "0", category: categories[0]?.name || "General", color: "#3B82F6", icon: "Scissors", is_active: true, is_published: false, public_description: "", public_image_url: "", allow_public_booking: false, allow_pay_now: false, tags: "", benefits: "", commission_percentage: "", staff_ids: [] });
  }, [service, open, categories]);

  const submit = async () => {
    const payload = {
      ...form,
      duration_minutes: Number(form.duration_minutes),
      price: form.price,
      commission_percentage: form.commission_percentage === "" ? null : form.commission_percentage,
      tags: String(form.tags || "").split(",").map((s: string) => s.trim()).filter(Boolean),
      benefits: String(form.benefits || "").split(",").map((s: string) => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit) await update.mutateAsync({ id: service!.id, payload });
      else await create.mutateAsync(payload);
      toaster.create({ title: isEdit ? "Service updated" : "Service created", type: "success" });
      onOpenChange(false);
    } catch (e: any) {
      toaster.create({ title: "Save failed", description: e?.message || "Request failed", type: "error" });
    }
  };

  const toggleStaff = (id: string) => setForm((p: any) => ({ ...p, staff_ids: p.staff_ids.includes(id) ? p.staff_ids.filter((x: string) => x !== id) : [...p.staff_ids, id] }));

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl" scrollBehavior="inside">
      <Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
        <Dialog.Header><Dialog.Title>{isEdit ? "Edit Service" : "Create Service"}</Dialog.Title></Dialog.Header>
        <Dialog.Body>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Field label="Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Category">
              <NativeSelect.Root><NativeSelect.Field value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Field>
            <Field label="Duration (minutes)"><Input type="number" value={form.duration_minutes ?? 30} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} /></Field>
            <Field label="Price"><Input value={form.price ?? ""} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Box gridColumn={{ md: "span 2" }}><Field label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field></Box>
            <Box gridColumn={{ md: "span 2" }}><Field label="Public description"><Textarea value={form.public_description || ""} onChange={(e) => setForm({ ...form, public_description: e.target.value })} /></Field></Box>
            <Field label="Public image URL"><Input value={form.public_image_url || ""} onChange={(e) => setForm({ ...form, public_image_url: e.target.value })} /></Field>
            <Field label="Commission %"><Input value={form.commission_percentage ?? ""} onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })} /></Field>
            <Field label="Tags (comma separated)"><Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
            <Field label="Benefits (comma separated)"><Input value={form.benefits || ""} onChange={(e) => setForm({ ...form, benefits: e.target.value })} /></Field>
            <Field label="Color"><Input value={form.color || "#3B82F6"} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
            <Field label="Icon"><Input value={form.icon || "Scissors"} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></Field>
          </Grid>
          <HStack gap="4" mt="4" flexWrap="wrap">
            {[
              ["is_active", "Active"], ["is_published", "Published"], ["allow_public_booking", "Public booking"], ["allow_pay_now", "Allow pay now"],
            ].map(([k, label]) => (
              <Button key={k} size="sm" variant={form[k] ? "solid" : "outline"} colorPalette={form[k] ? "green" : "gray"} onClick={() => setForm({ ...form, [k]: !form[k] })}>
                {form[k] ? <LuCheck /> : <LuX />} {label}
              </Button>
            ))}
          </HStack>
          <Box mt="4">
            <Text fontSize="sm" fontWeight="medium" mb="2">Assigned staff</Text>
            <Flex gap="2" wrap="wrap">
              {staff.map((s: any) => (
                <Button key={s.id} size="xs" variant={form.staff_ids?.includes(s.id) ? "solid" : "outline"} onClick={() => toggleStaff(s.id)}>
                  {s.first_name ? `${s.first_name} ${s.last_name || ""}`.trim() : s.user_id}
                </Button>
              ))}
              {staff.length === 0 && <Text fontSize="sm" color="fg.muted">No staff found.</Text>}
            </Flex>
          </Box>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button colorPalette="brand" loading={create.isPending || update.isPending} onClick={submit}>{isEdit ? "Update" : "Create"}</Button>
        </Dialog.Footer>
      </Dialog.Content></Dialog.Positioner></Portal>
    </Dialog.Root>
  );
}

function CategoryDialog({ open, onOpenChange, category }: { open: boolean; onOpenChange: (v: boolean) => void; category?: ServiceCategory | null }) {
  const create = useCreateServiceCategory(); const update = useUpdateServiceCategory();
  const [form, setForm] = useState<any>({ name: "", description: "", color: "#3B82F6", icon: "Tag", is_active: true });
  useMemo(() => setForm(category ? { name: category.name, description: category.description || "", color: category.color || "#3B82F6", icon: category.icon || "Tag", is_active: category.is_active } : { name: "", description: "", color: "#3B82F6", icon: "Tag", is_active: true }), [category, open]);
  const submit = async () => {
    try {
      if (category) await update.mutateAsync({ id: category.id, payload: form });
      else await create.mutateAsync(form);
      toaster.create({ title: category ? "Category updated" : "Category created", type: "success" }); onOpenChange(false);
    } catch (e: any) { toaster.create({ title: "Failed", description: e?.message, type: "error" }); }
  };
  return <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{category ? "Edit Category" : "Create Category"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="3"><Field label="Name"><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field><Field label="Description"><Textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field><Grid templateColumns="1fr 1fr" gap="3"><Field label="Color"><Input value={form.color} onChange={(e)=>setForm({...form,color:e.target.value})} /></Field><Field label="Icon"><Input value={form.icon} onChange={(e)=>setForm({...form,icon:e.target.value})} /></Field></Grid></Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button loading={create.isPending||update.isPending} onClick={submit}>Save</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function AddonDialog({ open, onOpenChange, addon, services }: { open: boolean; onOpenChange: (v: boolean) => void; addon?: ServiceAddon | null; services: Service[] }) {
  const create = useCreateServiceAddon(); const update = useUpdateServiceAddon();
  const [form, setForm] = useState<any>({});
  useMemo(() => setForm(addon ? { ...addon, price: String(addon.price), applicable_service_ids: addon.applicable_service_ids || [] } : { name: "", description: "", price: "0", duration_minutes: 0, image_url: "", is_active: true, applicable_service_ids: [], category: "product", display_order: 0 }), [addon, open]);
  const submit = async () => { try { const payload = { ...form, duration_minutes: Number(form.duration_minutes), display_order: Number(form.display_order) }; if (addon) await update.mutateAsync({ id: addon.id, payload }); else await create.mutateAsync(payload); toaster.create({ title: "Saved", type: "success" }); onOpenChange(false); } catch (e: any) { toaster.create({ title: "Failed", description: e?.message, type: "error" }); } };
  const toggleSvc = (id: string) => setForm((p: any) => ({ ...p, applicable_service_ids: p.applicable_service_ids.includes(id) ? p.applicable_service_ids.filter((x: string) => x !== id) : [...p.applicable_service_ids, id] }));
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)} size="lg"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{addon ? "Edit Add-on" : "Create Add-on"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="3"><Grid templateColumns={{base:"1fr",md:"1fr 1fr"}} gap="3"><Field label="Name"><Input value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field><Field label="Category"><NativeSelect.Root><NativeSelect.Field value={form.category||"product"} onChange={(e)=>setForm({...form,category:e.target.value})}><option value="product">product</option><option value="upgrade">upgrade</option><option value="treatment">treatment</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Field><Field label="Price"><Input value={form.price||"0"} onChange={(e)=>setForm({...form,price:e.target.value})} /></Field><Field label="Duration minutes"><Input type="number" value={form.duration_minutes??0} onChange={(e)=>setForm({...form,duration_minutes:e.target.value})} /></Field></Grid><Field label="Description"><Textarea value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field><Field label="Image URL"><Input value={form.image_url||""} onChange={(e)=>setForm({...form,image_url:e.target.value})} /></Field><Box><Text fontSize="sm" mb="1">Applicable services</Text><Flex gap="2" wrap="wrap">{services.map(s=><Button key={s.id} size="xs" variant={form.applicable_service_ids?.includes(s.id)?"solid":"outline"} onClick={()=>toggleSvc(s.id)}>{s.name}</Button>)}</Flex></Box></Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button loading={create.isPending||update.isPending} onClick={submit}>Save</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

function PackageDialog({ open, onOpenChange, pkg, services }: { open: boolean; onOpenChange: (v: boolean) => void; pkg?: ServicePackage | null; services: Service[] }) {
  const create = useCreateServicePackage(); const update = useUpdateServicePackage();
  const [form, setForm] = useState<any>({});
  useMemo(() => setForm(pkg ? { name: pkg.name, description: pkg.description || "", package_price: String(pkg.package_price), is_active: pkg.is_active, is_featured: pkg.is_featured, services: pkg.services.map(s => ({ service_id: s.service_id, quantity: s.quantity })) } : { name: "", description: "", package_price: "0", is_active: true, is_featured: false, services: [] }), [pkg, open]);
  const setQty = (service_id: string, qty: number) => setForm((p: any) => {
    const existing = p.services.filter((s: any) => s.service_id !== service_id);
    if (qty > 0) existing.push({ service_id, quantity: qty });
    return { ...p, services: existing };
  });
  const submit = async () => { try { const payload = { ...form, services: form.services }; if (pkg) await update.mutateAsync({ id: pkg.id, payload }); else await create.mutateAsync(payload); toaster.create({ title: "Saved", type: "success" }); onOpenChange(false); } catch (e: any) { toaster.create({ title: "Failed", description: e?.message, type: "error" }); } };
  return <Dialog.Root open={open} onOpenChange={(e)=>onOpenChange(e.open)} size="lg"><Portal><Dialog.Backdrop /><Dialog.Positioner><Dialog.Content>
    <Dialog.Header><Dialog.Title>{pkg ? "Edit Package" : "Create Package"}</Dialog.Title></Dialog.Header>
    <Dialog.Body><Stack gap="3"><Field label="Name"><Input value={form.name||""} onChange={(e)=>setForm({...form,name:e.target.value})} /></Field><Field label="Description"><Textarea value={form.description||""} onChange={(e)=>setForm({...form,description:e.target.value})} /></Field><Field label="Package price"><Input value={form.package_price||"0"} onChange={(e)=>setForm({...form,package_price:e.target.value})} /></Field><Box><Text fontSize="sm" mb="2">Services in package</Text><Stack gap="2">{services.map(s=>{ const sel=form.services?.find((x:any)=>x.service_id===s.id); return <HStack key={s.id} justify="space-between"><Text fontSize="sm">{s.name}</Text><Input w="90px" type="number" min={0} value={sel?.quantity||0} onChange={(e)=>setQty(s.id, Number(e.target.value||0))} /></HStack>; })}</Stack></Box></Stack></Dialog.Body>
    <Dialog.Footer><Button variant="outline" onClick={()=>onOpenChange(false)}>Cancel</Button><Button loading={create.isPending||update.isPending} onClick={submit}>Save</Button></Dialog.Footer>
  </Dialog.Content></Dialog.Positioner></Portal></Dialog.Root>;
}

export default function ServicesPage() {
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const manage = canManage(role);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [activeOnly, setActiveOnly] = useState<string>("all");
  const [tab, setTab] = useState("services");

  const catsQ = useServiceCategories();
  const servicesQ = useServices({ page: 1, page_size: 100, search: q || undefined, category: category || undefined, active_only: activeOnly === "all" ? undefined : activeOnly === "active" });
  const addonsQ = useServiceAddons();
  const packagesQ = useServicePackages({ page: 1, page_size: 100 });
  const staffQ = useQuery({ queryKey: ["staff", "all"], queryFn: async () => (await apiClient.get("/staff")).data });

  const categories = catsQ.data?.categories || [];
  const services = servicesQ.data?.services || [];
  const addons = addonsQ.data?.addons || [];
  const packages = packagesQ.data?.packages || [];
  const staff = Array.isArray(staffQ.data) ? staffQ.data : [];

  const [svcOpen, setSvcOpen] = useState(false); const [editingSvc, setEditingSvc] = useState<Service | null>(null);
  const [catOpen, setCatOpen] = useState(false); const [editingCat, setEditingCat] = useState<ServiceCategory | null>(null);
  const [addonOpen, setAddonOpen] = useState(false); const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [pkgOpen, setPkgOpen] = useState(false); const [editingPkg, setEditingPkg] = useState<ServicePackage | null>(null);
  const [del, setDel] = useState<{ type: string; id: string; name: string } | null>(null);

  const delSvc = useDeleteService(); const delCat = useDeleteServiceCategory(); const delAddon = useDeleteServiceAddon(); const delPkg = useDeleteServicePackage();
  const doDelete = async () => {
    if (!del) return;
    try {
      if (del.type === "service") await delSvc.mutateAsync(del.id);
      if (del.type === "category") await delCat.mutateAsync(del.id);
      if (del.type === "addon") await delAddon.mutateAsync(del.id);
      if (del.type === "package") await delPkg.mutateAsync(del.id);
      toaster.create({ title: "Deleted", type: "success" }); setDel(null);
    } catch (e: any) { toaster.create({ title: "Delete failed", description: e?.message, type: "error" }); }
  };

  return (
    <Stack gap="6">
      <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="4" direction={{ base: "column", md: "row" }}>
        <Box>
          <Heading size="xl">Services</Heading>
          <Text color="fg.muted">Manage services, categories, add-ons, and packages.</Text>
        </Box>
        {manage && <HStack><Button variant="outline" onClick={() => { setEditingCat(null); setCatOpen(true); }}><LuPlus /> Category</Button><Button colorPalette="brand" onClick={() => { setEditingSvc(null); setSvcOpen(true); }}><LuPlus /> Service</Button></HStack>}
      </Flex>

      <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)} variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="services">Services</Tabs.Trigger>
          <Tabs.Trigger value="addons">Add-ons</Tabs.Trigger>
          <Tabs.Trigger value="packages">Packages</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="services" pt="4">
          <Card.Root><Card.Body><Stack gap="4">
            <Grid templateColumns={{ base: "1fr", md: "1fr 220px 180px" }} gap="3">
              <HStack><Box color="fg.muted"><LuSearch /></Box><Input placeholder="Search services" value={q} onChange={(e) => setQ(e.target.value)} /></HStack>
              <NativeSelect.Root><NativeSelect.Field value={category} onChange={(e) => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
              <NativeSelect.Root><NativeSelect.Field value={activeOnly} onChange={(e) => setActiveOnly(e.target.value)}><option value="all">All statuses</option><option value="active">Active only</option><option value="inactive">Include inactive</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root>
            </Grid>

            {servicesQ.isLoading ? <Stack>{[...Array(5)].map((_, i) => <Skeleton key={i} h="12" />)}</Stack> : (
              <Box overflowX="auto">
                <Table.Root size="sm">
                  <Table.Header><Table.Row>
                    <Table.ColumnHeader>Service</Table.ColumnHeader><Table.ColumnHeader>Category</Table.ColumnHeader><Table.ColumnHeader>Duration</Table.ColumnHeader><Table.ColumnHeader>Price</Table.ColumnHeader><Table.ColumnHeader>Status</Table.ColumnHeader><Table.ColumnHeader textAlign="end">Actions</Table.ColumnHeader>
                  </Table.Row></Table.Header>
                  <Table.Body>
                    {services.map((s) => (
                      <Table.Row key={s.id} cursor="pointer" _hover={{ bg: "bg.muted" }} onClick={() => navigate(`/services/${s.id}`)}>
                        <Table.Cell><Text fontWeight="medium">{s.name}</Text><Text fontSize="xs" color="fg.muted" lineClamp="1">{s.description}</Text></Table.Cell>
                        <Table.Cell>{s.category}</Table.Cell>
                        <Table.Cell>{s.duration_minutes} min</Table.Cell>
                        <Table.Cell>{money(s.price)}</Table.Cell>
                        <Table.Cell><HStack gap="1"><Badge colorPalette={s.is_active ? "green" : "gray"}>{s.is_active ? "Active" : "Inactive"}</Badge>{s.is_published && <Badge colorPalette="blue">Published</Badge>}</HStack></Table.Cell>
                        <Table.Cell textAlign="end" onClick={(e) => e.stopPropagation()}>
                          {manage && <HStack justify="end"><IconButton aria-label="Edit" size="xs" variant="ghost" onClick={() => { setEditingSvc(s); setSvcOpen(true); }}><LuPencil /></IconButton><IconButton aria-label="Delete" size="xs" variant="ghost" colorPalette="red" onClick={() => setDel({ type: "service", id: s.id, name: s.name })}><LuTrash2 /></IconButton></HStack>}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                    {services.length === 0 && <Table.Row><Table.Cell colSpan={6}><Text color="fg.muted">No services found.</Text></Table.Cell></Table.Row>}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Stack></Card.Body></Card.Root>

          <Card.Root mt="4"><Card.Body>
            <Flex justify="space-between" mb="3"><Heading size="md">Categories</Heading></Flex>
            <Flex gap="2" wrap="wrap">
              {categories.map((c) => (
                <HStack key={c.id} borderWidth="1px" rounded="full" px="3" py="1" gap="2">
                  <Box w="2.5" h="2.5" rounded="full" bg={c.color || "gray.400"} />
                  <Text fontSize="sm">{c.name}</Text>
                  {manage && <><IconButton aria-label="Edit category" size="2xs" variant="ghost" onClick={() => { setEditingCat(c); setCatOpen(true); }}><LuPencil /></IconButton><IconButton aria-label="Delete category" size="2xs" variant="ghost" colorPalette="red" onClick={() => setDel({ type: "category", id: c.id, name: c.name })}><LuTrash2 /></IconButton></>}
                </HStack>
              ))}
            </Flex>
          </Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="addons" pt="4">
          <Card.Root><Card.Body><Stack gap="4">
            <Flex justify="space-between"><Heading size="md">Add-ons</Heading>{manage && <Button size="sm" onClick={() => { setEditingAddon(null); setAddonOpen(true); }}><LuPlus /> Add-on</Button>}</Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)", xl: "repeat(3,1fr)" }} gap="4">
              {addons.map((a) => (
                <motion.div key={a.id} whileHover={{ y: -2 }}>
                  <Card.Root variant="outline"><Card.Body><Stack gap="2">
                    <Flex justify="space-between"><Heading size="sm">{a.name}</Heading><Badge>{a.category}</Badge></Flex>
                    <Text fontSize="sm" color="fg.muted" lineClamp="2">{a.description}</Text>
                    <HStack justify="space-between"><Text fontWeight="semibold">{money(a.price)}</Text><Text fontSize="xs" color="fg.muted">{a.duration_minutes} min</Text></HStack>
                    {manage && <HStack justify="end"><IconButton aria-label="Edit addon" size="xs" variant="ghost" onClick={() => { setEditingAddon(a); setAddonOpen(true); }}><LuPencil /></IconButton><IconButton aria-label="Delete addon" size="xs" variant="ghost" colorPalette="red" onClick={() => setDel({ type: "addon", id: a.id, name: a.name })}><LuTrash2 /></IconButton></HStack>}
                  </Stack></Card.Body></Card.Root>
                </motion.div>
              ))}
            </Grid>
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="packages" pt="4">
          <Card.Root><Card.Body><Stack gap="4">
            <Flex justify="space-between"><Heading size="md">Packages</Heading>{manage && <Button size="sm" onClick={() => { setEditingPkg(null); setPkgOpen(true); }}><LuPlus /> Package</Button>}</Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
              {packages.map((p) => (
                <motion.div key={p.id} whileHover={{ y: -2 }}>
                  <Card.Root variant="outline"><Card.Body><Stack gap="2">
                    <Flex justify="space-between" gap="2"><Heading size="sm">{p.name}</Heading><HStack>{p.is_featured && <Badge colorPalette="purple">Featured</Badge>}<Badge colorPalette={p.is_active ? "green" : "gray"}>{p.is_active ? "Active" : "Inactive"}</Badge></HStack></Flex>
                    <Text fontSize="sm" color="fg.muted" lineClamp="2">{p.description}</Text>
                    <HStack justify="space-between"><Text fontWeight="semibold">{money(p.package_price)}</Text><Text fontSize="xs" color="fg.muted">Save {money(p.discount_amount)} ({Number(p.discount_percentage).toFixed(0)}%)</Text></HStack>
                    <Text fontSize="xs" color="fg.muted">{p.services?.length || 0} services · {p.total_duration_minutes} min</Text>
                    {manage && <HStack justify="end"><IconButton aria-label="Edit package" size="xs" variant="ghost" onClick={() => { setEditingPkg(p); setPkgOpen(true); }}><LuPencil /></IconButton><IconButton aria-label="Delete package" size="xs" variant="ghost" colorPalette="red" onClick={() => setDel({ type: "package", id: p.id, name: p.name })}><LuTrash2 /></IconButton></HStack>}
                  </Stack></Card.Body></Card.Root>
                </motion.div>
              ))}
            </Grid>
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>
      </Tabs.Root>

      <ServiceFormDialog open={svcOpen} onOpenChange={setSvcOpen} service={editingSvc} categories={categories} staff={staff} />
      <CategoryDialog open={catOpen} onOpenChange={setCatOpen} category={editingCat} />
      <AddonDialog open={addonOpen} onOpenChange={setAddonOpen} addon={editingAddon} services={services} />
      <PackageDialog open={pkgOpen} onOpenChange={setPkgOpen} pkg={editingPkg} services={services} />
      <ConfirmDelete open={!!del} onOpenChange={(v) => !v && setDel(null)} title={`Delete ${del?.name || "item"}?`} onConfirm={doDelete} loading={delSvc.isPending || delCat.isPending || delAddon.isPending || delPkg.isPending} />
    </Stack>
  );
}
