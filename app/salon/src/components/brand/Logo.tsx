import { HStack, Image, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";

interface Props {
  to?: string;
  showText?: boolean;
  size?: "sm" | "md";
}

export function Logo({ to = "/", showText = true, size = "md" }: Props) {
  const box = size === "sm" ? "8" : "9";
  return (
    <HStack asChild gap="2" textDecoration="none" flexShrink="0">
      <RouterLink to={to}>
        <Image src="/kenikool_salon_logo.png" alt="Kenikool" boxSize={box} objectFit="contain" />
        {showText && (
          <Text fontWeight="bold" fontSize={size === "sm" ? "md" : "lg"} display={{ base: "none", sm: "block" }}>
            Kenikool
          </Text>
        )}
      </RouterLink>
    </HStack>
  );
}
