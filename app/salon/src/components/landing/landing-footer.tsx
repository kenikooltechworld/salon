import { Link as RouterLink } from "react-router-dom";
import { Box, Container, Grid, Heading, Text, VStack } from "@chakra-ui/react";

const CURRENT_YEAR = new Date().getFullYear();

export function LandingFooter() {

  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "Security", href: "#" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", to: "/about" },
        { label: "Blog", href: "#" },
        { label: "Contact", href: "#" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "#" },
        { label: "Terms", href: "#" },
        { label: "Cookies", href: "#" },
      ],
    },
    {
      title: "Follow",
      links: [
        { label: "Twitter", href: "#" },
        { label: "LinkedIn", href: "#" },
        { label: "Facebook", href: "#" },
      ],
    },
  ];

  return (
    <Box as="footer" bg="bg" borderTopWidth="1px" borderColor="border" py={{ base: 12, sm: 16 }}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid templateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap={{ base: 6, md: 8 }} mb={8}>
          {columns.map((col) => (
            <VStack key={col.title} align="flex-start" gap={2}>
              <Heading size="sm" mb={2} color="fg">
                {col.title}
              </Heading>
              <VStack align="flex-start" gap={2}>
                {col.links.map((link) => (
                  <Box key={link.label} color="fg.muted" fontSize={{ base: "xs", sm: "sm" }} _hover={{ color: "fg" }} transition="colors">
                    {link.to ? (
                      <Box asChild>
                        <RouterLink to={link.to}>{link.label}</RouterLink>
                      </Box>
                    ) : (
                      <Box asChild>
                        <a href={link.href}>{link.label}</a>
                      </Box>
                    )}
                  </Box>
                ))}
              </VStack>
            </VStack>
          ))}
        </Grid>
        <Box borderTopWidth="1px" borderColor="border" pt={8} textAlign="center">
          <Text fontSize={{ base: "xs", sm: "sm" }} color="fg.muted">
            &copy; {CURRENT_YEAR} Kenikool. All rights reserved.
          </Text>
        </Box>
      </Container>
    </Box>
  );
}

export default LandingFooter;