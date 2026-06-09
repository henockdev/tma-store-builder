"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";
import am from "@/locales/am.json";

export type Locale = "en" | "am";

// Extract the type of our translations directly from the JSON keys
type TranslationKeys = keyof typeof en;

// Enforce that both English and Amharic dictionaries strictly share the same structural keys
const dictionaries: Record<Locale, Record<TranslationKeys, string>> = { 
  en, 
  am: am as Record<TranslationKeys, string> 
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKeys) => string;
  dir: "ltr";
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("locale")) as Locale | null;
    if (stored === "en" || stored === "am") {
      setLocaleState(stored);
    } else {
      // Try to detect from Telegram WebApp language_code
      const tgLang = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
      if (tgLang && tgLang.toLowerCase().startsWith("am")) {
        setLocaleState("am");
      }
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", l);
      document.documentElement.lang = l;
    }
  };

  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] || dictionaries.en;
    
    return {
      locale,
      setLocale,
      t: (key: TranslationKeys) => {
        // Safe lookup: falls back to English value, then falls back to the key itself
        return dict[key] ?? en[key] ?? String(key);
      },
      dir: "ltr",
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}