import { motion } from "motion/react";
import { Box, Card, Container, Heading, Image, Text, VStack } from "@chakra-ui/react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import posImg from "@/assets/features/pos.jpg";
import bookingImg from "@/assets/features/users.jpg";
import clientImg from "@/assets/features/client.jpg";
import staffImg from "@/assets/features/staff.jpg";
import inventoryImg from "@/assets/features/inventory.jpg";
import analyticsImg from "@/assets/features/analytics.jpg";
import marketingImg from "@/assets/features/marketing.jpg";
import loyaltyImg from "@/assets/features/loyalty.jpg";
import packagesImg from "@/assets/features/packages.jpg";
import promoImg from "@/assets/features/promo.jpg";
import giftcardImg from "@/assets/features/giftcard.jpg";
import notificationImg from "@/assets/features/notification.jpg";

const features = [
  { title: "Point of Sale (POS)", description: "Fast, secure checkout with multiple payment methods", image: posImg },
  { title: "Online Booking", description: "Automated appointment booking with calendar sync", image: bookingImg },
  { title: "Client Management", description: "Build loyalty with customer profiles and history tracking", image: clientImg },
  { title: "Staff Management", description: "Manage team members, roles, and availability effortlessly", image: staffImg },
  { title: "Inventory Management", description: "Track stock levels and automate reordering", image: inventoryImg },
  { title: "Analytics & Reports", description: "Real-time insights into revenue, bookings, and trends", image: analyticsImg },
  { title: "Marketing Campaigns", description: "Email and SMS campaigns to engage customers", image: marketingImg },
  { title: "Loyalty Programs", description: "Reward repeat customers with points and discounts", image: loyaltyImg },
  { title: "Packages & Memberships", description: "Create and manage service packages and memberships", image: packagesImg },
  { title: "Promo Codes", description: "Generate and track promotional codes and discounts", image: promoImg },
  { title: "Gift Cards", description: "Sell and manage digital and physical gift cards", image: giftcardImg },
  { title: "Smart Notifications", description: "Real-time alerts for bookings, cancellations, and updates", image: notificationImg },
];

export function FeaturesSection() {
  return (
    <Box as="section" id="features" py={{ base: 20, sm: 32 }} bg="bg">
      <Container maxW="7xl">
        <VStack mb={16} gap={4} textAlign="center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }}>Everything You Need</Heading>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <Text fontSize="lg" color="fg.muted" maxW="2xl">Powerful features designed to streamline your business operations</Text>
          </motion.div>
        </VStack>
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
          <Swiper modules={[Navigation, Pagination, Autoplay]} spaceBetween={24} slidesPerView={1} navigation pagination={{ clickable: true }} autoplay={{ delay: 5000, disableOnInteraction: false }} breakpoints={{ 640: { slidesPerView: 2, spaceBetween: 20 }, 1024: { slidesPerView: 3, spaceBetween: 24 } }} className="pb-12">
            {features.map((feature, idx) => (
              <SwiperSlide key={idx}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }} viewport={{ once: true }}>
                  <Card.Root overflow="hidden" h="full">
                    <Box h="48" overflow="hidden">
                      <Image src={feature.image} alt={feature.title} w="full" h="full" objectFit="cover" />
                    </Box>
                    <Card.Body>
                      <Heading size="md" mb={2}>{feature.title}</Heading>
                      <Text color="fg.muted" fontSize="sm">{feature.description}</Text>
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