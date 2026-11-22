import { Box, Heading, Text, VStack } from "@chakra-ui/react";
import { motion } from "motion/react";

interface AuthHeaderProps {
  title: string;
  subtitle: string;
  showLogo?: boolean;
}

export function AuthHeader({ title, subtitle, showLogo = true }: AuthHeaderProps) {
  return (
    <Box
      as={motion.div}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      // @ts-expect-error motion props
      transition={{ duration: 0.5 }}
      textAlign="center"
      mb="8"
    >
      {showLogo && (
        <Box display="flex" justifyContent="center" mb="4">
          <Box
            w="12"
            h="12"
            rounded="lg"
            bgGradient="to-br"
            gradientFrom="brand.500"
            gradientTo="purple.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            color="white"
            fontWeight="bold"
            fontSize="xl"
          >
            K
          </Box>
        </Box>
      )}
      <VStack gap="2">
        <Heading size="2xl">{title}</Heading>
        <Text color="fg.muted">{subtitle}</Text>
      </VStack>
    </Box>
  );
}
