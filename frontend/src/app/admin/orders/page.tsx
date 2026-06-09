"use client";

import { useEffect, useState } from "react";
import { api, type Order } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatETB } from "@/lib/format";
import { haptic, hapticError, hapticSuccess } from "@/lib/telegram";

const STATUS_OPTIONS: Order["status"][] = ["shipped", "delivered", "cancelled"];

export default function AdminOrdersPage() {
  const { t, locale } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Order | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.myOrders();
      // FIX 1: Safe fallback ensures 'orders' remains a valid iterable array
      setOrders(res?.orders || []);
    } catch (e) {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: Order["status"]) => {
    try {
      await api.updateOrderStatus(id, status);
      hapticSuccess();
      await load();
      if (open?.id === id) setOpen({ ...open, status });
    } catch (e: any) { hapticError(); alert(e?.message); }
  };

  const statusChip = (s: Order["status"]) => {
    const map: Record<Order["status"], string> = {
      pending:   "chip-amber",
      paid:      "chip-green",
      shipped:   "chip-gold",
      delivered: "chip-green",
      cancelled: "chip-mute",
      failed:    "chip-mute",
    };
    return map[s] || "chip-mute";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gold-text">{t("admin_orders")}</h1>
        <button type="button" onClick={load} className="text-sm text-white/50 hover:text-white">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton-gold h-20 rounded-2xl" />)}
        </div>
      ) : (!orders || orders.length === 0) ? ( // FIX 2: Defensive check protects against uninitialized execution flows
        <div className="lux-card p-8 text-center text-white/50">
          <div className="text-5xl mb-3">◇</div>
          <p>No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { haptic("light"); setOpen(o); }}
              className="lux-card w-full p-4 text-left hover:border-gold-300/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-white/40">{o.tx_ref}</p>
                  <p className="font-semibold text-white truncate">{o.customer_name} · {o.customer_phone}</p>
                  <p className="text-xs text-white/50 truncate">{o.delivery_area}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold gold-text">{formatETB(o.total_etb, locale)}</p>
                  <span className={`${statusChip(o.status)} mt-1`}>{t(`status_${o.status}` as any)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="w-full sm:max-w-lg bg-midnight-900 border-t sm:border border-gold-300/15 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col">
            <header className="px-5 py-4 flex items-center justify-between border-b border-gold-300/10">
              <div>
                <h2 className="font-semibold gold-text">{t("order_id")}{open.tx_ref?.slice(-6) || ""}</h2>
                <p className="text-xs text-white/40">{new Date(open.created_at).toLocaleString()}</p>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="text-white/60 text-2xl leading-none">×</button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="lux-card !rounded-xl p-4 space-y-1 text-sm">
                <p><span className="text-white/50">{t("order_customer")}:</span> {open.customer_name}</p>
                <p><span className="text-white/50">Phone:</span> {open.customer_phone}</p>
                <p><span className="text-white/50">Area:</span> {open.delivery_area}</p>
                <p><span className="text-white/50">Payment:</span> {open.payment_method}</p>
                {open.notes && <p><span className="text-white/50">Notes:</span> {open.notes}</p>}
              </div>

              <div className="space-y-2">
                {open.items?.map((it, i) => ( // FIX 3: Optional chaining check against inner sub-array items
                  <div key={i} className="flex items-center gap-3 lux-card !rounded-xl p-3">
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-midnight-800">
                      {it.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.image_url} alt="" className="w-full h-full object-cover" />
                      ) : <div className="w-full h-full flex items-center justify-center text-white/20">◆</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{it.name}</p>
                      <p className="text-xs text-white/50">{it.quantity} × {formatETB(it.price_etb, locale)}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatETB(it.price_etb * it.quantity, locale)}</p>
                  </div>
                ))}
              </div>

              <div className="lux-card !rounded-xl p-4 space-y-1 text-sm">
                <div className="flex justify-between text-white/60"><span>{t("subtotal")}</span><span>{formatETB(open.subtotal_etb, locale)}</span></div>
                <div className="flex justify-between text-white/60"><span>{t("shipping")}</span><span>{formatETB(open.shipping_etb, locale)}</span></div>
                <div className="divider-gold my-1" />
                <div className="flex justify-between font-bold"><span>{t("total")}</span><span className="gold-text">{formatETB(open.total_etb, locale)}</span></div>
              </div>

              <div>
                <p className="text-xs text-white/50 mb-2">{t("order_status")}: <span className={`${statusChip(open.status)}`}>{t(`status_${open.status}` as any)}</span></p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update(open.id, s)}
                      className="btn-ghost !py-2 text-xs"
                    >
                      {t(`status_${s}` as any)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}