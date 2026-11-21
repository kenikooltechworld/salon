import { Link as RouterLink } from "react-router-dom";
import { motion } from "motion/react";
import { Box, Button, Container, Heading, Text } from "@chakra-ui/react";

export function CTASection() {
  return (
    <Box as="section" py={{ base: 20, sm: 32 }} bgGradient="to-r" gradientFrom="purple.600" gradientTo="pink.500" color="white" position="relative" overflow="hidden">
      <Container maxW="4xl" textAlign="center" position="relative" zIndex={10}>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }} mb={6}>Ready to Transform Your Business?</Heading>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} viewport={{ once: true }}>
          <Text fontSize={{ base: "lg", sm: "xl" }} mb={8} opacity={0.9}>Join thousands of salon, spa, and gym owners who are already using Kenikool</Text>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }}>
          <Button asChild size="lg" bg="white" color="purple.700" _hover={{ bg: "whiteAlpha.900" }}>
            <RouterLink to="/auth/register">Get Started Free</RouterLink>
          </Button>
        </motion.div>
      </Container>
    </Box>
  );
}