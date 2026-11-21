import { motion } from "motion/react";
import { Box, Container, Grid, Heading, HStack, Image, Text, VStack } from "@chakra-ui/react";
import { CheckCircleIcon } from "@/components/icons";
import whyImage from "@/assets/why.jpg";

const benefits = [
  "Save 10+ hours per week on administrative tasks",
  "Reduce no-shows by 40% with automated reminders",
  "Increase revenue by 25% with better customer management",
  "Access 24/7 customer support",
  "Secure cloud backup of all your data",
  "Mobile app for on-the-go management",
  "Multi-location support",
  "Custom branding options",
];

export function BenefitsSection() {
  return (
    <Box as="section" py={{ base: 20, sm: 32 }} bg="bg">
      <Container maxW="7xl">
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={12} alignItems="center">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }} mb={6}>Why Choose Kenikool?</Heading>
            <Text fontSize="lg" color="fg.muted" mb={8}>Join thousands of salon, spa, and gym owners who have transformed their business with Kenikool.</Text>
            <VStack align="stretch" gap={4}>
              {benefits.map((benefit, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}>
                  <HStack align="start" gap={3}>
                    <Box color="purple.500" flexShrink={0} mt={0.5}><CheckCircleIcon className="w-6 h-6" /></Box>
                    <Text>{benefit}</Text>
                  </HStack>
                </motion.div>
              ))}
            </VStack>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Box rounded="lg" overflow="hidden" h="96">
              <Image src={whyImage} alt="Why Choose Kenikool" w="full" h="full" objectFit="cover" />
            </Box>
          </motion.div>
        </Grid>
      </Container>
    </Box>
  );
}