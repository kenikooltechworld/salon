import { Box, Progress, Text, VStack, HStack } from "@chakra-ui/react";
import { calculatePasswordStrength, getPasswordRequirements } from "@/lib/utils/auth-validation";

interface Props {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ password, showRequirements = true }: Props) {
  const strength = calculatePasswordStrength(password);
  const req = getPasswordRequirements(password);
  if (!password) return null;
  const items = [
    { ok: req.length, label: "At least 8 characters" },
    { ok: req.uppercase, label: "One uppercase letter" },
    { ok: req.lowercase, label: "One lowercase letter" },
    { ok: req.number, label: "One number" },
  ];
  return (
    <VStack align="stretch" gap="2">
      <HStack justify="space-between">
        <Text fontSize="xs" color="fg.muted">Password Strength</Text>
        <Text fontSize="xs" fontWeight="semibold" color={`${strength.color}.500`}>{strength.label}</Text>
      </HStack>
      <Progress.Root value={strength.percentage} colorPalette={strength.color} size="xs">
        <Progress.Track><Progress.Range /></Progress.Track>
      </Progress.Root>
      {showRequirements && (
        <Box>
          <Text fontSize="xs" color="fg.muted" mb="1">Requirements:</Text>
          <VStack align="stretch" gap="1">
            {items.map((it) => (
              <HStack key={it.label} fontSize="xs" color={it.ok ? "fg" : "fg.muted"}>
                <Box w="4" h="4" rounded="full" bg={it.ok ? "green.500" : "bg.muted"} color="white" fontSize="10px" display="flex" alignItems="center" justifyContent="center">
                  {it.ok ? "✓" : "○"}
                </Box>
                <Text>{it.label}</Text>
              </HStack>
            ))}
          </VStack>
        </Box>
      )}
    </VStack>
  );
}
