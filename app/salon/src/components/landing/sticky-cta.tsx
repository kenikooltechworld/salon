import { useState, useEffect } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Button, Card, CloseButton, Text } from "@chakra-ui/react";

export function StickyCTA() {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 500);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} style={{ position: "fixed", bottom: "1rem", right: "1rem", zIndex: 40, maxWidth: "20rem" }}>
          <Card.Root p={4}>
            <CloseButton position="absolute" top={2} right={2} onClick={() => setIsVisible(false)} />
            <Text fontWeight="semibold" mb={2}>Ready to get started?</Text>
            <Text fontSize="sm" color="fg.muted" mb={4}>Join thousands of businesses using Kenikool</Text>
            <Button asChild size="sm" w="full">
              <RouterLink to="/register">Start Free Trial</RouterLink>
            </Button>
          </Card.Root>
        </motion.div>
      )}
    </AnimatePresence>
  );
}