import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, HStack, Icon, Input, Skeleton, Stack, Switch, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuInfo } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { DEFAULT_FINANCIAL_SETTINGS, getErrorMessage, normalizeFinancialSettings, useFinancialSettings, useUpdateFinancialSettings, type FinancialSettingsData } from "@/features/settings";

const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
const LabelTip = ({ label, tip }: { label: string; tip: string }) => (
  <HStack gap="1" mb="1"><Text fontSize="sm">{label}</Text><Tooltip content={tip} showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label={tip}><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack>
);

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
      <Flex gap="4" align="center"><Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Financial Settings</Heading><Text color="fg.muted">Global financial policies: customer balance, refunds, commission defaults, and invoices.</Text></Box></Flex>

      <Card.Root><Card.Body><Stack gap="6">
        <Stack gap="4">
          <Heading size="md">Balance Enforcement</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Balance Enforcement</Text><Tooltip content="Customer transaction guardrail. Separate from Commission Settings balance enforcement." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Balance enforcement info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack><Text fontSize="sm" color="fg.muted">Applies to customer balance/transactions.</Text></Box><Switch.Root checked={config.balance_enforcement_enabled} onCheckedChange={(e) => setConfig({ ...config, balance_enforcement_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.balance_enforcement_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Minimum Balance Threshold" tip="Customers cannot make transactions below this balance." /><Input type="number" min={0} step={0.01} value={config.minimum_balance_threshold} onChange={(e) => setConfig({ ...config, minimum_balance_threshold: num(e.target.value) })} /><Text fontSize="xs" color="fg.muted" mt="2">Customers cannot make transactions below this balance.</Text></Box>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Refund Policy</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Refund Policy</Text><Tooltip content="Controls whether refunds are allowed within the configured window." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Refund policy info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.refund_policy_enabled} onCheckedChange={(e) => setConfig({ ...config, refund_policy_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.refund_policy_enabled && <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm"><LabelTip label="Refund Window (days)" tip="Number of days after a transaction when refunds are allowed." /><Input type="number" min={1} max={365} value={config.refund_window_days} onChange={(e) => setConfig({ ...config, refund_window_days: num(e.target.value, 30) })} /><Text fontSize="xs" color="fg.muted" mt="2">Number of days after transaction when refunds are allowed.</Text></Box>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Commission Configuration</Heading>
          <Flex justify="space-between" align="center" gap="4"><Box><HStack gap="1"><Text fontWeight="medium">Enable Commission Tracking</Text><Tooltip content="Global commission tracking defaults. Detailed commission rules/payouts are managed in Commission Settings." showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label="Commission tracking info"><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack></Box><Switch.Root checked={config.commission_tracking_enabled} onCheckedChange={(e) => setConfig({ ...config, commission_tracking_enabled: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
          {config.commission_tracking_enabled && <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4" pl="4" borderLeftWidth="2px" borderColor="border.emphasized"><Box><LabelTip label="Staff Commission (%)" tip="Default staff commission percentage used for tracking/calculations." /><Input type="number" min={0} max={100} step={0.1} value={config.staff_commission_percentage} onChange={(e) => setConfig({ ...config, staff_commission_percentage: num(e.target.value) })} /></Box><Box><LabelTip label="Service Commission (%)" tip="Default service commission percentage used for tracking/calculations." /><Input type="number" min={0} max={100} step={0.1} value={config.service_commission_percentage} onChange={(e) => setConfig({ ...config, service_commission_percentage: num(e.target.value) })} /></Box></Grid>}
        </Stack>

        <Stack gap="4" pt="6" borderTopWidth="1px">
          <Heading size="md">Invoice Configuration</Heading>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
            <Box><LabelTip label="Invoice Number Prefix" tip="Prefix prepended to generated invoice numbers, e.g. INV-1001." /><Input value={config.invoice_numbering_prefix} onChange={(e) => setConfig({ ...config, invoice_numbering_prefix: e.target.value })} placeholder="e.g., INV" /></Box>
            <Box><LabelTip label="Starting Invoice Number" tip="Next invoice sequence number baseline." /><Input type="number" min={1} value={config.invoice_numbering_start} onChange={(e) => setConfig({ ...config, invoice_numbering_start: Math.max(1, Math.floor(num(e.target.value, 1000))) })} /></Box>
          </Grid>
          <Box bg="bg.muted" rounded="md" p="3"><Text fontSize="xs" color="fg.muted">Example invoice number: <Text as="span" fontWeight="semibold" color="fg">{config.invoice_numbering_prefix}-{config.invoice_numbering_start}</Text></Text></Box>
        </Stack>

        <Flex justify="end" pt="6" borderTopWidth="1px"><Button onClick={save} loading={update.isPending}><LuCheck /> Save Changes</Button></Flex>
      </Stack></Card.Body></Card.Root>
    </Stack></Container>
  );
}
