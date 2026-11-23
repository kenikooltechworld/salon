import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, HStack, Icon, Input, NativeSelect, Skeleton, Stack, Switch, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuInfo } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { DEFAULT_OPERATIONAL_SETTINGS, getErrorMessage, normalizeOperationalSettings, useOperationalSettings, useUpdateOperationalSettings, type OperationalSettingsData } from "@/features/settings";

const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
const LabelTip = ({ label, tip }: { label: string; tip: string }) => (
  <HStack gap="1" mb="1"><Text fontSize="sm">{label}</Text><Tooltip content={tip} showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label={tip}><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack>
);

export default function OperationalSettings() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useOperationalSettings();
  const update = useUpdateOperationalSettings();
  const [config, setConfig] = useState<OperationalSettingsData>(DEFAULT_OPERATIONAL_SETTINGS);

  useEffect(() => { if (data) setConfig(normalizeOperationalSettings(data)); }, [data]);

  const save = async () => {
    try {
      const normalized = normalizeOperationalSettings(config);
      setConfig(await update.mutateAsync(normalized));
      toaster.create({ title: "Operational settings saved", type: "success" });
    } catch (e) {
      toaster.create({ title: "Save failed", description: getErrorMessage(e, "Failed to save operational settings"), type: "error" });
    }
  };

  if (isLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="32" /><Skeleton h="32" /><Skeleton h="32" /></Stack></Container>;
  if (isError) return <Container maxW="6xl" py="6"><Card.Root><Card.Body><Stack gap="3"><Text color="fg.error">Failed to load operational settings.</Text><Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button></Stack></Card.Body></Card.Root></Container>;

  return (
    <Container maxW="6xl" py="6"><Stack gap="6">
      <Flex gap="4" align="center"><Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Operational Settings</Heading><Text color="fg.muted">Configure inventory, waiting room, notifications, and system preferences.</Text></Box></Flex>

      <Card.Root><Card.Body><Stack gap="6">
        <Stack gap="4">
          <Heading size="md">Inventory & Resources</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Inventory Tracking</Text><Tooltip content="Track stock levels and trigger low-stock alerts." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Inventory tracking info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.inventory_tracking_enabled} onCheckedChange={(e) => setConfig({ ...config, inventory_tracking_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.inventory_tracking_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Low Stock Threshold" tip="Alert when stock falls below this quantity." /><Input type="number" min={0} value={config.low_stock_threshold} onChange={(e) => setConfig({ ...config, low_stock_threshold: Math.max(0, Math.floor(num(e.target.value, 10))) })} /></Box>}
          <Flex justify="space-between" align="center" gap="4" pt="2"><Box><HStack gap="1"><Text fontWeight="medium">Enable Resource Management</Text><Tooltip content="Enable scheduling/management for salon resources and equipment." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Resource management info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.resource_management_enabled} onCheckedChange={(e) => setConfig({ ...config, resource_management_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Waiting Room</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Waiting Room</Text><Tooltip content="Allow walk-in/waiting queue management." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Waiting room info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.waiting_room_enabled} onCheckedChange={(e) => setConfig({ ...config, waiting_room_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.waiting_room_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Maximum Queue Capacity" tip="Maximum number of customers allowed in the waiting queue." /><Input type="number" min={1} value={config.waiting_room_max_capacity} onChange={(e) => setConfig({ ...config, waiting_room_max_capacity: Math.max(1, Math.floor(num(e.target.value, 50))) })} /></Box>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Notifications</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Notification Preferences</Text><Tooltip content="Allow tenant-level notification preference controls." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Notification preferences info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.notification_preferences_enabled} onCheckedChange={(e) => setConfig({ ...config, notification_preferences_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Box><LabelTip label="SMS Provider" tip="Provider used for SMS notifications." /><NativeSelect.Root><NativeSelect.Field value={config.sms_provider} onChange={(e) => setConfig({ ...config, sms_provider: e.target.value as OperationalSettingsData["sms_provider"] })}><option value="termii">Termii</option><option value="twilio">Twilio</option><option value="none">None</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
            <Box><LabelTip label="Email Provider" tip="Provider used for transactional emails." /><NativeSelect.Root><NativeSelect.Field value={config.email_provider} onChange={(e) => setConfig({ ...config, email_provider: e.target.value as OperationalSettingsData["email_provider"] })}><option value="smtp">SMTP</option><option value="sendgrid">SendGrid</option><option value="none">None</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
          </Grid>
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Backup & Performance</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Automatic Backups</Text><Tooltip content="Run scheduled backups at the selected frequency." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Backups info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.backup_enabled} onCheckedChange={(e) => setConfig({ ...config, backup_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.backup_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Backup Frequency" tip="How often automatic backups run." /><NativeSelect.Root><NativeSelect.Field value={config.backup_frequency} onChange={(e) => setConfig({ ...config, backup_frequency: e.target.value as OperationalSettingsData["backup_frequency"] })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>}
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Cache Optimization</Text><Tooltip content="Cache frequently used data to improve performance." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Cache info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.cache_optimization_enabled} onCheckedChange={(e) => setConfig({ ...config, cache_optimization_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.cache_optimization_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Cache TTL (minutes)" tip="How long cached data remains valid." /><Input type="number" min={1} value={config.cache_ttl_minutes} onChange={(e) => setConfig({ ...config, cache_ttl_minutes: Math.max(1, Math.floor(num(e.target.value, 60))) })} /></Box>}
        </Stack>

        <Flex justify="end" pt="6" borderTopWidth="1px"><Button onClick={save} loading={update.isPending}><LuCheck /> Save Changes</Button></Flex>
      </Stack></Card.Body></Card.Root>
    </Stack></Container>
  );
}
