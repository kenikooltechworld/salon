import { useEffect, useState } from "react";
import { Box, Button, Card, Container, Flex, Heading, HStack, Input, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft, LuCheck, LuCreditCard } from "react-icons/lu";
import { toaster } from "@/components/ui/toaster";
import { getErrorMessage, normalizePaystackSubaccount, usePaystackSubaccount, useRegisterPaystackSubaccount, type PaystackSubaccountResponse } from "@/features/settings";

export default function PaystackSettings() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = usePaystackSubaccount();
  const registerSubaccount = useRegisterPaystackSubaccount();
  const [subaccountForm, setSubaccountForm] = useState({ business_name: "", settlement_bank: "", account_number: "", percentage_charge: 15 });
  const [subaccountSaving, setSubaccountSaving] = useState(false);
  const normalizedSubaccount = normalizePaystackSubaccount(data);
  const subaccountCode = normalizedSubaccount.subaccount_code;

  useEffect(() => {
    if (data) {
      const resp = data as PaystackSubaccountResponse;
      const code = resp?.data?.subaccount_code ?? resp?.subaccount_code ?? null;
      const pct = resp?.data?.percentage_charge ?? resp?.percentage_charge ?? null;
      if (code) {
        setSubaccountForm((f) => ({ ...f, percentage_charge: pct ?? f.percentage_charge }));
      }
    }
  }, [data]);

  const saveSubaccount = async () => {
    try {
      if (!subaccountForm.business_name.trim() || !subaccountForm.settlement_bank.trim() || !subaccountForm.account_number.trim()) {
        toaster.create({ title: "Incomplete details", description: "Business name, settlement bank, and account number are required.", type: "error" });
        return;
      }
      setSubaccountSaving(true);
      const res = await registerSubaccount.mutateAsync({
        business_name: subaccountForm.business_name.trim(),
        settlement_bank: subaccountForm.settlement_bank.trim(),
        account_number: subaccountForm.account_number.trim(),
        percentage_charge: subaccountForm.percentage_charge,
      });
      setSubaccountSaving(false);
      toaster.create({ title: "Paystack subaccount registered", description: res.subaccount_code ? `Subaccount code: ${res.subaccount_code}` : "Subaccount registered successfully.", type: "success" });
    } catch (e) {
      setSubaccountSaving(false);
      toaster.create({ title: "Subaccount registration failed", description: getErrorMessage(e, "Failed to register Paystack subaccount"), type: "error" });
    }
  };

  if (isLoading) {
    return (
      <Container maxW="6xl" py="6">
        <Stack gap="4">
          <Skeleton h="10" />
          <Skeleton h="64" />
        </Stack>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container maxW="6xl" py="6">
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              <Text color="fg.error">Failed to load Paystack subaccount.</Text>
              <Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Container>
    );
  }

  return (
    <Container maxW="6xl" py="6">
      <Stack gap="6">
        <Flex gap="4" align="center">
          <Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button>
          <Box>
            <Heading size="xl">Paystack Gateway</Heading>
            <Text color="fg.muted">Register a Paystack subaccount and manage payment routing for your salon.</Text>
          </Box>
        </Flex>

        <Card.Root>
          <Card.Body>
            <Stack gap="6">
              <Stack gap="4">
                <HStack gap="2">
                  <LuCreditCard size={20} />
                  <Heading size="md">Subaccount Registration</Heading>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  Register a Paystack subaccount to receive payments directly to your bank account. Free users are charged the platform fee; subscribers pay 0%.
                </Text>
                {subaccountCode ? (
                  <Box pl="4" borderLeftWidth="2px" borderColor="border.emphasized" maxW="sm">
                    <Text fontSize="sm" color="fg.muted">Registered subaccount code:</Text>
                    <Text as="span" fontWeight="semibold" color="fg">{subaccountCode}</Text>
                  </Box>
                ) : (
                  <Stack gap="3" pt="3">
                    <Input placeholder="Business Name" value={subaccountForm.business_name} onChange={(e) => setSubaccountForm({ ...subaccountForm, business_name: e.target.value })} required />
                    <Input placeholder="Settlement Bank" value={subaccountForm.settlement_bank} onChange={(e) => setSubaccountForm({ ...subaccountForm, settlement_bank: e.target.value })} required />
                    <Input placeholder="Account Number" value={subaccountForm.account_number} onChange={(e) => setSubaccountForm({ ...subaccountForm, account_number: e.target.value })} required />
                    <Input type="number" min={0} max={100} step={0.1} value={subaccountForm.percentage_charge} onChange={(e) => setSubaccountForm({ ...subaccountForm, percentage_charge: Number(e.target.value) })} required />
                    <Text fontSize="xs" color="fg.muted">{subaccountForm.percentage_charge}% platform fee for free users; 0% for subscribers</Text>
                  </Stack>
                )}
              </Stack>

              <Flex gap="3" justify="flex-end" pt="6" borderTopWidth="1px">
                <Button onClick={saveSubaccount} loading={subaccountSaving || registerSubaccount.isPending} disabled={!!subaccountCode}>
                  <LuCheck /> Register Subaccount
                </Button>
              </Flex>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  );
}
