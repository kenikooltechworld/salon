import { Heading, Text, VStack } from "@chakra-ui/react";
import { Logo } from "@/components/brand/Logo";

interface Props {
  title: string;
  subtitle?: string;
}

export function AuthHeader({ title, subtitle }: Props) {
  return (
    <VStack gap="3" mb="6" textAlign="center">
      <Logo to="/" showText={false} size="md" />
      <Heading size="xl">{title}</Heading>
      {subtitle && <Text color="fg.muted">{subtitle}</Text>}
    </VStack>
  );
}
