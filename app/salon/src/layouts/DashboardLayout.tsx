import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Box, Flex, HStack, IconButton, Text, useBreakpointValue } from "@chakra-ui/react";
import { LuLayoutDashboard, LuUsers, LuScissors, LuUser, LuMenu, LuSettings, LuShield } from "react-icons/lu";
import { authService, useAuthStore } from "@/features/auth";
import { ColorModeButton } from "@/components/ui/color-mode";
import { AppSidebar, type SidebarItem } from "@/components/dashboard/AppSidebar";

const items: SidebarItem[] = [
  { icon: LuLayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: LuScissors, label: "Services", to: "/services" },
  { icon: LuUsers, label: "Customers", to: "/customers" },
  { icon: LuUser, label: "Profile", to: "/profile" },
  { icon: LuShield, label: "MFA", to: "/mfa" },
  { icon: LuSettings, label: "Change Password", to: "/change-password" },
];

export function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const isDesktop = useBreakpointValue({ base: false, lg: true }) ?? false;
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <Flex minH="100vh" bg="bg">
      <AppSidebar
        items={items}
        brand="Kenikool"
        subtitle={user ? `${user.first_name} ${user.last_name}` : undefined}
        isDesktop={isDesktop}
        open={open}
        onOpenChange={setOpen}
        onLogout={async () => { await authService.logout(); navigate("/auth/login"); }}
      />
      <Flex direction="column" flex="1" minW="0">
        <HStack h="16" px="4" borderBottomWidth="1px" bg="bg.panel" justify="space-between" position="sticky" top="0" zIndex="10">
          {!isDesktop && <IconButton aria-label="Open menu" variant="ghost" onClick={() => setOpen(true)}><LuMenu /></IconButton>}
          <Text fontWeight="semibold">Dashboard</Text>
          <HStack><ColorModeButton /></HStack>
        </HStack>
        <Box flex="1" p={{ base: 4, md: 6 }}>
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
}

export default DashboardLayout;
