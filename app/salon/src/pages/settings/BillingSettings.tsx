import { Box, Card, Container, Grid, Heading, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useTenantSettings } from "@/features/settings";

function fmt(v?: string | null) {
  if (!v) return "-";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

export default function BillingSettings() {
  const { data, isLoading } = useTenantSettings();
  if (isLoading) return <Container maxW="6xl" py="6"><Stack gap="4"><Skeleton h="10" /><Skeleton h="40" /></Stack></Container>;
  const s = data;
  const status = s?.subscription_status || s?.status || "-";
  return (
    <Container maxW="6xl" py="6">
      <Stack gap="6">
        <Box>
          <Heading size="xl">Billing &amp; Subscription</Heading>
          <Text color="fg.muted">Trial subscription status for your tenant.</Text>
        </Box>
        <Card.Root><Card.Body>
          <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="4">
            <Box><Text fontSize="sm" color="fg.muted">Plan</Text><Text fontWeight="medium">{s?.plan_name || s?.subscription_tier || "-"}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Billing cycle</Text><Text fontWeight="medium">{s?.billing_cycle || "-"}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Subscription status</Text><Text fontWeight="medium">{status}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Trial</Text><Text fontWeight="medium">{s?.is_trial ? "Active" : "No"}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Trial ends</Text><Text fontWeight="medium">{fmt(s?.trial_end)}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Current period end</Text><Text fontWeight="medium">{fmt(s?.current_period_end)}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Next billing date</Text><Text fontWeight="medium">{fmt(s?.next_billing_date)}</Text></Box>
          </Grid>
        </Card.Body></Card.Root>
      </Stack>
    </Container>
  );
}
