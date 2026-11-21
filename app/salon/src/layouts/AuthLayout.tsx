import { Outlet } from "react-router-dom";
import { Center, Container, VStack } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function AuthLayout() {
  return (
    <VStack minH="100vh" gap="0" align="stretch">
      <Navbar />
      <Center as="main" flex="1" pt="16" px="4" py="8">
        <Container maxW="md">
          <Outlet />
        </Container>
      </Center>
      <LandingFooter />
    </VStack>
  );
}

export default AuthLayout;