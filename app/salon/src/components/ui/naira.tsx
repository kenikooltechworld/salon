import { Text, type TextProps } from "@chakra-ui/react";
import { useSettingsStore } from "@/features/settings/store";

const CURRENCY_CONFIG: Record<string, { symbol: string; locale: string }> = {
  NGN: { symbol: "₦", locale: "en-NG" },
  USD: { symbol: "$", locale: "en-US" },
  EUR: { symbol: "€", locale: "de-DE" },
  GBP: { symbol: "£", locale: "en-GB" },
  ZAR: { symbol: "R", locale: "en-ZA" },
  KES: { symbol: "KSh", locale: "en-KE" },
  GHS: { symbol: "GH₵", locale: "en-GH" },
};

export function getCurrencyConfig(currency?: string | null) {
  const code = (currency || "NGN").toUpperCase();
  return CURRENCY_CONFIG[code] ?? { symbol: `${code} `, locale: "en-US" };
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency?: string | null,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
) {
  const n = Number(value ?? 0);
  const amount = Number.isFinite(n) ? n : 0;
  const { symbol, locale } = getCurrencyConfig(currency);
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  })}`;
}

export function formatNaira(
  value: number | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
) {
  return formatCurrency(value, "NGN", options);
}

export function useCurrency() {
  return useSettingsStore((s) => s.settings?.currency || "NGN");
}

interface CurrencyProps extends Omit<TextProps, "children"> {
  value: number | string | null | undefined;
  currency?: string | null;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export function Currency({ value, currency, minimumFractionDigits, maximumFractionDigits, ...props }: CurrencyProps) {
  const storeCurrency = useCurrency();
  const code = currency ?? storeCurrency;
  return <Text as="span" {...props}>{formatCurrency(value, code, { minimumFractionDigits, maximumFractionDigits })}</Text>;
}

export function Naira({ value, minimumFractionDigits, maximumFractionDigits, ...props }: Omit<CurrencyProps, "currency">) {
  const currency = useCurrency();
  return <Text as="span" {...props}>{formatCurrency(value, currency, { minimumFractionDigits, maximumFractionDigits })}</Text>;
}
