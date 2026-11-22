import { useEffect, useState } from "react";
import { Alert, Badge, Box, Button, Card, Container, Flex, Grid, Heading, HStack, Input, SimpleGrid, Skeleton, Stack, Tabs, Text } from "@chakra-ui/react";
import { LuBuilding2, LuTrendingUp, LuUser, LuBell, LuCopy } from "react-icons/lu";
import { authApi, authService } from "@/features/auth";
import { toaster } from "@/components/ui/toaster";

interface OwnerProfile {
  id: string; email: string; firstName: string; lastName: string; phone: string; role: string; roleNames: string[]; tenantId: string;
}
interface BusinessProfile {
  salon_name: string; email: string; phone: string; address: string; subdomain?: string; subdomain_url?: string | null; subscription_tier?: string; status?: string; description?: string | null;
}
interface ActivityStats { totalAppointments: number; totalRevenue: number; totalCustomers: number; pendingActions: number; }

export default function ProfilePage() {
  const [tab, setTab] = useState("profile");
  const [profile, setProfile] = useState<OwnerProfile>({ id: "", email: "", firstName: "", lastName: "", phone: "", role: "", roleNames: [], tenantId: "" });
  const [business, setBusiness] = useState<BusinessProfile>({ salon_name: "", email: "", phone: "", address: "" });
  const [activity, setActivity] = useState<ActivityStats>({ totalAppointments: 0, totalRevenue: 0, totalCustomers: 0, pendingActions: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { void load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [meRes, settingsRes, metricsRes, pendingRes] = await Promise.all([
        authApi.me(), authApi.getSettings(), authApi.dashboardMetrics(), authApi.dashboardPendingActions(),
      ]);
      const u = meRes.data.user;
      setProfile({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phone: u.phone || "", role: u.role, roleNames: [u.role], tenantId: u.tenant_id });
      const s = settingsRes.data.data;
      setBusiness({ salon_name: s.salon_name || s.name || "", email: s.email || "", phone: s.phone || "", address: s.address || "", subdomain: s.subdomain, subdomain_url: s.subdomain_url, subscription_tier: s.subscription_tier, status: s.status, description: s.description });
      const m = metricsRes.data.data;
      const p = pendingRes.data.data;
      setActivity({ totalAppointments: m.appointments?.thisMonth || 0, totalRevenue: m.revenue?.current || 0, totalCustomers: m.customers?.total || 0, pendingActions: p.total || 0 });
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to load profile");
    } finally { setLoading(false); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await authApi.updateMe({ first_name: profile.firstName, last_name: profile.lastName, phone: profile.phone });
      setSuccess("Profile updated successfully");
      toaster.create({ title: "Profile updated", type: "success" });
      await authService.loadSession();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to update profile"; setError(msg); toaster.create({ title: msg, type: "error" });
    } finally { setSaving(false); }
  };

  const saveBusiness = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await authApi.updateSettings({ salon_name: business.salon_name, email: business.email, phone: business.phone, address: business.address, description: business.description || "" });
      setSuccess("Business profile updated successfully");
      toaster.create({ title: "Business profile updated", type: "success" });
      await load();
    } catch (e: any) {
      const msg = e?.response?.data?.detail || "Failed to update business profile"; setError(msg); toaster.create({ title: msg, type: "error" });
    } finally { setSaving(false); }
  };

  const badgeColor = (v?: string) => {
    const t = (v || "").toLowerCase();
    if (["active", "professional"].includes(t)) return "green";
    if (["trial", "starter", "pending"].includes(t)) return "yellow";
    if (["inactive", "suspended"].includes(t)) return "red";
    return "purple";
  };

  if (loading) {
    return <Container maxW="6xl" py="8"><Stack gap="4"><Skeleton h="10" w="64" /><SimpleGrid columns={{ base: 1, md: 3 }} gap="4">{[0,1,2].map(i => <Skeleton key={i} h="28" />)}</SimpleGrid><Skeleton h="96" /></Stack></Container>;
  }

  return (
    <Container maxW="6xl" py="6">
      <Stack gap="6">
        <Box>
          <Heading size="xl">My Profile</Heading>
          <Text color="fg.muted">Manage your personal and business profile</Text>
        </Box>

        {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
        {success && <Alert.Root status="success"><Alert.Indicator /><Alert.Description>{success}</Alert.Description></Alert.Root>}

        <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
          <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="blue.subtle" rounded="lg"><LuTrendingUp /></Box><Box><Text fontSize="sm" color="fg.muted">Revenue (This Month)</Text><Text fontSize="2xl" fontWeight="bold">₦{activity.totalRevenue.toLocaleString()}</Text></Box></HStack></Card.Body></Card.Root>
          <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="green.subtle" rounded="lg"><LuUser /></Box><Box><Text fontSize="sm" color="fg.muted">Appointments</Text><Text fontSize="2xl" fontWeight="bold">{activity.totalAppointments}</Text></Box></HStack></Card.Body></Card.Root>
          <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="yellow.subtle" rounded="lg"><LuBell /></Box><Box><Text fontSize="sm" color="fg.muted">Pending Actions</Text><Text fontSize="2xl" fontWeight="bold">{activity.pendingActions}</Text></Box></HStack></Card.Body></Card.Root>
        </SimpleGrid>

        <Tabs.Root value={tab} onValueChange={(e) => setTab(e.value)}>
          <Tabs.List>
            <Tabs.Trigger value="profile"><LuUser /> Personal Profile</Tabs.Trigger>
            <Tabs.Trigger value="business"><LuBuilding2 /> Business Profile</Tabs.Trigger>
            <Tabs.Trigger value="activity"><LuTrendingUp /> Activity</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="profile">
            <Card.Root><Card.Body>
              <form onSubmit={saveProfile}>
                <Stack gap="4">
                  <Heading size="md">Personal Information</Heading>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
                    <Box><Text mb="1" fontSize="sm">First Name</Text><Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} disabled={saving} /></Box>
                    <Box><Text mb="1" fontSize="sm">Last Name</Text><Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} disabled={saving} /></Box>
                  </Grid>
                  <Box><Text mb="1" fontSize="sm">Email Address</Text><Input value={profile.email} disabled /><Text fontSize="xs" color="fg.muted">Email cannot be changed here.</Text></Box>
                  <Box><Text mb="1" fontSize="sm">Phone Number</Text><Input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={saving} /></Box>
                  <Box><Text mb="1" fontSize="sm">Role</Text><Input value={profile.roleNames?.join(", ") || profile.role} disabled /></Box>
                  <Flex justify="flex-end"><Button type="submit" loading={saving}>Save Changes</Button></Flex>
                </Stack>
              </form>
            </Card.Body></Card.Root>
          </Tabs.Content>

          <Tabs.Content value="business">
            <Card.Root><Card.Body>
              <form onSubmit={saveBusiness}>
                <Stack gap="4">
                  <Flex justify="space-between" align="center" wrap="wrap" gap="2">
                    <Heading size="md">Business Information</Heading>
                    <HStack><Badge colorPalette={badgeColor(business.subscription_tier)}>{business.subscription_tier || "Starter"}</Badge><Badge colorPalette={badgeColor(business.status)}>{business.status || "Active"}</Badge></HStack>
                  </Flex>
                  <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
                    <Box><Text mb="1" fontSize="sm">Salon/Business Name</Text><Input value={business.salon_name} onChange={(e) => setBusiness({ ...business, salon_name: e.target.value })} disabled={saving} /></Box>
                    <Box><Text mb="1" fontSize="sm">Business Email</Text><Input type="email" value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} disabled={saving} /></Box>
                    <Box><Text mb="1" fontSize="sm">Business Phone</Text><Input value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} disabled={saving} /></Box>
                    <Box><Text mb="1" fontSize="sm">Address</Text><Input value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} disabled={saving} /></Box>
                  </Grid>
                  {business.subdomain_url && (
                    <Box><Text mb="1" fontSize="sm">Subdomain URL</Text>
                      <HStack><Input value={business.subdomain_url} disabled /><Button variant="outline" onClick={async () => { await navigator.clipboard.writeText(business.subdomain_url || ""); toaster.create({ title: "Copied", type: "success" }); }}><LuCopy /> Copy</Button></HStack>
                    </Box>
                  )}
                  <Flex justify="flex-end"><Button type="submit" loading={saving}>Save Changes</Button></Flex>
                </Stack>
              </form>
            </Card.Body></Card.Root>
          </Tabs.Content>

          <Tabs.Content value="activity">
            <Card.Root><Card.Body>
              <Heading size="md" mb="4">Recent Activity</Heading>
              <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
                <Box><Text fontSize="sm" color="fg.muted">Total Appointments (This Month)</Text><Text fontSize="2xl" fontWeight="bold">{activity.totalAppointments}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted">Total Revenue (This Month)</Text><Text fontSize="2xl" fontWeight="bold">₦{activity.totalRevenue.toLocaleString()}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted">Pending Actions</Text><Text fontSize="2xl" fontWeight="bold">{activity.pendingActions}</Text></Box>
                <Box><Text fontSize="sm" color="fg.muted">Account Status</Text><Text fontWeight="medium" textTransform="capitalize">{business.status || "Active"}</Text></Box>
              </SimpleGrid>
            </Card.Body></Card.Root>
          </Tabs.Content>
        </Tabs.Root>
      </Stack>
    </Container>
  );
}
