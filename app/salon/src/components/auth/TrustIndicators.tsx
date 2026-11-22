import { HStack, Text, Box } from "@chakra-ui/react";
import { motion } from "motion/react";
import { LuLock, LuShieldCheck, LuCircleCheck } from "react-icons/lu";

export function TrustIndicators() {
  const indicators = [
    { icon: LuLock, label: "Secure Login" },
    { icon: LuShieldCheck, label: "SSL Encrypted" },
    { icon: LuCircleCheck, label: "Data Protected" },
  ];

  return (
    <Box
      as={motion.div}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      // @ts-expect-error motion props
      transition={{ delay: 0.3, duration: 0.5 }}
      borderTopWidth="1px"
      mt="6"
      pt="6"
    >
      <HStack justify="center" gap="6" flexWrap="wrap">
        {indicators.map((item) => (
          <HStack key={item.label} gap="2" color="fg.muted" fontSize="xs">
            <item.icon size={16} />
            <Text>{item.label}</Text>
          </HStack>
        ))}
      </HStack>
    </Box>
  );
}
