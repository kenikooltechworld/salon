import { Outlet } from "react-router-dom";
import { Container, VStack } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function PublicLayout() {
  return (
    <VStack minH="100vh" gap="0" align="stretch">
      <Navbar />
      <Container as="main" maxW="7xl" flex="1" pt="16" py="4">
        <Outlet />
      </Container>
      <LandingFooter />
    </VStack>
  );
}

export default PublicLayout;
