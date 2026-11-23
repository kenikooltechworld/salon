import { Text, type TextProps } from "@chakra-ui/react";

export function formatNaira(value: number | string | null | undefined, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const n = Number(value ?? 0);
  const amount = Number.isFinite(n) ? n : 0;
  return `₦${amount.toLocaleString("en-NG", {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  })}`;
}

interface NairaProps extends Omit<TextProps, "children"> {
  value: number | string | null | undefined;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function Naira({ value, minimumFractionDigits, maximumFractionDigits, ...props }: NairaProps) {
  return <Text as="span" {...props}>{formatNaira(value, { minimumFractionDigits, maximumFractionDigits })}</Text>;
}
