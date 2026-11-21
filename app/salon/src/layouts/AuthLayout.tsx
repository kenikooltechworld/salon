import { Outlet } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function AuthLayout() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box as="main" flex="1" pt="16" display="flex" alignItems="center" justifyContent="center" px="4" py="8">
        <Box w="full" maxW="md">
          <Outlet />
        </Box>
      </Box>
      <LandingFooter />
    </Box>
  );
}

export default AuthLayout;