"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Stats } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatETB } from "@/lib/format";

export default function AdminDashboard() {
  const { t, locale } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await api.stats();
        setStats(s);
        setSlug(localStorage.getItem("merchant_slug"));
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: t("stats_total_orders"), value: stats?.total_orders ?? 0, tone: "text-gold-200" },
    { label: t("stats_revenue"),      value: stats ? formatETB(stats.revenue_etb, locale) : "—", tone: "gold-text" },
    { label: t("stats_pending"),      value: stats?.pending_orders ?? 0, tone: "text-amber-300" },
    { label: t("stats_active_products"), value: stats?.active_products ?? 0, tone: "text-emerald-300" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gold-text">{t("admin_dashboard")}</h1>
        {slug && (
          <Link href={`/store/${slug}`} target="_blank" className="text-sm text-gold-200 hover:underline">
            View storefront ↗
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="lux-card p-4">
            <p className="text-xs text-white/50">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.tone}`}>
              {loading ? "…" : c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="lux-card p-5">
        <h2 className="font-semibold text-white mb-2">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/products" className="btn-ghost">{t("add_product")} →</Link>
          <Link href="/admin/orders"   className="btn-ghost">{t("admin_orders")} →</Link>
        </div>
      </div>
    </div>
  );
}
