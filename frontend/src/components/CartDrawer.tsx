"use client";

import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatETB } from "@/lib/format";
import { haptic, hapticError } from "@/lib/telegram";
import { CheckoutModal } from "./CheckoutModal";
import { useState } from "react";

export function CartDrawer() {
  const cart = useCart();
  const { t, locale } = useI18n();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (!cart.isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={() => { haptic("light"); cart.setOpen(false); }}
        aria-hidden
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-midnight-900 border-l border-gold-300/15 shadow-luxury flex flex-col animate-slide-up safe-top safe-bottom"
        role="dialog"
        aria-label={t("cart")}
      >
        <header className="px-5 py-4 flex items-center justify-between border-b border-gold-300/10">
          <div>
            <h2 className="text-lg font-semibold gold-text">{t("cart")}</h2>
            <p className="text-xs text-white/40">{cart.count} {t("qty")}</p>
          </div>
          <button
            onClick={() => { haptic("light"); cart.setOpen(false); }}
            className="text-white/60 hover:text-white text-2xl leading-none"
            aria-label={t("cancel")}
          >×</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cart.items.length === 0 && (
            <div className="text-center text-white/50 py-16">
              <div className="text-5xl mb-3">◇</div>
              <p>{t("empty_cart")}</p>
              <button
                onClick={() => { haptic("light"); cart.setOpen(false); }}
                className="btn-ghost mt-6"
              >
                {t("continue_shopping")}
              </button>
            </div>
          )}

          {cart.items.map((it) => {
            const name = locale === "am" && it.nameAm ? it.nameAm : it.name;
            return (
              <div key={it.productId} className="lux-card !rounded-xl p-3 flex gap-3 items-center">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-midnight-800 flex-shrink-0">
                  {it.imageURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageURL} alt={name} className="w-full h-full object-cover" />
                  ) : <div className="w-full h-full flex items-center justify-center text-white/20">◆</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${locale === "am" ? "font-amharic" : ""}`}>{name}</p>
                  <p className="text-xs text-white/50 mt-0.5">{formatETB(it.priceETB, locale)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="w-7 h-7 rounded-md bg-white/5 text-white/70 hover:bg-white/10"
                      onClick={() => { haptic("light"); cart.setQty(it.productId, it.quantity - 1); }}
                      aria-label="-"
                    >−</button>
                    <span className="w-6 text-center text-sm">{it.quantity}</span>
                    <button
                      className="w-7 h-7 rounded-md bg-white/5 text-white/70 hover:bg-white/10"
                      onClick={() => { haptic("light"); cart.setQty(it.productId, it.quantity + 1); }}
                      aria-label="+"
                    >+</button>
                    <button
                      className="ml-auto text-xs text-white/40 hover:text-red-300"
                      onClick={() => { hapticError(); cart.remove(it.productId); }}
                    >{t("remove")}</button>
                  </div>
                </div>
                <div className="text-sm font-semibold gold-text">
                  {formatETB(it.priceETB * it.quantity, locale)}
                </div>
              </div>
            );
          })}
        </div>

        {cart.items.length > 0 && (
          <footer className="px-5 py-4 border-t border-gold-300/10 space-y-3">
            <div className="flex justify-between text-sm text-white/60">
              <span>{t("subtotal")}</span>
              <span>{formatETB(cart.subtotalETB, locale)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>{t("total")}</span>
              <span className="gold-text">{formatETB(cart.subtotalETB, locale)}</span>
            </div>
            <div className="divider-gold" />
            <button
              onClick={() => { haptic("medium"); setCheckoutOpen(true); }}
              className="btn-gold w-full"
            >
              {t("checkout")} →
            </button>
          </footer>
        )}
      </aside>

      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
    </>
  );
}
