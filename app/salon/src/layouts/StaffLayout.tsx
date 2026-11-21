import { Outlet } from "react-router-dom";
import { Box } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

export function StaffLayout() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Box as="main" flex="1" pt="16" p="4">
        <Outlet />
      </Box>
      <LandingFooter />
    </Box>
  );
}

export default StaffLayout;