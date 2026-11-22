import { useEffect, useState } from "react";
import { Link as RouterLink, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Avatar, Box, Button, Container, Drawer, Flex, HStack, IconButton, Menu, Portal, Stack, Text } from "@chakra-ui/react";
import { LuLogOut, LuMenu, LuX } from "react-icons/lu";
import { authService, useAuthStore } from "@/features/auth";
import { ColorModeButton } from "@/components/ui/color-mode";
import { Logo } from "@/components/brand/Logo";

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const name = user ? `${user.first_name} ${user.last_name}`.trim() : "Account";
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <HStack as="button" gap="2" px="2" py="1" rounded="md" _hover={{ bg: "bg.muted" }}>
          <Avatar.Root size="sm"><Avatar.Fallback name={name} /></Avatar.Root>
          <Text fontSize="sm" fontWeight="medium" display={{ base: "none", md: "block" }} maxW="140px" lineClamp="1">{name}</Text>
        </HStack>
      </Menu.Trigger>
      <Portal><Menu.Positioner><Menu.Content minW="180px">
        <Menu.Item value="dashboard" asChild><RouterLink to="/dashboard">Dashboard</RouterLink></Menu.Item>
        <Menu.Item value="profile" asChild><RouterLink to="/profile">Profile</RouterLink></Menu.Item>
        <Menu.Separator />
        <Menu.Item value="logout" color="fg.error" onClick={() => { void authService.logout(); }}><LuLogOut /> Logout</Menu.Item>
      </Menu.Content></Menu.Positioner></Portal>
    </Menu.Root>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <Box as="header" position="sticky" top="0" zIndex="50" bg={scrolled ? "bg.panel/95" : "transparent"} backdropFilter={scrolled ? "blur(12px)" : "none"} borderBottomWidth={scrolled ? "1px" : "0"} transition="all 0.2s">
      <Container maxW="7xl">
        <Flex h="16" align="center" justify="space-between" gap="4">
          <Logo />
          <HStack gap="6" display={{ base: "none", md: "flex" }}>
            {NAV_LINKS.map((item) => (
              <RouterNavLink key={item.href} to={item.href}>
                {({ isActive }) => <Text fontSize="sm" fontWeight="medium" color={isActive ? "brand.600" : "fg.muted"} _hover={{ color: "brand.600" }}>{item.label}</Text>}
              </RouterNavLink>
            ))}
          </HStack>
          <HStack gap="2">
            <ColorModeButton />
            {isAuthenticated ? <Box display={{ base: "none", md: "block" }}><UserMenu /></Box> : (
              <HStack display={{ base: "none", md: "flex" }}>
                <Button asChild variant="ghost" size="sm"><RouterLink to="/auth/login">Log in</RouterLink></Button>
                <Button asChild size="sm"><RouterLink to="/auth/register">Get Started</RouterLink></Button>
              </HStack>
            )}
            <IconButton aria-label="Open menu" variant="ghost" display={{ base: "inline-flex", md: "none" }} onClick={() => setMobileOpen(true)}><LuMenu /></IconButton>
          </HStack>
        </Flex>
      </Container>

      <Drawer.Root open={mobileOpen} onOpenChange={(e) => setMobileOpen(e.open)} placement="end">
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content maxW="xs">
            <Drawer.Header borderBottomWidth="1px"><Drawer.Title><Logo size="sm" /></Drawer.Title></Drawer.Header>
            <Drawer.Body py="4">
              <Stack gap="1">
                {NAV_LINKS.map((item) => (
                  <RouterNavLink key={item.href} to={item.href}>
                    {({ isActive }) => <Box px="3" py="2" rounded="md" bg={isActive ? "brand.500/10" : "transparent"} color={isActive ? "brand.600" : "fg"}>{item.label}</Box>}
                  </RouterNavLink>
                ))}
              </Stack>
              <Stack mt="6" gap="2">
                {isAuthenticated ? (
                  <>
                    <Button asChild variant="outline"><RouterLink to="/dashboard">Dashboard</RouterLink></Button>
                    <Button variant="ghost" onClick={() => { void authService.logout(); }}>Logout</Button>
                  </>
                ) : (
                  <>
                    <Button asChild variant="outline"><RouterLink to="/auth/login">Log in</RouterLink></Button>
                    <Button asChild><RouterLink to="/auth/register">Get Started</RouterLink></Button>
                  </>
                )}
              </Stack>
            </Drawer.Body>
            <Drawer.CloseTrigger asChild position="absolute" top="3" right="3"><IconButton aria-label="Close menu" variant="ghost" size="sm"><LuX /></IconButton></Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </Box>
  );
}
