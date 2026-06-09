"use client";

import { ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { TelegramProvider } from "./TelegramProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TelegramProvider>
      <I18nProvider>
        <CartProvider>{children}</CartProvider>
      </I18nProvider>
    </TelegramProvider>
  );
}
