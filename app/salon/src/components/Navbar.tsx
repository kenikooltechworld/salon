import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Center,
  Container,
  Flex,
  HStack,
  IconButton,
  Link,
  Separator,
  Spacer,
  Text,
  VStack,
} from "@chakra-ui/react";
import { LuMenu, LuX } from "react-icons/lu";
import { authService, useAuthStore } from "@/features/auth";
import { ColorModeButton } from "@/components/ui/color-mode";

export function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await authService.logout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);

  return (
    <Box as="nav" position="fixed" top="0" left="0" right="0" zIndex="50" bg="bg" borderBottomWidth="1px" borderColor="border" boxShadow="sm">
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Flex h="16" align="center" justify="space-between">
          <HStack asChild gap="2" textDecoration="none">
            <RouterLink to="/">
              <Center w="8" h="8" bgGradient="to-br" gradientFrom="blue.500" gradientTo="purple.500" rounded="lg">
                <Text color="white" fontWeight="bold" fontSize="lg">
                  K
                </Text>
              </Center>
              <Text fontWeight="bold" fontSize="lg" display={{ base: "none", sm: "block" }}>
                Kenikool
              </Text>
            </RouterLink>
          </HStack>

          <Spacer />

          {!user && (
            <HStack gap="8" display={{ base: "none", md: "flex" }}>
              <Link asChild color="fg.muted" _hover={{ color: "fg" }} fontSize="sm">
                <RouterLink to="/features">Features</RouterLink>
              </Link>
              <Link asChild color="fg.muted" _hover={{ color: "fg" }} fontSize="sm">
                <RouterLink to="/pricing">Pricing</RouterLink>
              </Link>
              <Link asChild color="fg.muted" _hover={{ color: "fg" }} fontSize="sm">
                <RouterLink to="/about">About</RouterLink>
              </Link>
            </HStack>
          )}

          <Spacer />

          <HStack gap="4" display={{ base: "none", md: "flex" }} align="center">
            <ColorModeButton />
            {user ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <RouterLink to="/dashboard">Dashboard</RouterLink>
                </Button>
                <Button onClick={handleLogout} size="sm">
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" size="sm">
                  <RouterLink to="/login">Sign In</RouterLink>
                </Button>
                <Button asChild size="sm">
                  <RouterLink to="/register">Get Started</RouterLink>
                </Button>
              </>
            )}
          </HStack>

          <HStack gap="2" display={{ base: "flex", md: "none" }} align="center">
            <ColorModeButton />
            <IconButton onClick={toggleMenu} aria-label="Toggle menu" variant="ghost" size="sm">
              {isMenuOpen ? <LuX size={24} /> : <LuMenu size={24} />}
            </IconButton>
          </HStack>
        </Flex>

        {isMenuOpen && (
          <Box borderTopWidth="1px" borderColor="border" bg="bg.panel" py="2">
            <VStack align="stretch" gap="1" px="2">
              {!user && (
                <>
                  <Link asChild display="block" px="3" py="2" rounded="md" fontSize="sm" color="fg.muted" _hover={{ color: "fg", bg: "bg.muted" }} onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/features">Features</RouterLink>
                  </Link>
                  <Link asChild display="block" px="3" py="2" rounded="md" fontSize="sm" color="fg.muted" _hover={{ color: "fg", bg: "bg.muted" }} onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/pricing">Pricing</RouterLink>
                  </Link>
                  <Link asChild display="block" px="3" py="2" rounded="md" fontSize="sm" color="fg.muted" _hover={{ color: "fg", bg: "bg.muted" }} onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/about">About</RouterLink>
                  </Link>
                    <Separator my="2" />
                </>
              )}
              {user ? (
                <>
                  <Button asChild variant="outline" size="sm" w="full" justifyContent="flex-start" onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/dashboard">Dashboard</RouterLink>
                  </Button>
                  <Box as="button" onClick={handleLogout} w="full" textAlign="left" px="3" py="2" rounded="md" fontSize="sm" color="red.500" _hover={{ bg: "red.50" }}>
                    Logout
                  </Box>
                </>
              ) : (
                <>
                  <Button asChild variant="outline" size="sm" w="full" justifyContent="flex-start" onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/login">Sign In</RouterLink>
                  </Button>
                  <Button asChild size="sm" w="full" justifyContent="flex-start" onClick={() => setIsMenuOpen(false)}>
                    <RouterLink to="/register">Get Started</RouterLink>
                  </Button>
                </>
              )}
            </VStack>
          </Box>
        )}
      </Container>
    </Box>
  );
}

export default Navbar;