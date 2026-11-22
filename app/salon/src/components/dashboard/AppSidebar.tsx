import { NavLink } from "react-router-dom";
import { Box, Button, Drawer, HStack, Text, VStack } from "@chakra-ui/react";
import type { IconType } from "react-icons";
import { LuLogOut } from "react-icons/lu";

export interface SidebarItem {
  label: string;
  to: string;
  icon: IconType;
}

interface Props {
  items: SidebarItem[];
  brand?: string;
  subtitle?: string;
  isDesktop: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout: () => void;
}

function SidebarBody({ items, brand = "Kenikool", subtitle, onNavigate, onLogout }: { items: SidebarItem[]; brand?: string; subtitle?: string; onNavigate?: () => void; onLogout: () => void }) {
  return (
    <VStack align="stretch" h="full" p="4" gap="4">
      <Box>
        <Text fontWeight="bold" fontSize="lg">{brand}</Text>
        {subtitle && <Text fontSize="sm" color="fg.muted">{subtitle}</Text>}
      </Box>
      <VStack align="stretch" gap="1" flex="1" overflowY="auto">
        {items.map((item) => (
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
      <Button variant="outline" justifyContent="flex-start" onClick={onLogout}>
        <LuLogOut /> Logout
      </Button>
    </VStack>
  );
}

export function AppSidebar({ items, brand, subtitle, isDesktop, open, onOpenChange, onLogout }: Props) {
  if (isDesktop) {
    return (
      <Box w="260px" borderRightWidth="1px" bg="bg.panel" position="sticky" top="0" h="100vh">
        <SidebarBody items={items} brand={brand} subtitle={subtitle} onLogout={onLogout} />
      </Box>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} placement="start">
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Body p="0">
            <SidebarBody items={items} brand={brand} subtitle={subtitle} onNavigate={() => onOpenChange(false)} onLogout={onLogout} />
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
