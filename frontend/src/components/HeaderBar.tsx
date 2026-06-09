"use client";

import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { haptic } from "@/lib/telegram";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { CartDrawer } from "./CartDrawer";
import type { Store } from "@/lib/api";

export function HeaderBar({ store }: { store: Store }) {
  const { t, locale } = useI18n();
  const cart = useCart();

  return (
    <>
      <header className="sticky top-0 z-30 safe-top bg-midnight-950/85 backdrop-blur-xl border-b border-gold-300/10">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          {store.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo_url} alt={store.store_name} className="w-9 h-9 rounded-full border border-gold-300/30 object-cover" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gold-gradient flex items-center justify-center text-midnight-950 font-bold">
              {store.store_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className={`font-semibold text-white truncate ${locale === "am" ? "font-amharic" : ""}`}>
              {store.store_name}
            </h1>
            {store.description && (
              <p className={`text-[11px] text-white/40 truncate ${locale === "am" ? "font-amharic" : ""}`}>
                {store.description}
              </p>
            )}
          </div>
          <LanguageSwitcher />
          <button
            onClick={() => { haptic("light"); cart.setOpen(true); }}
            className="relative w-10 h-10 rounded-full border border-gold-300/30 flex items-center justify-center text-gold-200 hover:bg-gold-300/10 transition-colors"
            aria-label={t("cart")}
          >
            <span aria-hidden>🛍</span>
            {cart.count > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 rounded-full bg-gold-gradient text-midnight-950 text-[11px] font-bold flex items-center justify-center">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </header>
      <CartDrawer />
    </>
  );
}
