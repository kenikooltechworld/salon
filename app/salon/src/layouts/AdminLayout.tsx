import type { ReactNode } from "react";
import { Container, Flex } from "@chakra-ui/react";
import { Navbar } from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <Flex minH="100vh" flexDirection="column">
      <Navbar />
      <Flex as="main" flex="1" pt="16" p="4">
        <Container maxW="7xl" flex="1">
          {children}
        </Container>
      </Flex>
      <LandingFooter />
    </Flex>
  );
}