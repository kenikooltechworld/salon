import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, Input, NativeSelect, Skeleton, Stack, Switch, Tabs, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuPlus, LuTrash2 } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { DEFAULT_COMMISSION_SETTINGS, getErrorMessage, normalizeCommissionSettings, useCommissionSettings, useUpdateCommissionSettings, type CommissionRule, type CommissionSettingsData } from "@/features/settings";

const newRule = (): CommissionRule => ({ id: crypto.randomUUID(), name: "New Rule", percentage: 0, minAmount: 0, maxAmount: 0, applicableTo: "staff" });
const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };

export default function CommissionSettings() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useCommissionSettings();
  const update = useUpdateCommissionSettings();
  const [settings, setSettings] = useState<CommissionSettingsData>(DEFAULT_COMMISSION_SETTINGS);

  useEffect(() => { if (data) setSettings(normalizeCommissionSettings(data)); }, [data]);

  const updateRule = (id: string, patch: Partial<CommissionRule>) => setSettings((s) => ({ ...s, commissionRules: s.commissionRules.map((r) => r.id === id ? { ...r, ...patch } : r) }));
  const removeRule = (id: string) => setSettings((s) => ({ ...s, commissionRules: s.commissionRules.filter((r) => r.id !== id) }));

  const save = async () => {
    try {
      const normalized = normalizeCommissionSettings(settings);
      if (normalized.commissionRules.some((r) => !r.name.trim())) throw new Error("Each commission rule must have a name");
      if (normalized.commissionRules.some((r) => r.maxAmount > 0 && r.maxAmount < r.minAmount)) throw new Error("Max Amount must be greater than or equal to Min Amount");
      setSettings(await update.mutateAsync(normalized));
      toaster.create({ title: "Commission settings saved", type: "success" });
    } catch (e) {
      toaster.create({ title: "Save failed", description: getErrorMessage(e, "Failed to save commission settings"), type: "error" });
    }
  };

  if (isLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack></Container>;
  if (isError) return <Container maxW="6xl" py="6"><Card.Root><Card.Body><Stack gap="3"><Text color="fg.error">Failed to load commission settings.</Text><Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button></Stack></Card.Body></Card.Root></Container>;

  return (
    <Container maxW="6xl" py="6"><Stack gap="6">
      <Flex gap="4" align="center"><Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button><Box><Heading size="xl">Commission Settings</Heading><Text color="fg.muted">Configure commission rules and financial controls</Text></Box></Flex>

      <Tabs.Root defaultValue="rules" variant="enclosed">
        <Tabs.List>
          <Tabs.Trigger value="rules">Commission Rules</Tabs.Trigger>
          <Tabs.Trigger value="financial">Financial Controls</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="rules" pt="4">
          <Card.Root><Card.Body><Stack gap="4">
            <Flex justify="space-between" align={{ base: "stretch", md: "center" }} gap="3" direction={{ base: "column", md: "row" }}><Box><Heading size="md">Commission Rules</Heading><Text fontSize="sm" color="fg.muted">Define commission structures for staff and services.</Text></Box><Button size="sm" onClick={() => setSettings((s) => ({ ...s, commissionRules: [...s.commissionRules, newRule()] }))}><LuPlus /> Add Rule</Button></Flex>
            {settings.commissionRules.length === 0 ? <Box borderWidth="1px" borderStyle="dashed" rounded="md" p="6"><Text color="fg.muted" fontSize="sm">No commission rules configured. Add a rule to define commission structures.</Text></Box> : settings.commissionRules.map((rule) => (
              <Card.Root key={rule.id} variant="outline"><Card.Body><Stack gap="3">
                <Flex justify="space-between" gap="3" align="end"><Box flex="1"><Text fontSize="sm" mb="1">Rule Name</Text><Input value={rule.name} onChange={(e) => updateRule(rule.id, { name: e.target.value })} placeholder="e.g. Senior Stylist Commission" /></Box><Button variant="ghost" colorPalette="red" onClick={() => removeRule(rule.id)} aria-label="Remove rule"><LuTrash2 /></Button></Flex>
                <Grid templateColumns={{ base: "1fr", md: "repeat(4,1fr)" }} gap="3">
                  <Box><Text fontSize="sm" mb="1">Percentage (%)</Text><Input type="number" min={0} max={100} step={0.1} value={rule.percentage} onChange={(e) => updateRule(rule.id, { percentage: num(e.target.value) })} /></Box>
                  <Box><Text fontSize="sm" mb="1">Min Amount</Text><Input type="number" min={0} value={rule.minAmount} onChange={(e) => updateRule(rule.id, { minAmount: num(e.target.value) })} /></Box>
                  <Box><Text fontSize="sm" mb="1">Max Amount</Text><Input type="number" min={0} value={rule.maxAmount} onChange={(e) => updateRule(rule.id, { maxAmount: num(e.target.value) })} /></Box>
                  <Box><Text fontSize="sm" mb="1">Applicable To</Text><NativeSelect.Root><NativeSelect.Field value={rule.applicableTo} onChange={(e) => updateRule(rule.id, { applicableTo: e.target.value as "staff" | "service" })}><option value="staff">Staff</option><option value="service">Service</option></NativeSelect.Field><NativeSelect.Indicator /></NativeSelect.Root></Box>
                </Grid>
              </Stack></Card.Body></Card.Root>
            ))}
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="financial" pt="4">
          <Card.Root><Card.Body><Stack gap="5">
            <Box><Heading size="md">Financial Controls</Heading><Text fontSize="sm" color="fg.muted">Manage balance enforcement and payment settings.</Text></Box>
            <Flex justify="space-between" align="center" gap="4"><Box><Text fontWeight="medium">Enable Balance Enforcement</Text><Text fontSize="sm" color="fg.muted">Require minimum balance before payouts/actions where enforced.</Text></Box><Switch.Root checked={settings.balanceEnforcement.enabled} onCheckedChange={(e) => setSettings((s) => ({ ...s, balanceEnforcement: { ...s.balanceEnforcement, enabled: e.checked } }))}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
            <Box maxW="sm"><Text fontSize="sm" mb="1">Minimum Balance Required</Text><Input type="number" min={0} value={settings.balanceEnforcement.minimumBalance} onChange={(e) => setSettings((s) => ({ ...s, balanceEnforcement: { ...s.balanceEnforcement, minimumBalance: num(e.target.value) } }))} disabled={!settings.balanceEnforcement.enabled} /></Box>
            <Flex justify="space-between" align="center" gap="4"><Box><Text fontWeight="medium">Enable Auto Settlement</Text><Text fontSize="sm" color="fg.muted">Automatically settle eligible balances.</Text></Box><Switch.Root checked={settings.paymentSettings.autoSettlement} onCheckedChange={(e) => setSettings((s) => ({ ...s, paymentSettings: { ...s.paymentSettings, autoSettlement: e.checked } }))}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root></Flex>
            <Box maxW="sm"><Text fontSize="sm" mb="1">Settlement Day (1-31)</Text><Input type="number" min={1} max={31} value={settings.paymentSettings.settlementDay} onChange={(e) => setSettings((s) => ({ ...s, paymentSettings: { ...s.paymentSettings, settlementDay: num(e.target.value, 1) } }))} disabled={!settings.paymentSettings.autoSettlement} /></Box>
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>
      </Tabs.Root>

      <Flex justify="end"><Button onClick={save} loading={update.isPending}><LuCheck /> Save Commission Settings</Button></Flex>
    </Stack></Container>
  );
}
