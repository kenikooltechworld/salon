import { NavLink } from "react-router-dom";
import { Box, Button, Drawer, HStack, IconButton, Text, Tooltip, VStack } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuChevronLeft, LuChevronRight, LuLogOut } from "react-icons/lu";
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
  onCollapsedChange: (collapsed: boolean) => void;
  onLogout: () => void;
}

function SidebarBody({ items, subtitle, collapsed, onCollapsedChange, onNavigate, onLogout, showCollapse }: {
  items: SidebarItem[]; subtitle?: string; collapsed: boolean; onCollapsedChange: (v: boolean) => void; onNavigate?: () => void; onLogout: () => void; showCollapse: boolean;
}) {
  return (
    <VStack align="stretch" h="full" p="3" gap="3">
      <HStack justify={collapsed ? "center" : "space-between"} px={collapsed ? 0 : 1}>
        <Logo to="/dashboard" showText={!collapsed} size="sm" />
        {showCollapse && !collapsed && (
          <IconButton aria-label="Collapse sidebar" variant="ghost" size="sm" onClick={() => onCollapsedChange(true)}><LuChevronLeft /></IconButton>
        )}
        {showCollapse && collapsed && (
          <IconButton aria-label="Expand sidebar" variant="ghost" size="sm" onClick={() => onCollapsedChange(false)}><LuChevronRight /></IconButton>
        )}
      </HStack>
      {!collapsed && subtitle && <Text fontSize="sm" color="fg.muted" px="2">{subtitle}</Text>}
      <VStack align="stretch" gap="1" flex="1" overflowY="auto">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} onClick={onNavigate}>
            {({ isActive }) => {
              const content = (
                <HStack px="3" py="2" rounded="md" justify={collapsed ? "center" : "flex-start"} bg={isActive ? "brand.500/15" : "transparent"} color={isActive ? "brand.600" : "fg.muted"} _hover={{ bg: "bg.muted", color: "fg" }}>
                  <item.icon />
                  {!collapsed && <Text fontSize="sm" fontWeight={isActive ? "semibold" : "medium"}>{item.label}</Text>}
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

export function AppSidebar({ items, subtitle, isDesktop, open, onOpenChange, collapsed, onCollapsedChange, onLogout }: Props) {
  if (isDesktop) {
    return (
      <Box borderRightWidth="1px" bg="bg.panel" h="full" minW={collapsed ? "72px" : "220px"}>
        <SidebarBody items={items} subtitle={subtitle} collapsed={collapsed} onCollapsedChange={onCollapsedChange} onLogout={onLogout} showCollapse />
      </Box>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="start">
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content maxW="280px">
          <Drawer.Body p="0">
            <SidebarBody items={items} subtitle={subtitle} collapsed={false} onCollapsedChange={onCollapsedChange} onNavigate={() => onOpenChange(false)} onLogout={onLogout} showCollapse={false} />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
