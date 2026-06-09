import { type Locale } from "./i18n";

// Format a number as ETB. Amharic locale uses "ብር" suffix; English uses "ETB" or "Br".
export function formatETB(amount: number, locale: Locale = "en"): string {
  const n = new Intl.NumberFormat(locale === "am" ? "am-ET" : "en-ET", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  if (locale === "am") return `${n} ብር`;
  return `${n} ETB`;
}

export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("251")) return `+${digits}`;
  if (digits.startsWith("0"))   return `+251${digits.slice(1)}`;
  if (digits.length === 9)      return `+251${digits}`;
  return `+${digits}`;
}
