import type { ReactNode } from "react";
import { Container, HStack, VStack } from "@chakra-ui/react";
import Navbar from "@/components/Navbar";
import { LandingFooter } from "@/components/landing/landing-footer";

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <VStack minH="100vh" gap="0" align="stretch">
      <Navbar />
      <HStack as="main" flex="1" pt="16" p="4" align="stretch">
        <Container maxW="7xl" flex="1">
          {children}
        </Container>
      </HStack>
      <LandingFooter />
    </VStack>
  );
}
