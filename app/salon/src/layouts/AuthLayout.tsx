import { Outlet } from "react-router-dom";
import { Box, Container, Flex } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";
import { ColorModeButton } from "@/components/ui/color-mode";

export function AuthLayout() {
  return (
    <Flex minH="100vh" direction="column" bg="bg">
      <Flex h="16" px={{ base: 4, md: 6 }} align="center" justify="space-between" borderBottomWidth="1px" bg="bg.panel">
        <Logo />
        <ColorModeButton />
      </Flex>
      <Box flex="1" bg={{ base: "bg", md: "bg.muted/30" }} py={{ base: 6, md: 10 }}>
        <Container maxW="lg"><Outlet /></Container>
      </Box>
    </Flex>
  );
}

export default AuthLayout;
