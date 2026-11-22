import { Link as RouterLink } from "react-router-dom";
import { motion } from "motion/react";
import { Button, HStack } from "@chakra-ui/react";

export function FloatingCTA() {
  return (
    <motion.div style={{ position: "fixed", bottom: "1rem", left: "1rem", zIndex: 40 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <HStack gap={2}>
        <motion.a href="https://wa.me/1234567890" target="_blank" rel="noopener noreferrer" style={{ width: "3.5rem", height: "3.5rem", background: "#22c55e", color: "white", borderRadius: "9999px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", boxShadow: "0 10px 15px rgba(0,0,0,0.1)" }} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.95 }}>
          ðŸ’¬
        </motion.a>
        <Button asChild size="sm" display={{ base: "none", sm: "inline-flex" }}>
          <RouterLink to="/auth/register">Start Free</RouterLink>
        </Button>
      </HStack>
    </motion.div>
  );
}
