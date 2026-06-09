"use client";

import { useI18n, type Locale } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next: Locale = locale === "en" ? "am" : "en";

  return (
    <button
      onClick={() => { haptic("light"); setLocale(next); }}
      className={`chip-gold hover:bg-gold-300/20 transition-colors ${className}`}
      aria-label={t("language")}
    >
      <span className="text-base leading-none">{next === "en" ? "🇬🇧" : "🇪🇹"}</span>
      <span className="ml-2">{t(`lang_${next}` as any)}</span>
    </button>
  );
}
