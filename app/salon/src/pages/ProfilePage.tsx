import { useEffect, useState } from "react";
import { Alert, Badge, Box, Button, Card, Container, Flex, Grid, Heading, HStack, Input, SimpleGrid, Skeleton, Stack, Switch, Tabs, Text } from "@chakra-ui/react";
import { LuBell, LuBuilding2, LuCopy, LuLock, LuShield, LuTrendingUp, LuUser } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import { authApi, authService } from "@/features/auth";
import { toaster } from "@/components/ui/toaster";

interface OwnerProfile { id: string; email: string; firstName: string; lastName: string; phone: string; role: string; roleNames: string[]; tenantId: string; }
interface BusinessProfile { salon_name: string; email: string; phone: string; address: string; subdomain?: string; subdomain_url?: string | null; subscription_tier?: string; status?: string; description?: string | null; }
interface ActivityStats { totalAppointments: number; totalRevenue: number; totalCustomers: number; pendingActions: number; }

export default function ProfilePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"profile" | "business" | "activity" | "notifications" | "security">("profile");
  const [profile, setProfile] = useState<OwnerProfile>({ id: "", email: "", firstName: "", lastName: "", phone: "", role: "", roleNames: [], tenantId: "" });
  const [business, setBusiness] = useState<BusinessProfile>({ salon_name: "", email: "", phone: "", address: "" });
  const [activity, setActivity] = useState<ActivityStats>({ totalAppointments: 0, totalRevenue: 0, totalCustomers: 0, pendingActions: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notifications, setNotifications] = useState({ email: true, sms: false, marketing: false });

  useEffect(() => { void fetchProfile(); void fetchBusiness(); void fetchActivity(); }, []);

  const fetchProfile = async () => {
    try {
      const res = await authApi.me();
      const u = res.data.user || res.data;
      setProfile({ id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, phone: u.phone || "", role: u.role, roleNames: [u.role], tenantId: u.tenant_id });
    } catch { setError("Failed to load profile"); } finally { setLoading(false); }
  };
  const fetchBusiness = async () => {
    try {
      const res = await authApi.getSettings();
      const s = res.data.data || res.data;
      setBusiness({ salon_name: s.salon_name || s.name || "", email: s.email || "", phone: s.phone || "", address: s.address || "", subdomain: s.subdomain, subdomain_url: s.subdomain_url, subscription_tier: s.subscription_tier, status: s.status, description: s.description });
    } catch (err) { console.error("Failed to load business settings:", err); }
  };
  const fetchActivity = async () => {
    try {
      const [metricsRes, pendingRes] = await Promise.all([authApi.dashboardMetrics(), authApi.dashboardPendingActions()]);
      const m = metricsRes.data.data || metricsRes.data; const p = pendingRes.data.data || pendingRes.data;
      setActivity({ totalAppointments: m.appointments?.thisMonth || 0, totalRevenue: m.revenue?.current || 0, totalCustomers: 0, pendingActions: p.total || 0 });
    } catch (err) { console.error("Failed to load activity stats:", err); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await authApi.updateMe({ first_name: profile.firstName, last_name: profile.lastName, phone: profile.phone });
      await authService.loadSession();
      setSuccess("Profile updated successfully");
      toaster.create({ title: "Success", description: "Profile updated successfully", type: "success" });
    } catch (err: any) {
      const message = err?.response?.data?.detail || err.message || "Failed to update profile";
      setError(message); toaster.create({ title: "Error", description: message, type: "error" });
    } finally { setSaving(false); }
  };
  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try {
      await authApi.updateSettings({ salon_name: business.salon_name, email: business.email, phone: business.phone, address: business.address });
      setSuccess("Business profile updated successfully");
      toaster.create({ title: "Success", description: "Business profile updated successfully", type: "success" });
    } catch (err: any) {
      const message = err?.response?.data?.detail || err.message || "Failed to update business profile";
      setError(message); toaster.create({ title: "Error", description: message, type: "error" });
    } finally { setSaving(false); }
  };

  const getSubscriptionBadge = () => ({ starter: "gray", professional: "blue", enterprise: "purple" }[business.subscription_tier || "starter"] || "gray");
  const getStatusBadge = () => ({ active: "green", inactive: "red", trial: "yellow" }[business.status || "active"] || "green");

  if (loading) return <Container maxW="6xl" py="8"><Stack gap="4"><Skeleton h="10" w="64" /><SimpleGrid columns={{ base: 1, md: 3 }} gap="4">{[0,1,2].map(i => <Skeleton key={i} h="28" />)}</SimpleGrid><Skeleton h="96" /></Stack></Container>;

  return (
    <Container maxW="6xl" py="6"><Stack gap="6">
      <Box><Heading size="xl">My Profile</Heading><Text color="fg.muted">Manage your personal and business profile</Text></Box>
      {error && <Alert.Root status="error"><Alert.Indicator /><Alert.Description>{error}</Alert.Description></Alert.Root>}
      {success && <Alert.Root status="success"><Alert.Indicator /><Alert.Description>{success}</Alert.Description></Alert.Root>}

      <SimpleGrid columns={{ base: 1, md: 3 }} gap="4">
        <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="blue.subtle" rounded="lg"><LuTrendingUp /></Box><Box><Text fontSize="sm" color="fg.muted">Revenue (This Month)</Text><Text fontSize="2xl" fontWeight="bold">₦{activity.totalRevenue.toLocaleString()}</Text></Box></HStack></Card.Body></Card.Root>
        <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="green.subtle" rounded="lg"><LuUser /></Box><Box><Text fontSize="sm" color="fg.muted">Appointments</Text><Text fontSize="2xl" fontWeight="bold">{activity.totalAppointments}</Text></Box></HStack></Card.Body></Card.Root>
        <Card.Root><Card.Body><HStack gap="3"><Box p="3" bg="yellow.subtle" rounded="lg"><LuBell /></Box><Box><Text fontSize="sm" color="fg.muted">Pending Actions</Text><Text fontSize="2xl" fontWeight="bold">{activity.pendingActions}</Text></Box></HStack></Card.Body></Card.Root>
      </SimpleGrid>

      <Tabs.Root value={activeTab} onValueChange={(e) => setActiveTab(e.value as any)}>
        <Tabs.List>
          <Tabs.Trigger value="profile"><LuUser /> Personal Profile</Tabs.Trigger>
          <Tabs.Trigger value="business"><LuBuilding2 /> Business Profile</Tabs.Trigger>
          <Tabs.Trigger value="activity"><LuTrendingUp /> Activity</Tabs.Trigger>
          <Tabs.Trigger value="notifications"><LuBell /> Notifications</Tabs.Trigger>
          <Tabs.Trigger value="security"><LuShield /> Security</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile">
          <Card.Root><Card.Body><form onSubmit={handleUpdateProfile}><Stack gap="4">
            <Heading size="md">Personal Information</Heading>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
              <Box><Text mb="1" fontSize="sm">First Name</Text><Input value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} disabled={saving} /></Box>
              <Box><Text mb="1" fontSize="sm">Last Name</Text><Input value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} disabled={saving} /></Box>
            </Grid>
            <Box><Text mb="1" fontSize="sm">Email Address</Text><Input type="email" value={profile.email} disabled /><Text fontSize="xs" color="fg.muted">Email cannot be changed here. Use Account Settings to change email.</Text></Box>
            <Box><Text mb="1" fontSize="sm">Phone Number</Text><Input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} disabled={saving} /></Box>
            <Box><Text mb="1" fontSize="sm">Role</Text><Input value={profile.roleNames?.join(", ") || profile.role} disabled /></Box>
            <Flex justify="flex-end"><Button type="submit" loading={saving}>{saving ? "Saving..." : "Save Changes"}</Button></Flex>
          </Stack></form></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="business">
          <Card.Root><Card.Body><form onSubmit={handleUpdateBusiness}><Stack gap="4">
            <Flex justify="space-between" align="center" wrap="wrap" gap="2">
              <Heading size="md">Business Information</Heading>
              <HStack><Badge colorPalette={getSubscriptionBadge()}>{business.subscription_tier || "Starter"}</Badge><Badge colorPalette={getStatusBadge()}>{business.status || "Active"}</Badge></HStack>
            </Flex>
            <Grid templateColumns={{ base: "1fr", md: "repeat(2,1fr)" }} gap="4">
              <Box><Text mb="1" fontSize="sm">Salon/Business Name</Text><Input value={business.salon_name} onChange={(e) => setBusiness({ ...business, salon_name: e.target.value })} disabled={saving} /></Box>
              <Box><Text mb="1" fontSize="sm">Business Email</Text><Input type="email" value={business.email} onChange={(e) => setBusiness({ ...business, email: e.target.value })} disabled={saving} /></Box>
              <Box><Text mb="1" fontSize="sm">Business Phone</Text><Input type="tel" value={business.phone} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} disabled={saving} /></Box>
              <Box><Text mb="1" fontSize="sm">Address</Text><Input value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} disabled={saving} /></Box>
            </Grid>
            {business.subdomain_url && <Box><Text mb="1" fontSize="sm">Subdomain URL</Text><HStack><Input value={business.subdomain_url} disabled /><Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(business.subdomain_url || ""); toaster.create({ title: "Copied", description: "URL copied to clipboard", type: "success" }); } catch { toaster.create({ title: "Error", description: "Failed to copy URL", type: "error" }); } }}><LuCopy /> Copy</Button></HStack></Box>}
            <Flex justify="flex-end"><Button type="submit" loading={saving}>{saving ? "Saving..." : "Save Changes"}</Button></Flex>
          </Stack></form></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="activity">
          <Card.Root><Card.Body><Heading size="md" mb="4">Recent Activity</Heading><SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            <Box><Text fontSize="sm" color="fg.muted">Total Appointments (This Month)</Text><Text fontSize="2xl" fontWeight="bold">{activity.totalAppointments}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Total Revenue (This Month)</Text><Text fontSize="2xl" fontWeight="bold">₦{activity.totalRevenue.toLocaleString()}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Pending Actions</Text><Text fontSize="2xl" fontWeight="bold">{activity.pendingActions}</Text></Box>
            <Box><Text fontSize="sm" color="fg.muted">Account Status</Text><Text fontWeight="medium" textTransform="capitalize">{business.status || "Active"}</Text></Box>
          </SimpleGrid></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="notifications">
          <Card.Root><Card.Body><Stack gap="5">
            <Heading size="md">Notification Preferences</Heading>
            {[{k:"email",label:"Email notifications",desc:"Receive account and booking updates by email"},{k:"sms",label:"SMS notifications",desc:"Receive urgent updates by SMS"},{k:"marketing",label:"Marketing updates",desc:"Receive product news and promotions"}].map(n => (
              <Flex key={n.k} justify="space-between" align="center" gap="4">
                <Box><Text fontWeight="medium">{n.label}</Text><Text fontSize="sm" color="fg.muted">{n.desc}</Text></Box>
                <Switch.Root checked={(notifications as any)[n.k]} onCheckedChange={(e) => setNotifications({ ...notifications, [n.k]: e.checked })}><Switch.HiddenInput /><Switch.Control><Switch.Thumb /></Switch.Control></Switch.Root>
              </Flex>
            ))}
            <Text fontSize="xs" color="fg.muted">Notification preferences are saved locally until notification settings API is available.</Text>
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>

        <Tabs.Content value="security">
          <Card.Root><Card.Body><Stack gap="4">
            <Heading size="md">Security</Heading>
            <Flex justify="space-between" align="center" gap="4" wrap="wrap"><Box><Text fontWeight="medium">Password</Text><Text fontSize="sm" color="fg.muted">Change your account password.</Text></Box><Button variant="outline" onClick={() => navigate("/change-password")}><LuLock /> Change Password</Button></Flex>
            <Flex justify="space-between" align="center" gap="4" wrap="wrap"><Box><Text fontWeight="medium">Multi-factor authentication</Text><Text fontSize="sm" color="fg.muted">Manage MFA for your account.</Text></Box><Button variant="outline" onClick={() => navigate("/mfa")}><LuShield /> Manage MFA</Button></Flex>
          </Stack></Card.Body></Card.Root>
        </Tabs.Content>
      </Tabs.Root>
    </Stack></Container>
  );
}
