import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Avatar, Box, Flex, HStack, IconButton, Menu, Portal, Splitter, Text, useBreakpointValue } from "@chakra-ui/react";
import { LuLayoutDashboard, LuUsers, LuScissors, LuUser, LuMenu as LuMenuIcon, LuSettings, LuLogOut } from "react-icons/lu";
import { authService, useAuthStore } from "@/features/auth";
import { useTenantSettings } from "@/features/settings";
import { ColorModeButton } from "@/components/ui/color-mode";
import { AppSidebar, type SidebarItem } from "@/components/dashboard/AppSidebar";
import { Logo } from "@/components/brand/Logo";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNotificationStore } from "@/features/notifications";

const baseItems: (SidebarItem & { roles?: string[] })[] = [
  { icon: LuLayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: LuScissors, label: "Services", to: "/services", roles: ["owner", "admin", "manager", "staff"] },
  { icon: LuUsers, label: "Customers", to: "/customers", roles: ["owner", "admin", "manager", "staff"] },
  { icon: LuUser, label: "Profile", to: "/profile" },
  { icon: LuSettings, label: "Settings", to: "/settings", roles: ["owner", "admin"] },
];

const SIDEBAR_KEY = "dashboard.sidebar.size";
const COLLAPSE_AT = 12;

export function DashboardLayout() {
  useTenantSettings();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<number>(() => {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(SIDEBAR_KEY) : null;
    const n = raw ? Number(raw) : 20;
    return Number.isFinite(n) ? Math.min(35, Math.max(6, n)) : 20;
  });
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false;
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const collapsed = size <= COLLAPSE_AT;
  const items = useMemo(() => {
    const role = (user?.role || "").toLowerCase();
    return baseItems.filter((i) => !i.roles || i.roles.includes(role));
  }, [user?.role]);

  const connectRealtime = useNotificationStore((s) => s.connectRealtime);
  const disconnectRealtime = useNotificationStore((s) => s.disconnectRealtime);
  const loadNotifications = useNotificationStore((s) => s.load);

  useEffect(() => {
    connectRealtime();
    void loadNotifications({ reset: true });
    return () => disconnectRealtime();
  }, [connectRealtime, disconnectRealtime, loadNotifications]);

  useEffect(() => { window.localStorage.setItem(SIDEBAR_KEY, String(size)); }, [size]);

  const logout = async () => { await authService.logout(); navigate("/auth/login"); };
  const userName = user ? `${user.first_name} ${user.last_name}`.trim() : "Account";

  return (
    <Flex h="100dvh" bg="bg" overflow="hidden">
      {isDesktop ? (
        <Splitter.Root
          h="full"
          size={[size, 100 - size]}
          onResize={(e) => { const next = e.size[0]; if (next) setSize(Math.min(35, Math.max(6, next))); }}
          panels={[{ id: "sidebar", minSize: 6, maxSize: 35, collapsible: true, collapsedSize: 6 }, { id: "content", minSize: 60 }]}
        >
          <Splitter.Panel id="sidebar" h="full" minH="0" borderRightWidth="1px">
            <AppSidebar items={items} subtitle={userName} isDesktop open={open} onOpenChange={setOpen} collapsed={collapsed} onLogout={logout} />
          </Splitter.Panel>
          <Splitter.ResizeTrigger id="sidebar:content" w="2" bg="transparent" _hover={{ bg: "brand.500/30" }} _active={{ bg: "brand.500/40" }} />
          <Splitter.Panel id="content" h="full" minH="0">
            <Flex direction="column" h="full" minH="0" minW="0" overflow="hidden">
              <HStack h="16" px="4" borderBottomWidth="1px" bg="bg.panel" justify="space-between" position="sticky" top="0" zIndex="10">
                <HStack gap="3"><Logo to="/dashboard" showText={false} size="sm" /><Text fontWeight="semibold">Dashboard</Text></HStack>
                <HStack gap="2">
                  <ColorModeButton />
                  <NotificationBell />
                  <Menu.Root>
                    <Menu.Trigger asChild>
                      <HStack as="button" gap="2" px="2" py="1" rounded="md" _hover={{ bg: "bg.muted" }}>
                        <Avatar.Root size="sm"><Avatar.Fallback name={userName} /></Avatar.Root>
                        <Box textAlign="left" display={{ base: "none", md: "block" }}>
                          <Text fontSize="sm" fontWeight="medium" lineClamp="1">{userName}</Text>
                          <Text fontSize="xs" color="fg.muted" lineClamp="1">{user?.email}</Text>
                        </Box>
                      </HStack>
                    </Menu.Trigger>
                    <Portal><Menu.Positioner><Menu.Content>
                      <Menu.Item value="profile" onClick={() => navigate("/profile")}>Profile</Menu.Item>
                      <Menu.Item value="settings" onClick={() => navigate("/settings")}>Settings</Menu.Item>
                      <Menu.Item value="logout" onClick={logout} color="fg.error"><LuLogOut /> Logout</Menu.Item>
                    </Menu.Content></Menu.Positioner></Portal>
                  </Menu.Root>
                </HStack>
              </HStack>
              <Box flex="1" minH="0" overflowY="auto" p={{ base: 4, md: 6 }}><Outlet /></Box>
            </Flex>
          </Splitter.Panel>
        </Splitter.Root>
      ) : (
        <>
          <AppSidebar items={items} subtitle={userName} isDesktop={false} open={open} onOpenChange={setOpen} collapsed={false} onLogout={logout} />
          <Flex direction="column" flex="1" minH="0" minW="0" overflow="hidden">
            <HStack h="16" px="4" borderBottomWidth="1px" bg="bg.panel" justify="space-between" position="sticky" top="0" zIndex="10">
              <HStack gap="2">
                <IconButton aria-label="Open menu" variant="ghost" onClick={() => setOpen(true)}><LuMenuIcon /></IconButton>
                <Logo to="/dashboard" showText={false} size="sm" />
              </HStack>
              <HStack gap="2">
                <ColorModeButton />
                <NotificationBell />
                <Avatar.Root size="sm" onClick={() => navigate("/profile")} cursor="pointer"><Avatar.Fallback name={userName} /></Avatar.Root>
              </HStack>
            </HStack>
            <Box flex="1" minH="0" overflowY="auto" p={{ base: 4, md: 6 }}><Outlet /></Box>
          </Flex>
        </>
      )}
    </Flex>
  );
}

export default DashboardLayout;

