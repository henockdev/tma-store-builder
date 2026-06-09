"use client";

import { haptic } from "@/lib/telegram";
import { useI18n } from "@/lib/i18n";
import { useCart } from "@/lib/cart";
import { formatETB } from "@/lib/format";
import type { Product } from "@/lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { t, locale } = useI18n();
  const cart = useCart();
  const name = locale === "am" && product.name_am ? product.name_am : product.name;
  const desc = locale === "am" && product.description_am ? product.description_am : product.description;
  const out = product.stock <= 0;

  const onAdd = () => {
    if (out) return;
    haptic("medium");
    cart.add({
      productId: product.id,
      name: product.name,
      nameAm: product.name_am,
      priceETB: product.price_etb,
      imageURL: product.image_url,
      quantity: 1,
    });
  };

  return (
    <article className="lux-card overflow-hidden animate-fade-in no-tap">
      <div className="aspect-square relative bg-midnight-900 overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/20 text-4xl">◆</div>
        )}
        {out && (
          <div className="absolute top-3 left-3 chip-amber">{t("out_of_stock")}</div>
        )}
        {!out && product.stock <= 5 && (
          <div className="absolute top-3 left-3 chip-gold">{product.stock} {t("in_stock")}</div>
        )}
      </div>
      <div className="p-4 flex flex-col gap-2">
        <h3 className={`font-semibold text-white line-clamp-1 ${locale === "am" ? "font-amharic text-[15px]" : "text-[15px]"}`}>
          {name}
        </h3>
        {desc && <p className={`text-xs text-white/55 line-clamp-2 ${locale === "am" ? "font-amharic" : ""}`}>{desc}</p>}
        <div className="mt-2 flex items-center justify-between">
          <span className="gold-text font-bold text-lg">{formatETB(product.price_etb, locale)}</span>
          <button
            onClick={onAdd}
            disabled={out}
            className="btn-gold !py-2 !px-4 text-sm"
            aria-label={t("add_to_cart")}
          >
            <span aria-hidden>＋</span>
            <span className="hidden sm:inline">{t("add_to_cart")}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
