import { Box, Button, Card, Container, Flex, Grid, Heading, Skeleton, Stack, Text } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { LuArrowLeft } from "react-icons/lu";
import { useTenantSettings } from "@/features/settings";

function fmt(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

export default function BillingSettings() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useTenantSettings();

  if (isLoading) {
    return (
      <Container maxW="6xl" py="6">
        <Stack gap="4">
          <Skeleton h="10" />
          <Skeleton h="40" />
        </Stack>
      </Container>
    );
  }

  if (isError || !data) {
    return (
      <Container maxW="6xl" py="6">
        <Card.Root>
          <Card.Body>
            <Stack gap="3">
              <Text color="fg.error">Failed to load billing settings.</Text>
              <Button variant="outline" onClick={() => navigate("/settings")}>Back to Settings</Button>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Container>
    );
  }

  const status = data.subscription_status || data.status || "—";
  const trialLabel = data.is_trial ? "Active trial" : "No";

  return (
    <Container maxW="6xl" py="6">
      <Stack gap="6">
        <Flex gap="4" align="center">
          <Button variant="ghost" onClick={() => navigate("/settings")}><LuArrowLeft /> Back</Button>
          <Box>
            <Heading size="xl">Billing & Subscription</Heading>
            <Text color="fg.muted">View your current plan and subscription status.</Text>
          </Box>
        </Flex>

        <Card.Root>
          <Card.Body>
            <Stack gap="4">
              <Heading size="md">Current Subscription</Heading>
              <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }} gap="4">
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Plan</Text><Text fontWeight="medium">{data.plan_name || data.subscription_tier || "—"}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Billing Cycle</Text><Text fontWeight="medium">{data.billing_cycle || "—"}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Subscription Status</Text><Text fontWeight="medium">{status}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Trial</Text><Text fontWeight="medium">{trialLabel}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Trial Ends</Text><Text fontWeight="medium">{fmt(data.trial_end)}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Current Period Ends</Text><Text fontWeight="medium">{fmt(data.current_period_end)}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted" mb="1">Next Billing Date</Text><Text fontWeight="medium">{fmt(data.next_billing_date)}</Text></Box>
              </Grid>
            </Stack>
          </Card.Body>
        </Card.Root>
      </Stack>
    </Container>
  );
}
