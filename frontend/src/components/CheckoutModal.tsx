"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { api, type Store } from "@/lib/api";
import { formatETB, formatPhone } from "@/lib/format";
import { haptic, hapticError, hapticSuccess } from "@/lib/telegram";

const SHIPPING_ETB = 100;

export function CheckoutModal({ open, onClose, store }: { open: boolean; onClose: () => void; store?: Store | null }) {
  const cart = useCart();
  const { t, locale } = useI18n();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<"telebirr" | "cbe" | "card">("telebirr");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const valid = name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 9 && area.trim().length >= 2;

  const submit = async () => {
    if (!valid || !store) return;
    setSubmitting(true);
    setError(null);
    try {
      const order = await api.createOrder({
        merchant_slug: store.slug,
        items: cart.items.map((it) => ({
          product_id: it.productId,
          name: it.name,
          price_etb: it.priceETB,
          quantity: it.quantity,
          image_url: it.imageURL,
        })),
        customer_name: name.trim(),
        customer_phone: formatPhone(phone),
        delivery_area: area.trim(),
        notes: notes.trim(),
        payment_method: method,
        language: locale,
      });

      const returnUrl = `${window.location.origin}/store/${store.slug}?paid=${order.order_id}`;
      const callbackUrl = `${api.baseURL}/api/v1/chapa/webhook`;
      const init = await api.initializeChapa({
        order_id: order.order_id,
        return_url: returnUrl,
        callback_url: callbackUrl,
      });

      hapticSuccess();
      cart.clear();
      // Redirect to Chapa hosted checkout
      window.location.href = init.checkout_url;
    } catch (e: any) {
      hapticError();
      setError(e?.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-midnight-900 border-t sm:border border-gold-300/15 rounded-t-3xl sm:rounded-3xl shadow-luxury max-h-[92vh] flex flex-col safe-bottom">
        <header className="px-5 py-4 flex items-center justify-between border-b border-gold-300/10">
          <h2 className="text-lg font-semibold gold-text">{t("order_summary")}</h2>
          <button onClick={() => { haptic("light"); onClose(); }} className="text-white/60 text-2xl leading-none">×</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">{t("customer_name")}</label>
            <input className={`input-lux ${locale === "am" ? "font-amharic" : ""}`} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">{t("customer_phone")}</label>
            <input inputMode="tel" className="input-lux" placeholder="+251 9.. or 09.." value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">{t("delivery_area")}</label>
            <input className={`input-lux ${locale === "am" ? "font-amharic" : ""}`} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Bole, Kazanchis, Sarbet…" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">{t("notes_optional")}</label>
            <textarea rows={2} className={`input-lux resize-none ${locale === "am" ? "font-amharic" : ""}`} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-white/50 mb-2 block">{t("payment_method")}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["telebirr", "cbe", "card"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { haptic("light"); setMethod(m); }}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                    method === m
                      ? "bg-gold-300/15 border-gold-300/50 text-gold-100"
                      : "bg-white/3 border-white/10 text-white/60"
                  }`}
                >
                  {m === "telebirr" ? t("pay_with_telebirr")
                    : m === "cbe" ? t("pay_with_cbe")
                    : t("pay_with_card")}
                </button>
              ))}
            </div>
          </div>

          <div className="lux-card !rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between text-white/60">
              <span>{t("subtotal")}</span><span>{formatETB(cart.subtotalETB, locale)}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>{t("shipping")}</span><span>{formatETB(SHIPPING_ETB, locale)}</span>
            </div>
            <div className="divider-gold" />
            <div className="flex justify-between text-base font-semibold">
              <span>{t("total")}</span>
              <span className="gold-text">{formatETB(cart.subtotalETB + SHIPPING_ETB, locale)}</span>
            </div>
          </div>

          {error && <div className="text-red-300 text-sm">{error}</div>}
        </div>

        <footer className="px-5 py-4 border-t border-gold-300/10">
          <button
            onClick={submit}
            disabled={!valid || submitting}
            className="btn-gold w-full"
          >
            {submitting ? t("loading") : `${t("place_order")} • ${formatETB(cart.subtotalETB + SHIPPING_ETB, locale)}`}
          </button>
        </footer>
      </div>
    </div>
  );
}
