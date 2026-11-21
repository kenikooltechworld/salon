import { Outlet } from "react-router-dom";
import { Container, Flex } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function AuthLayout() {
  return (
    <Flex minH="100vh" flexDirection="column">
      <Navbar />
      <Flex as="main" flex="1" pt="16" align="center" justify="center" px="4" py="8">
        <Container maxW="md">
          <Outlet />
        </Container>
      </Flex>
      <LandingFooter />
    </Flex>
  );
}

export default AuthLayout;