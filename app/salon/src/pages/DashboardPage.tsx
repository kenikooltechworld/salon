import { Box, Button, Heading, Text } from "@chakra-ui/react";
import { useAuthStore } from "@/stores/authStore";

export default function DashboardPage() {
  const { user, tenant, logout } = useAuthStore();
  return (
    <Box maxW="md" mx="auto" mt={16} p={6}>
      <Heading mb={4}>Dashboard</Heading>
      <Text>Welcome, {user?.first_name ?? "guest"}</Text>
      <Text>Tenant: {tenant?.name ?? "-"}</Text>
      <Button mt={4} onClick={logout}>Logout</Button>
    </Box>
  );
}
