import { Outlet } from "react-router-dom";
import { Container, Flex } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function DashboardLayout() {
  return (
    <Flex minH="100vh" flexDirection="column">
      <Navbar />
      <Flex as="main" flex="1" pt="16" p="4">
        <Container maxW="7xl" flex="1">
          <Outlet />
        </Container>
      </Flex>
      <LandingFooter />
    </Flex>
  );
}

export default DashboardLayout;