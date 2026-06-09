"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Stats } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatETB } from "@/lib/format";
import { hapticSuccess, haptic } from "@/lib/telegram";

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

  // New logic: Copy the store link to the clipboard
  const copyStoreLink = () => {
    if (!slug) return;
    const link = `https://t.me/AdwaStoreBuilderBot?startapp=${slug}`;
    navigator.clipboard.writeText(link);
    hapticSuccess();
    alert("Store link copied!"); 
  };

  const cards = [
    { label: t("stats_total_orders"), value: stats?.total_orders ?? 0, tone: "text-gold-200" },
    { label: t("stats_revenue"),      value: stats ? formatETB(stats.revenue_etb, locale) : "—", tone: "gold-text" },
    { label: t("stats_pending"),      value: stats?.pending_orders ?? 0, tone: "text-amber-300" },
    { label: t("stats_active_products"), value: stats?.active_products ?? 0, tone: "text-emerald-300" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Store Link Action */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gold-text">{t("admin_dashboard")}</h1>
        {slug && (
          <button 
            onClick={copyStoreLink}
            className="text-xs bg-gold-300/10 text-gold-200 px-3 py-1.5 rounded-full border border-gold-300/20 hover:bg-gold-300/20 transition-all"
          >
            Copy Store Link
          </button>
        )}
      </div>

      {/* Stats Grid */}
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

      {/* Quick Actions */}
      <div className="lux-card p-5">
        <h2 className="font-semibold text-white mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/admin/products" className="btn-ghost text-center">{t("add_product")}</Link>
          <Link href="/admin/orders"   className="btn-ghost text-center">{t("admin_orders")}</Link>
        </div>
        
        {slug && (
          <Link href={`/store/${slug}`} target="_blank" className="block mt-3 w-full text-center text-xs text-white/40 hover:text-gold-200 underline">
            View live storefront preview ↗
          </Link>
        )}
      </div>
    </div>
  );
}