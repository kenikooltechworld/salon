import { HStack, Input, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}

export function VerificationCodeInput({ value, onChange, disabled, error }: Props) {
  const [digits, setDigits] = useState<string[]>(value.split("").slice(0, 6));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { setDigits(value.padEnd(0).split("").slice(0, 6)); }, [value]);

  const emit = (next: string[]) => { setDigits(next); onChange(next.join("")); };

  const handleChange = (i: number, v: string) => {
    if (!/^\d*$/.test(v)) return;
    const next = [...Array(6)].map((_, idx) => digits[idx] || "");
    next[i] = v.slice(-1);
    emit(next);
    if (v && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = [...Array(6)].map((_, i) => pasted[i] || "");
    emit(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <VStack gap="2" align="stretch">
      <Text fontSize="sm" fontWeight="medium">Verification Code</Text>
      <HStack justify="center" gap="2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            value={digits[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            disabled={disabled}
            maxLength={1}
            inputMode="numeric"
            textAlign="center"
            fontSize="lg"
            fontWeight="semibold"
            w="12"
            h="12"
            borderColor={error ? "red.500" : undefined}
          />
        ))}
      </HStack>
      {error && <Text fontSize="sm" color="red.500" textAlign="center">{error}</Text>}
    </VStack>
  );
}
