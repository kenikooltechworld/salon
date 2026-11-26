import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Grid, Heading, HStack, Icon, Input, Skeleton, Stack, Switch, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuInfo, LuPencil } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import {
  DEFAULT_FINANCIAL_SETTINGS,
  getErrorMessage,
  normalizeFinancialSettings,
  normalizePaystackSubaccount,
  useFinancialSettings,
  usePaystackBanks,
  usePaystackSubaccount,
  useRegisterPaystackSubaccount,
  useResolvePaystackAccount,
  useUpdateFinancialSettings,
  type FinancialSettingsData,
} from "@/features/settings";

const num = (v: string, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
const LabelTip = ({ label, tip }: { label: string; tip: string }) => (
  <HStack gap="1" mb="1"><Text fontSize="sm">{label}</Text><Tooltip content={tip} showArrow openDelay={150}><Box as="span" color="fg.muted" aria-label={tip}><Icon as={LuInfo} boxSize="3.5" /></Box></Tooltip></HStack>
);

export default function FinancialSettings() {
  const navigate = useNavigate();
  const { data, isLoading: isFinancialLoading, isError } = useFinancialSettings();
  const update = useUpdateFinancialSettings();
  const banksQ = usePaystackBanks();

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

  if (isFinancialLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="24" /><Skeleton h="24" /><Skeleton h="24" /></Stack></Container>;
  if (isError) return <Container maxW="6xl" py="6"><Card.Root><Card.Body><Stack gap="3"><Text color="fg.error">Failed to load financial settings.</Text><Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button></Stack></Card.Body></Card.Root></Container>;

  const banks = banksQ.data || [];

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
          <Heading size="md">Account Setup</Heading>
          <PaystackSubaccountSection banks={banks} />
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

function PaystackSubaccountSection({ banks }: { banks: any[] }) {
  const { data, isLoading, isError } = usePaystackSubaccount();
  const registerSubaccount = useRegisterPaystackSubaccount();
  const resolveAccount = useResolvePaystackAccount();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ business_name: "", settlement_bank: "", account_number: "" });
  const [resolving, setResolving] = useState(false);
  const [resolvedAccountName, setResolvedAccountName] = useState("");

  const normalized = normalizePaystackSubaccount(data);
  const subaccountCode = normalized.subaccount_code;

  if (isLoading) return <Stack gap="4"><Skeleton h="10" /><Skeleton h="64" /></Stack>;
  if (isError) return (
    <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm">
      <Text color="fg.error">Failed to load account details.</Text>
      <Button variant="outline" size="sm" mt="3" onClick={() => { void registerSubaccount.mutateAsync(form as never).catch(() => {}); }}>Retry</Button>
    </Box>
  );

  // Paystack returns the bank NAME in settlement_bank; map it back to the code used by the dropdown.
  const bankCodeFor = (nameOrCode: string | null) => {
    if (!nameOrCode) return "";
    const match = banks.find((b) => b.name === nameOrCode || b.code === nameOrCode || b.slug === nameOrCode);
    return match?.code || match?.id || nameOrCode;
  };

  const resolveNow = async (accountNumber: string, bankCode: string) => {
    if (accountNumber.trim().length !== 10 || !bankCode) {
      setResolvedAccountName("");
      return;
    }
    setResolving(true);
    try {
      const res = await resolveAccount.mutateAsync({ account_number: accountNumber.trim(), bank_code: bankCode });
      setResolvedAccountName(res.account_name || "");
    } catch {
      setResolvedAccountName("");
    } finally {
      setResolving(false);
    }
  };

  const startEdit = () => {
    const bankCode = bankCodeFor(normalized.settlement_bank_name || normalized.settlement_bank_code);
    setForm({
      business_name: normalized.business_name || "",
      settlement_bank: bankCode,
      account_number: normalized.account_number || "",
    });
    setResolvedAccountName("");
    setEditing(true);
    if ((normalized.account_number || "").length === 10 && bankCode) {
      void resolveNow(normalized.account_number!, bankCode);
    }
  };

  const handleSave = async () => {
    if (!form.business_name.trim() || !form.account_number.trim() || !form.settlement_bank.trim()) {
      toaster.create({ title: "Incomplete details", description: "Business name, account number, and bank are required.", type: "error" });
      return;
    }
    try {
      await registerSubaccount.mutateAsync({
        business_name: form.business_name.trim(),
        settlement_bank: form.settlement_bank.trim(),
        account_number: form.account_number.trim(),
        percentage_charge: 0,
      });
      toaster.create({ title: "Account saved", type: "success" });
      setEditing(false);
    } catch (e: any) {
      toaster.create({ title: "Could not save account", description: getErrorMessage(e, "Failed to save account"), type: "error" });
    }
  };

  const showForm = !subaccountCode || editing;

  return (
    <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm">
      {!showForm && subaccountCode ? (
        <Stack gap="2">
          <Flex justify="space-between" align="center">
            <Text fontSize="sm" color="fg.muted">Account setup complete.</Text>
            <Button size="sm" variant="outline" onClick={startEdit}><LuPencil /> Edit</Button>
          </Flex>
          <Text fontSize="sm">Business Name: <Text as="span" fontWeight="semibold" color="fg">{normalized.business_name || "—"}</Text></Text>
          <Text fontSize="sm">Account Number: <Text as="span" fontWeight="semibold" color="fg">{normalized.account_number || "—"}</Text></Text>
          <Text fontSize="sm">Bank: <Text as="span" fontWeight="semibold" color="fg">{normalized.settlement_bank_name || normalized.settlement_bank_code || "—"}</Text></Text>
          <Text fontSize="xs" color="fg.muted">Subaccount: {subaccountCode}</Text>
        </Stack>
      ) : (
        <Stack gap="3" pt="3">
          {editing && (
            <Flex justify="space-between" align="center">
              <Text fontSize="sm" fontWeight="medium">Edit Account Details</Text>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </Flex>
          )}
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1">Account Number</Text>
            <Input
              placeholder="Enter 10-digit account number"
              value={form.account_number}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm((p) => ({ ...p, account_number: value }));
                if (value.length === 10) void resolveNow(value, form.settlement_bank);
                else setResolvedAccountName("");
              }}
            />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1">Bank</Text>
            <select
              value={form.settlement_bank}
              onChange={(e) => {
                const bank = e.target.value;
                setForm((p) => ({ ...p, settlement_bank: bank }));
                void resolveNow(form.account_number, bank);
              }}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">Select your bank</option>
              {banks.map((b) => (
                <option key={b.code || b.id} value={b.code || b.id}>{b.name}</option>
              ))}
            </select>
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1">Account Name</Text>
            <Input placeholder={resolving ? "Resolving..." : "Auto-filled from your account"} value={resolvedAccountName} readOnly bg="bg.muted" />
          </Box>
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb="1">Business Name</Text>
            <Input placeholder="Displayed on receipts" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
          </Box>
          <Button onClick={handleSave} loading={registerSubaccount.isPending} disabled={!form.business_name.trim() || !form.account_number.trim() || !form.settlement_bank.trim()}>
            {editing ? "Update Account" : "Save Account"}
          </Button>
        </Stack>
      )}
    </Box>
  );
}