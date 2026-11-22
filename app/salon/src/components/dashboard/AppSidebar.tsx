import { NavLink } from "react-router-dom";
import { Box, Button, Drawer, HStack, IconButton, Text, Tooltip, VStack } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuLogOut } from "react-icons/lu";
import { Logo } from "@/components/brand/Logo";

export interface SidebarItem {
  label: string;
  to: string;
  icon: IconType;
}

interface Props {
  items: SidebarItem[];
  subtitle?: string;
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onLogout: () => void;
}

function SidebarBody({ items, subtitle, collapsed, onNavigate, onLogout }: {
  items: SidebarItem[]; subtitle?: string; collapsed: boolean; onNavigate?: () => void; onLogout: () => void;
}) {
  return (
    <VStack align="stretch" h="full" p="3" gap="3">
      <HStack justify={collapsed ? "center" : "flex-start"} px={collapsed ? 0 : 1} minH="10">
        <Logo to="/dashboard" showText={!collapsed} size="sm" />
      </HStack>
      {!collapsed && subtitle && <Text fontSize="sm" color="fg.muted" px="2" lineClamp="1">{subtitle}</Text>}
      <VStack align="stretch" gap="1" flex="1" overflowY="auto" overflowX="hidden">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}>
            {({ isActive }) => {
              const content = (
                <HStack px="3" py="2" rounded="md" justify={collapsed ? "center" : "flex-start"} bg={isActive ? "brand.500/15" : "transparent"} color={isActive ? "brand.600" : "fg.muted"} _hover={{ bg: "bg.muted", color: "fg" }} overflow="hidden">
                  <Box as={item.icon} flexShrink="0" fontSize="lg" />
                  {!collapsed && <Text fontSize="sm" fontWeight={isActive ? "semibold" : "medium"} lineClamp="1">{item.label}</Text>}
                </HStack>
              );
              return collapsed ? <Tooltip.Root openDelay={200}><Tooltip.Trigger asChild>{content}</Tooltip.Trigger><Tooltip.Positioner><Tooltip.Content>{item.label}</Tooltip.Content></Tooltip.Positioner></Tooltip.Root> : content;
            }}
          </NavLink>
        ))}
      </VStack>
      {collapsed ? (
        <Tooltip.Root openDelay={200}><Tooltip.Trigger asChild>
          <IconButton aria-label="Logout" variant="outline" onClick={onLogout}><LuLogOut /></IconButton>
        </Tooltip.Trigger><Tooltip.Positioner><Tooltip.Content>Logout</Tooltip.Content></Tooltip.Positioner></Tooltip.Root>
      ) : (
        <Button variant="outline" justifyContent="flex-start" onClick={onLogout}><LuLogOut /> Logout</Button>
      )}
    </VStack>
  );
}

export function AppSidebar({ items, subtitle, isDesktop, open, onOpenChange, collapsed, onLogout }: Props) {
  if (isDesktop) {
    return (
      <Box bg="bg.panel" h="full" minW="0" overflow="hidden">
        <SidebarBody items={items} subtitle={subtitle} collapsed={collapsed} onLogout={onLogout} />
      </Box>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="start">
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content maxW="280px">
          <Drawer.Body p="0">
            <SidebarBody items={items} subtitle={subtitle} collapsed={false} onNavigate={() => onOpenChange(false)} onLogout={onLogout} />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
