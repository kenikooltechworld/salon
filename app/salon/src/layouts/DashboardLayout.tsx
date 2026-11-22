import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Box, Button, Drawer, Flex, HStack, IconButton, Text, VStack, useBreakpointValue,
} from "@chakra-ui/react";
import { LuLayoutDashboard, LuUsers, LuScissors,  LuUser, LuMenu, LuLogOut, LuSettings, LuShield } from "react-icons/lu";
import { authService, useAuthStore } from "@/features/auth";
import { ColorModeButton } from "@/components/ui/color-mode";

const menu = [
  { icon: LuLayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: LuScissors, label: "Services", to: "/services" },
  { icon: LuUsers, label: "Customers", to: "/customers" },
  { icon: LuUser, label: "Profile", to: "/profile" },
  { icon: LuShield, label: "MFA", to: "/mfa" },
  { icon: LuSettings, label: "Change Password", to: "/change-password" },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  return (
    <VStack align="stretch" h="full" p="4" gap="4">
      <Box>
        <Text fontWeight="bold" fontSize="lg">Kenikool</Text>
        <Text fontSize="sm" color="fg.muted">{user?.first_name} {user?.last_name}</Text>
      </Box>
      <VStack align="stretch" gap="1" flex="1">
        {menu.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}>
            {({ isActive }) => (
              <HStack px="3" py="2" rounded="md" bg={isActive ? "brand.500/15" : "transparent"} color={isActive ? "brand.600" : "fg.muted"} _hover={{ bg: "bg.muted", color: "fg" }}>
                <item.icon />
                <Text fontSize="sm" fontWeight={isActive ? "semibold" : "medium"}>{item.label}</Text>
              </HStack>
            )}
          </NavLink>
        ))}
      </VStack>
      <Button variant="outline" justifyContent="flex-start" onClick={async () => { await authService.logout(); navigate("/auth/login"); }}>
        <LuLogOut /> Logout
      </Button>
    </VStack>
  );
}

export function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const isDesktop = useBreakpointValue({ base: false, lg: true });
  return (
    <Flex minH="100vh" bg="bg">
      {isDesktop ? (
        <Box w="260px" borderRightWidth="1px" bg="bg.panel" position="sticky" top="0" h="100vh">
          <SidebarContent />
        </Box>
      ) : (
        <Drawer.Root open={open} onOpenChange={(e) => setOpen(e.open)} placement="start">
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Body p="0"><SidebarContent onNavigate={() => setOpen(false)} /></Drawer.Body>
            </Drawer.Content>
          </Drawer.Positioner>
        </Drawer.Root>
      )}

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

