"use client";

import { useEffect, useState } from "react";
import { api, type Product } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatETB } from "@/lib/format";
import { haptic, hapticError, hapticSuccess } from "@/lib/telegram";

type FormState = {
  name: string;
  name_am: string;
  description: string;
  description_am: string;
  price_etb: string;
  image_url: string;
  stock: string;
  category: string;
  active: boolean;
};

const empty: FormState = {
  name: "", name_am: "", description: "", description_am: "",
  price_etb: "", image_url: "", stock: "0", category: "", active: true,
};

export default function AdminProductsPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.myProducts();
      // FIX 1: Safe fallback guarantees 'items' remains an array even if api payload structure changes
      setItems(r?.products || []);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      name_am: p.name_am ?? "",
      description: p.description,
      description_am: p.description_am ?? "",
      price_etb: String(p.price_etb),
      image_url: p.image_url || "",
      stock: String(p.stock ?? 0),
      category: p.category || "",
      active: p.active,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name || !form.price_etb) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        name_am: form.name_am,
        description: form.description,
        description_am: form.description_am,
        price_etb: Number(form.price_etb),
        image_url: form.image_url,
        stock: Number(form.stock || 0),
        category: form.category,
        active: form.active,
      };
      if (editing) {
        await api.updateProduct(editing.id, payload);
      } else {
        await api.createProduct(payload);
      }
      hapticSuccess();
      setShowForm(false);
      await load();
    } catch (e: any) {
      hapticError();
      alert(e?.message || "Save failed");
    } finally { setSubmitting(false); }
  };

  const remove = async (p: Product) => {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await api.deleteProduct(p.id);
      haptic("medium");
      await load();
    } catch (e: any) { hapticError(); alert(e?.message); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold gold-text">{t("admin_products")}</h1>
        <button type="button" onClick={openCreate} className="btn-gold !py-2 !px-4 text-sm">+ {t("add_product")}</button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-gold h-28 rounded-2xl" />)}
        </div>
      ) : (!items || items.length === 0) ? ( // FIX 2: Double-layer defense preventing undefined length reads
        <div className="lux-card p-8 text-center text-white/50">
          <div className="text-5xl mb-3">◇</div>
          <p>{t("no_products")}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((p) => (
            <div key={p.id} className="lux-card p-3 flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden bg-midnight-800 flex-shrink-0">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                ) : <div className="w-full h-full flex items-center justify-center text-white/20">◆</div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white truncate">{p.name}</h3>
                <p className="text-xs text-white/50">{p.category || "—"}</p>
                <p className="mt-1 gold-text font-bold">{formatETB(p.price_etb, locale)}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => openEdit(p)} className="text-xs px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10">{t("edit_product")}</button>
                  <button type="button" onClick={() => remove(p)} className="text-xs px-2.5 py-1 rounded-md bg-red-500/10 text-red-300 hover:bg-red-500/20">{t("delete")}</button>
                  <span className={`ml-auto text-[10px] px-2 py-1 rounded-full ${p.active ? "bg-emerald-500/15 text-emerald-300" : "bg-white/5 text-white/40"}`}>
                    {p.active ? t("active") : t("inactive")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in">
          <div className="w-full sm:max-w-lg bg-midnight-900 border-t sm:border border-gold-300/15 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col">
            <header className="px-5 py-4 flex items-center justify-between border-b border-gold-300/10">
              <h2 className="font-semibold gold-text">{editing ? t("edit_product") : t("add_product")}</h2>
              <button type="button" onClick={() => setShowForm(false)} className="text-white/60 text-2xl leading-none">×</button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <Field label={t("product_name")}>
                <input className="input-lux" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={t("product_name_am")}>
                <input className="input-lux font-amharic" value={form.name_am} onChange={(e) => setForm({ ...form, name_am: e.target.value })} />
              </Field>
              <Field label={t("product_description")}>
                <textarea rows={2} className="input-lux resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </Field>
              <Field label={t("product_description_am")}>
                <textarea rows={2} className="input-lux font-amharic resize-none" value={form.description_am} onChange={(e) => setForm({ ...form, description_am: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t("product_price")}>
                  <input type="number" min="0" step="0.01" className="input-lux" value={form.price_etb} onChange={(e) => setForm({ ...form, price_etb: e.target.value })} />
                </Field>
                <Field label={t("product_stock")}>
                  <input type="number" min="0" className="input-lux" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
                </Field>
              </div>
              <Field label={t("product_category")}>
                <input className="input-lux" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Accessories, Apparel, …" />
              </Field>
              <Field label={t("product_image")}>
                <input className="input-lux" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
              </Field>
              {form.image_url && (
                <div className="rounded-lg overflow-hidden h-32 bg-midnight-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t("active")}
              </label>
            </div>
            <footer className="px-5 py-4 border-t border-gold-300/10 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">{t("cancel")}</button>
              <button type="button" onClick={save} disabled={submitting} className="btn-gold flex-1">{submitting ? "…" : t("save")}</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-white/50 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}