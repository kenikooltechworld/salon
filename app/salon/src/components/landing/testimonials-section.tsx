import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Box, Card, Container, Heading, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { StarIcon } from "@/components/icons";
import { api } from "@/lib/api";

interface Testimonial { customer_name: string; rating: number; review: string; created_at: string; }

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get("/public/bookings/testimonials?limit=6");
        setTestimonials(res.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch testimonials");
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <Box as="section" id="testimonials" py={{ base: 20, sm: 32 }} bg="bg.subtle">
        <Container maxW="7xl" textAlign="center">
          <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }} mb={16}>Loved by Business Owners</Heading>
          <Spinner />
        </Container>
      </Box>
    );
  }
  if (error || testimonials.length === 0) return null;

  return (
    <Box as="section" id="testimonials" py={{ base: 20, sm: 32 }} bg="bg.subtle">
      <Container maxW="7xl">
        <VStack mb={16} gap={4} textAlign="center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }}>Loved by Business Owners</Heading>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Text fontSize="lg" color="fg.muted" maxW="2xl">See what our customers have to say about Kenikool</Text>
          </motion.div>
        </VStack>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <Swiper modules={[Navigation, Pagination, Autoplay]} spaceBetween={24} slidesPerView={1} navigation pagination={{ clickable: true }} autoplay={{ delay: 5000, disableOnInteraction: false }} breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }} className="pb-12">
            {testimonials.map((t, idx) => (
              <SwiperSlide key={t.customer_name + idx}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}>
                  <Card.Root h="full">
                    <Card.Body>
                      <HStack gap={1} mb={4}>
                        {Array.from({ length: t.rating }).map((_, i) => <StarIcon key={i} size={18} className="text-yellow-400 fill-yellow-400" />)}
                      </HStack>
                      <Text mb={4} fontStyle="italic">"{t.review}"</Text>
                      <Text fontWeight="semibold">{t.customer_name}</Text>
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