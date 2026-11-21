import { Outlet } from "react-router-dom";
import { Container, HStack, VStack } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function StaffLayout() {
  return (
    <VStack minH="100vh" gap="0" align="stretch">
      <Navbar />
      <HStack as="main" flex="1" pt="16" p="4" align="stretch">
        <Container maxW="7xl" flex="1">
          <Outlet />
        </Container>
      </HStack>
      <LandingFooter />
    </VStack>
  );
}

export default StaffLayout;