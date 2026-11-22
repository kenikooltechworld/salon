import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, HStack, Input, NativeSelect, Skeleton, Stack, Switch, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuCopy } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import {
  DEFAULT_TENANT_SETTINGS,
  SETTINGS_DAYS,
  getErrorMessage,
  normalizeTenantSettings,
  useImageUpload,
  useResetTenantSettings,
  useTenantSettings,
  useUpdateTenantSettings,
  type TenantSettingsData,
} from "@/features/settings";

export default function GeneralSettings() {
  const navigate = useNavigate();
  const { data, isLoading } = useTenantSettings();
  const update = useUpdateTenantSettings();
  const reset = useResetTenantSettings();
  const [settings, setSettings] = useState<TenantSettingsData>(DEFAULT_TENANT_SETTINGS);
  const upload = useImageUpload({
    folder: "salon-logos",
    mediaType: "image",
    onSuccess: (url) => setSettings((p) => ({ ...p, logo_url: url })),
    onError: (e) => toaster.create({ title: "Upload failed", description: e, type: "error" }),
  });

  useEffect(() => { if (data) setSettings(normalizeTenantSettings(data)); }, [data]);

  const save = async () => {
    try { setSettings(await update.mutateAsync(settings)); toaster.create({ title: "Settings saved", type: "success" }); }
    catch (e) { toaster.create({ title: "Save failed", description: getErrorMessage(e, "Failed to save settings"), type: "error" }); }
  };
  const doReset = async () => {
    try { setSettings(await reset.mutateAsync()); toaster.create({ title: "Settings reset", type: "success" }); }
    catch (e) { toaster.create({ title: "Reset failed", description: getErrorMessage(e, "Failed to reset settings"), type: "error" }); }
  };

  if (isLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="40" /><Skeleton h="60" /></Stack></Container>;

  const status = settings.status || "";
  const plan = settings.plan_name || settings.subscription_tier || "";
  const billingCycle = settings.billing_cycle || (settings.subscription_tier === "trial" ? "trial" : "monthly");

  return (
    <Container maxW="6xl" py="6"><Stack gap="6">
      <Flex gap="4" align="center"><Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">General Settings</Heading><Text color="fg.muted">Manage basic business information and preferences</Text></Box></Flex>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Account Information</Heading>
        <Grid templateColumns={{ base:"1fr", md:"repeat(2,1fr)" }} gap="4">
          <Box><Text fontSize="sm" mb="1">Subscription Status</Text><Input value={status} disabled /></Box>
          <Box><Text fontSize="sm" mb="1">Plan</Text><Input value={plan} disabled /></Box>
          <Box><Text fontSize="sm" mb="1">Billing Cycle</Text><Input value={billingCycle} disabled /></Box>
          <Box><Text fontSize="sm" mb="1">Subdomain URL</Text><HStack><Input value={settings.subdomain_url || ""} disabled /><Button variant="outline" onClick={async()=>{ await navigator.clipboard.writeText(settings.subdomain_url||""); toaster.create({title:"Copied",type:"success"}); }}><LuCopy />Copy</Button></HStack></Box>
        </Grid>
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Basic Information</Heading>
        <Grid templateColumns={{ base:"1fr", md:"repeat(2,1fr)" }} gap="4">
          <Box><Text fontSize="sm" mb="1">Salon Name</Text><Input value={settings.salon_name} onChange={(e)=>setSettings({...settings,salon_name:e.target.value})} /></Box>
          <Box><Text fontSize="sm" mb="1">Email</Text><Input type="email" value={settings.email} onChange={(e)=>setSettings({...settings,email:e.target.value})} /></Box>
          <Box><Text fontSize="sm" mb="1">Phone</Text><Input value={settings.phone} onChange={(e)=>setSettings({...settings,phone:e.target.value})} /></Box>
          <Box><Text fontSize="sm" mb="1">Address</Text><Input value={settings.address} onChange={(e)=>setSettings({...settings,address:e.target.value})} /></Box>
        </Grid>
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Business Hours</Heading>
        {SETTINGS_DAYS.map((day) => { const h=settings.business_hours[day] || {open_time:"09:00",close_time:"18:00",is_closed:false}; return (
          <Grid key={day} templateColumns={{base:"1fr", md:"120px 120px 1fr 40px 1fr"}} gap="3" alignItems="center">
            <Text textTransform="capitalize" fontWeight="medium">{day}</Text>
            <Switch.Root checked={!h.is_closed} onCheckedChange={(e)=>setSettings({...settings,business_hours:{...settings.business_hours,[day]:{...h,is_closed:!e.checked}}})}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root>
            <Input type="time" value={h.open_time} disabled={h.is_closed} onChange={(e)=>setSettings({...settings,business_hours:{...settings.business_hours,[day]:{...h,open_time:e.target.value}}})} />
            <Text textAlign="center">to</Text>
            <Input type="time" value={h.close_time} disabled={h.is_closed} onChange={(e)=>setSettings({...settings,business_hours:{...settings.business_hours,[day]:{...h,close_time:e.target.value}}})} />
          </Grid>
        ); })}
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Business Configuration</Heading>
        <Grid templateColumns={{ base:"1fr", md:"repeat(2,1fr)" }} gap="4">
          <Box><Text fontSize="sm" mb="1">Tax Rate (%)</Text><Input type="number" min={0} max={100} step={0.1} value={settings.tax_rate} onChange={(e)=>setSettings({...settings,tax_rate:Number(e.target.value)})} /></Box>
          <Box><Text fontSize="sm" mb="1">Currency</Text><NativeSelect.Root><NativeSelect.Field value={settings.currency} onChange={(e)=>setSettings({...settings,currency:e.target.value})}>{["NGN","USD","EUR","GBP","ZAR","KES","GHS"].map(c=><option key={c} value={c}>{c}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
          <Box><Text fontSize="sm" mb="1">Timezone</Text><NativeSelect.Root><NativeSelect.Field value={settings.timezone} onChange={(e)=>setSettings({...settings,timezone:e.target.value})}>{["Africa/Lagos","Africa/Johannesburg","Africa/Cairo","Africa/Nairobi","Africa/Accra","UTC","Europe/London","America/New_York"].map(t=><option key={t} value={t}>{t}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
          <Box><Text fontSize="sm" mb="1">Language</Text><NativeSelect.Root><NativeSelect.Field value={settings.language} onChange={(e)=>setSettings({...settings,language:e.target.value})}>{[["en","English"],["fr","French"],["es","Spanish"],["pt","Portuguese"],["yo","Yoruba"],["ha","Hausa"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
        </Grid>
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Branding</Heading>
        <Grid templateColumns={{ base:"1fr", md:"repeat(2,1fr)" }} gap="4">
          <Box gridColumn={{md:"span 2"}}><Text fontSize="sm" mb="1">Logo</Text><HStack gap="4" align="start"><Box w="24" h="24" borderWidth="1px" rounded="lg" overflow="hidden" bg="bg.muted" display="flex" alignItems="center" justifyContent="center">{(upload.preview || settings.logo_url) ? <img src={upload.preview || settings.logo_url || ""} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}} /> : <Text fontSize="xs" color="fg.muted">No logo</Text>}</Box><Box flex="1"><Input type="file" accept="image/*" onChange={async (e)=>{ const input = e.currentTarget; const f = input.files?.[0]; if (f) await upload.uploadImage(f); input.value = ""; }} /><Text fontSize="xs" color="fg.muted" mt="2">Recommended 200x200px PNG/JPG. Max 5MB.</Text>{upload.isUploading && <Text fontSize="xs">Uploading {upload.uploadProgress}%</Text>}</Box></HStack></Box>
          <Box><Text fontSize="sm" mb="1">Primary Color</Text><HStack><Input type="color" value={settings.primary_color} onChange={(e)=>setSettings({...settings,primary_color:e.target.value})} w="14" p="1" /><Input value={settings.primary_color} onChange={(e)=>setSettings({...settings,primary_color:e.target.value})} /></HStack></Box>
          <Box><Text fontSize="sm" mb="1">Secondary Color</Text><HStack><Input type="color" value={settings.secondary_color} onChange={(e)=>setSettings({...settings,secondary_color:e.target.value})} w="14" p="1" /><Input value={settings.secondary_color} onChange={(e)=>setSettings({...settings,secondary_color:e.target.value})} /></HStack></Box>
        </Grid>
      </Stack></Card.Body></Card.Root>

      <Card.Root><Card.Body><Stack gap="4"><Heading size="md">Booking Settings</Heading>
        {[["allow_online_booking","Allow Online Booking"],["auto_confirm_bookings","Auto-Confirm Bookings"],["require_customer_approval","Require Customer Approval"]].map(([k,l])=> (
          <Flex key={k} justify="space-between" align="center"><Text fontSize="sm" fontWeight="medium">{l}</Text><Switch.Root checked={(settings as any)[k]} onCheckedChange={(e)=>setSettings({...settings,[k]:e.checked} as any)}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
        ))}
        <Box><Text fontSize="sm" mb="1">Appointment Reminder (hours before)</Text><Input type="number" min={1} max={168} value={settings.appointment_reminder_hours} onChange={(e)=>setSettings({...settings,appointment_reminder_hours:Number(e.target.value)})} /></Box>
      </Stack></Card.Body></Card.Root>

      <Flex justify="end" gap="3"><Button variant="outline" onClick={doReset} loading={reset.isPending}>Reset Defaults</Button><Button onClick={save} loading={update.isPending || upload.isUploading}><LuCheck /> Save Changes</Button></Flex>
    </Stack></Container>
  );
}
