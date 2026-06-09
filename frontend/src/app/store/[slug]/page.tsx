"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api, type Product, type Store } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { HeaderBar } from "@/components/HeaderBar";
import { haptic } from "@/lib/telegram";
import { formatETB } from "@/lib/format";

export default function StorefrontPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const search = useSearchParams();
  const paidOrderId = search?.get("paid");

  const { t, locale } = useI18n();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paidStatus, setPaidStatus] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    if (!slug) return;
    let mounted = true;
    (async () => {
      try {
        const s = await api.getStore(slug);
        const p = await api.getProducts(slug);
        if (!mounted) return;
        setStore(s);
        setProducts(p.products);
      } catch (e: any) {
        setError(e?.message || t("store_not_found"));
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  // Poll for order status after returning from Chapa
  useEffect(() => {
    if (!paidOrderId) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const o = await api.getOrder(paidOrderId);
        if (!cancelled) setPaidStatus(o.status);
      } catch {}
    };
    tick();
    const iv = setInterval(tick, 3000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [paidOrderId]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen p-4 space-y-4">
        <div className="skeleton-gold h-14 rounded-2xl" />
        <div className="skeleton-gold h-32 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton-gold aspect-square rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="max-w-md mx-auto min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">◇</div>
        <h1 className="text-xl font-semibold mb-2 gold-text">{t("store_not_found")}</h1>
        <p className="text-white/50 text-sm">{error}</p>
      </div>
    );
  }

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const filtered = category === "all" ? products : products.filter((p) => p.category === category);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      <HeaderBar store={store} />

      {store.banner_url && (
        <div className="relative h-44 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-midnight-950" />
        </div>
      )}

      <main className="px-4 pt-4 space-y-4">
        {paidOrderId && (
          <div className={`lux-card p-4 ${paidStatus === "paid" ? "border-emerald-400/30" : ""}`}>
            <h3 className="font-semibold gold-text">{t("order_placed")}</h3>
            <p className="text-sm text-white/60 mt-1">
              {paidStatus === "paid" ? "✅ Payment confirmed — merchant will be in touch."
                : paidStatus ? `Status: ${paidStatus}` : t("order_placed_msg")}
            </p>
          </div>
        )}

        {store.description && (
          <p className={`text-sm text-white/60 ${locale === "am" ? "font-amharic" : ""}`}>
            {store.description}
          </p>
        )}

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => { haptic("light"); setCategory(c); }}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  category === c
                    ? "bg-gold-300/20 text-gold-100 border-gold-300/40"
                    : "bg-white/3 text-white/55 border-white/10"
                }`}
              >
                {c === "all" ? t("all") : c}
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center text-white/40 py-16">
            <div className="text-5xl mb-3">◇</div>
            <p>{t("no_products")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </main>

      <footer className="text-center text-[11px] text-white/30 mt-12 px-4">
        <p>Powered by <span className="gold-text font-medium">TMA Store Builder</span></p>
      </footer>
    </div>
  );
}
