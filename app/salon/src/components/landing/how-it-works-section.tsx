import { motion } from "motion/react";
import { Box, Card, Container, Heading, Text, VStack } from "@chakra-ui/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const steps = [
  { number: "01", title: "Sign Up", description: "Create your account in minutes with no credit card required" },
  { number: "02", title: "Set Up Your Business", description: "Add your services, staff, and business information" },
  { number: "03", title: "Start Booking", description: "Begin accepting appointments from your customers" },
  { number: "04", title: "Grow Your Business", description: "Use analytics and insights to scale your operations" },
];

export function HowItWorksSection() {
  return (
    <Box as="section" py={{ base: 20, sm: 32 }} bg="bg.subtle">
      <Container maxW="7xl">
        <VStack mb={16} gap={4} textAlign="center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }}>How It Works</Heading>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Text fontSize="lg" color="fg.muted" maxW="2xl">Get started in 4 simple steps</Text>
          </motion.div>
        </VStack>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <Swiper modules={[Navigation, Pagination, Autoplay]} spaceBetween={24} slidesPerView={1} navigation pagination={{ clickable: true }} autoplay={{ delay: 5000, disableOnInteraction: false }} breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 4, spaceBetween: 24 } }} className="pb-12">
            {steps.map((step, idx) => (
              <SwiperSlide key={idx}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}>
                  <Card.Root h="full">
                    <Card.Body>
                      <Text fontSize="4xl" fontWeight="bold" color="purple.200" mb={4}>{step.number}</Text>
                      <Heading size="md" mb={2}>{step.title}</Heading>
                      <Text color="fg.muted" fontSize="sm">{step.description}</Text>
                    </Card.Body>
                  </Card.Root>
                </motion.div>
              </SwiperSlide>
            ))}
          </Swiper>
        </motion.div>
      </Container>
    </Box>
  );
}