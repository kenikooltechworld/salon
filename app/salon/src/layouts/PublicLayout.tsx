import { Outlet } from "react-router-dom";
import { Box, Container, Flex } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function PublicLayout() {
  return (
    <Flex minH="100vh" flexDirection="column">
      <Navbar />
      <Box as="main" flex="1" pt="16">
        <Container maxW="7xl" py="4">
          <Outlet />
        </Container>
      </Box>
      <LandingFooter />
    </Flex>
  );
}

export default PublicLayout;