import { Box } from "@chakra-ui/react";
import {
  HeroSection,
  HowItWorksSection,
  BenefitsSection,
  TestimonialsSection,
  PricingPreviewSection,
  FAQSection,
  CTASection,
  StickyCTA,
  FloatingCTA,
  ExitIntentPopup,
} from "@/components/landing";

export default function Home() {
  return (
    <Box minH="100vh" bg="bg" overflowX="hidden">
      <Box as="main" w="full">
        <Box as="section" id="hero" w="full">
          <HeroSection />
        </Box>
        <Box as="section" w="full">
          <HowItWorksSection />
        </Box>
        <Box as="section" w="full">
          <BenefitsSection />
        </Box>
        <Box as="section" id="testimonials" w="full">
          <TestimonialsSection />
        </Box>
        <Box as="section" id="pricing" w="full">
          <PricingPreviewSection />
        </Box>
        <Box as="section" w="full">
          <FAQSection />
        </Box>
        <Box as="section" w="full">
          <CTASection />
        </Box>
      </Box>

      <Box display={{ base: "none", sm: "block" }}>
        <StickyCTA />
        <FloatingCTA />
      </Box>
      <ExitIntentPopup />
    </Box>
  );
}