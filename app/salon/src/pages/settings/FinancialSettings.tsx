import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, Input, Skeleton, Stack, Switch, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { DEFAULT_FINANCIAL_SETTINGS, getErrorMessage, normalizeFinancialSettings, useFinancialSettings, useUpdateFinancialSettings, type FinancialSettingsData } from "@/features/settings";

const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

export default function FinancialSettings() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useFinancialSettings();
  const update = useUpdateFinancialSettings();
  const [config, setConfig] = useState<FinancialSettingsData>(DEFAULT_FINANCIAL_SETTINGS);

  useEffect(() => { if (data) setConfig(normalizeFinancialSettings(data)); }, [data]);

  const save = async () => {
    try {
      const normalized = normalizeFinancialSettings(config);
      setConfig(await update.mutateAsync(normalized));
      toaster.create({ title: "Financial settings saved", type: "success" });
    } catch (e) {
      toaster.create({ title: "Save failed", description: getErrorMessage(e, "Failed to save financial settings"), type: "error" });
    }
  };

  if (isLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="24" /><Skeleton h="24" /><Skeleton h="24" /></Stack></Container>;
  if (isError) return <Container maxW="6xl" py="6"><Card.Root><Card.Body><Stack gap="3"><Text color="fg.error">Failed to load financial settings.</Text><Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button></Stack></Card.Body></Card.Root></Container>;

  return (
    <Container maxW="6xl" py="6"><Stack gap="6">
      <Flex gap="4" align="center"><Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Financial Settings</Heading><Text color="fg.muted">Configure financial policies and commission rules</Text></Box></Flex>

      <Card.Root><Card.Body><Stack gap="6">
        <Stack gap="4">
          <Heading size="md">Balance Enforcement</Heading>
          <Flex justify="space-between" align="center" gap="4"><Text fontWeight="medium">Enable Balance Enforcement</Text><Switch.Root checked={config.balance_enforcement_enabled} onCheckedChange={(e) => setConfig({ ...config, balance_enforcement_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.balance_enforcement_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><Text fontSize="sm" mb="1">Minimum Balance Threshold</Text><Input type="number" min={0} step={0.01} value={config.minimum_balance_threshold} onChange={(e) => setConfig({ ...config, minimum_balance_threshold: num(e.target.value) })} /><Text fontSize="xs" color="fg.muted" mt="2">Customers cannot make transactions below this balance.</Text></Box>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Refund Policy</Heading>
          <Flex justify="space-between" align="center" gap="4"><Text fontWeight="medium">Enable Refund Policy</Text><Switch.Root checked={config.refund_policy_enabled} onCheckedChange={(e) => setConfig({ ...config, refund_policy_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.refund_policy_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><Text fontSize="sm" mb="1">Refund Window (days)</Text><Input type="number" min={1} max={365} value={config.refund_window_days} onChange={(e) => setConfig({ ...config, refund_window_days: num(e.target.value, 30) })} /><Text fontSize="xs" color="fg.muted" mt="2">Number of days after transaction when refunds are allowed.</Text></Box>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Commission Configuration</Heading>
          <Flex justify="space-between" align="center" gap="4"><Text fontWeight="medium">Enable Commission Tracking</Text><Switch.Root checked={config.commission_tracking_enabled} onCheckedChange={(e) => setConfig({ ...config, commission_tracking_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.commission_tracking_enabled && <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4" pl="4" borderLeftWidth="2px" borderColor="border.emphasized"><Box><Text fontSize="sm" mb="1">Staff Commission (%)</Text><Input type="number" min={0} max={100} step={0.1} value={config.staff_commission_percentage} onChange={(e) => setConfig({ ...config, staff_commission_percentage: num(e.target.value) })} /></Box><Box><Text fontSize="sm" mb="1">Service Commission (%)</Text><Input type="number" min={0} max={100} step={0.1} value={config.service_commission_percentage} onChange={(e) => setConfig({ ...config, service_commission_percentage: num(e.target.value) })} /></Box></Grid>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Invoice Configuration</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Box><Text fontSize="sm" mb="1">Invoice Number Prefix</Text><Input value={config.invoice_numbering_prefix} onChange={(e) => setConfig({ ...config, invoice_numbering_prefix: e.target.value })} placeholder="e.g., INV" /></Box>
            <Box><Text fontSize="sm" mb="1">Starting Invoice Number</Text><Input type="number" min={1} value={config.invoice_numbering_start} onChange={(e) => setConfig({ ...config, invoice_numbering_start: Math.max(1, Math.floor(num(e.target.value, 1000))) })} /></Box>
          </Grid>
          <Box bg="bg.muted" rounded="md" p="3"><Text fontSize="xs" color="fg.muted">Example invoice number: <Text as="span" fontWeight="semibold" color="fg">{config.invoice_numbering_prefix}-{config.invoice_numbering_start}</Text></Text></Box>
        </Stack>

        <Flex justify="end" pt="6" borderTopWidth="1px"><Button onClick={save} loading={update.isPending}><LuCheck /> Save Changes</Button></Flex>
      </Stack></Card.Body></Card.Root>
    </Stack></Container>
  );
}
