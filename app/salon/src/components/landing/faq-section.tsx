import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Box, Container, Heading, HStack, Text, VStack } from "@chakra-ui/react";

const faqs = [
  { question: "Is there a free trial?", answer: "Yes! We offer a 30-day free trial with full access to all features. No credit card required." },
  { question: "Can I cancel anytime?", answer: "Absolutely. You can cancel your subscription at any time without any penalties or hidden fees." },
  { question: "Do you offer customer support?", answer: "Yes, we provide 24/7 customer support via email, chat, and phone for all plans." },
  { question: "Can I import my existing data?", answer: "Yes, we can help you import your existing customer and appointment data. Contact our support team." },
  { question: "Is my data secure?", answer: "We use enterprise-grade encryption and comply with international data protection standards." },
  { question: "Can I use Kenikool on mobile?", answer: "Yes, our mobile app is available on iOS and Android with full functionality." },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <Box as="section" py={{ base: 20, sm: 32 }} bg="bg.subtle">
      <Container maxW="3xl">
        <VStack textAlign="center" mb={16} gap={4}>
          <Heading fontSize={{ base: "3xl", sm: "4xl", md: "5xl" }}>Frequently Asked Questions</Heading>
          <Text fontSize="lg" color="fg.muted">Find answers to common questions about Kenikool</Text>
        </VStack>
        <VStack align="stretch" gap={4}>
          {faqs.map((faq, idx) => (
            <Box key={idx} borderWidth="1px" borderColor="border" rounded="lg" overflow="hidden">
              <Box as="button" w="full" px={6} py={4} onClick={() => setOpenIndex(openIndex === idx ? null : idx)} _hover={{ bg: "bg.muted" }}>
                <HStack justify="space-between">
                  <Text fontWeight="semibold" textAlign="left">{faq.question}</Text>
                  <Text color="purple.500" transform={openIndex === idx ? "rotate(180deg)" : "none"} transition="transform 0.2s">▼</Text>
                </HStack>
              </Box>
              <AnimatePresence>
                {openIndex === idx && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                    <Box px={6} py={4} bg="bg.muted" borderTopWidth="1px" borderColor="border">
                      <Text color="fg.muted">{faq.answer}</Text>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Box>
          ))}
        </VStack>
      </Container>
    </Box>
  );
}