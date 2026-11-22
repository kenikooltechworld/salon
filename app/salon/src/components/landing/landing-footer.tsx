import { Box, Container, Grid, Heading, Text, VStack, Link as ChakraLink } from "@chakra-ui/react";
import { motion } from "motion/react";
import { Link as RouterLink } from "react-router-dom";

const MotionVStack = motion.create(VStack);

const columns = [
  { title: "Product", links: [{ label: "Features", href: "#features" }, { label: "Pricing", href: "#pricing" }, { label: "Security", href: "#" }] },
  { title: "Company", links: [{ label: "About", to: "/about" }, { label: "Blog", href: "#" }, { label: "Contact", href: "#" }] },
  { title: "Legal", links: [{ label: "Privacy", href: "#" }, { label: "Terms", href: "#" }, { label: "Cookies", href: "#" }] },
  { title: "Follow", links: [{ label: "Twitter", href: "#" }, { label: "LinkedIn", href: "#" }, { label: "Facebook", href: "#" }] },
];

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <Box as="footer" bg="bg.panel" borderTopWidth="1px" borderColor="border" py={{ base: 12, sm: 16 }}>
      <Container maxW="7xl">
        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={{ base: 6, md: 8 }} mb={8}>
          {columns.map((col) => (
            <MotionVStack key={col.title} align="flex-start" gap={2} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Heading size="sm" mb={2}>{col.title}</Heading>
              <VStack align="flex-start" gap={2}>
                {col.links.map((link) => (
                  link.to ? (
                    <ChakraLink key={link.label} asChild color="fg.muted" fontSize={{ base: "xs", sm: "sm" }} _hover={{ color: "fg" }}>
                      <RouterLink to={link.to}>{link.label}</RouterLink>
                    </ChakraLink>
                  ) : (
                    <ChakraLink key={link.label} href={link.href} color="fg.muted" fontSize={{ base: "xs", sm: "sm" }} _hover={{ color: "fg" }}>
                      {link.label}
                    </ChakraLink>
                  )
                ))}
              </VStack>
            </MotionVStack>
          ))}
        </Grid>
        <Box borderTopWidth="1px" borderColor="border" pt={8} textAlign="center">
          <Text fontSize={{ base: "xs", sm: "sm" }} color="fg.muted">&copy; {year} Kenikool. All rights reserved.</Text>
        </Box>
      </Container>
    </Box>
  );
}