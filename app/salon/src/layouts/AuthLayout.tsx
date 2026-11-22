import { Outlet } from "react-router-dom";
import { Box, Container } from "@chakra-ui/react";
import { motion } from "motion/react";

export function AuthLayout() {
  return (
    <Box minH="100vh" bgGradient="to-br" gradientFrom="brand.50" gradientTo="purple.50" _dark={{ gradientFrom: "gray.900", gradientTo: "gray.800" }} display="flex" alignItems="center" justifyContent="center" p="4">
      <Container maxW="2xl" p="0">
        <Box
          as={motion.div}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          // @ts-expect-error motion props
          transition={{ duration: 0.4 }}
        >
          <Outlet />
        </Box>
      </Container>
    </Box>
  );
}

export default AuthLayout;
