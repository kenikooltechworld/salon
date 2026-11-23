import { HStack, Image, Text } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import { useSettingsStore } from "@/features/settings/store";
import { useAuthStore } from "@/features/auth/store";

interface Props {
  to?: string;
  showText?: boolean;
  size?: "sm" | "md";
}

const DEFAULT_LOGO = "/kenikool_salon_logo.png";

export function Logo({ to = "/", showText = true, size = "md" }: Props) {
  const box = size === "sm" ? "8" : "9";
  const settingsLogo = useSettingsStore((s) => s.settings?.logo_url);
  const tenantLogo = useAuthStore((s) => s.tenant?.logo_url);
  const src = settingsLogo || tenantLogo || DEFAULT_LOGO;
  return (
    <HStack asChild gap="2" textDecoration="none" flexShrink="0">
      <RouterLink to={to}>
        <Image src={src} alt="Kenikool" boxSize={box} objectFit="cover" borderRadius="full" />
        {showText && (
          <Text fontWeight="bold" fontSize={size === "sm" ? "md" : "lg"} display={{ base: "none", sm: "block" }}>
            Kenikool
          </Text>
        )}
      </RouterLink>
    </HStack>
  );
}
