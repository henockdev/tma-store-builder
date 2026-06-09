"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { hapticError, hapticSuccess } from "@/lib/telegram";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const initialMode = search?.get("signup") ? "signup" : "signin";
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [storeName, setStoreName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLanguage] = useState<"en" | "am">("en");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("merchant_token");
    if (token) router.replace("/admin");
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = mode === "signin"
        ? await api.loginMerchant({ email, password })
        : await api.registerMerchant({ email, password, store_name: storeName, description, phone, language });
      localStorage.setItem("merchant_token", res.token);
      localStorage.setItem("merchant_slug", res.merchant.slug);
      hapticSuccess();
      router.replace("/admin");
    } catch (e: any) {
      hapticError();
      setError(e?.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <Link href="/" className="mb-6 flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gold-gradient flex items-center justify-center text-midnight-950 font-bold text-lg">◆</div>
        <span className="font-semibold text-lg gold-text">TMA Store Builder</span>
      </Link>

      <div className="lux-card w-full p-6 animate-slide-up">
        <h1 className="text-2xl font-bold gold-text mb-1">
          {mode === "signin" ? "Welcome back" : "Create your store"}
        </h1>
        <p className="text-sm text-white/50 mb-6">
          {mode === "signin" ? "Sign in to manage your catalog and orders." : "Set up your merchant account in seconds."}
        </p>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Email</label>
            <input type="email" required className="input-lux" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@brand.com" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1.5 block">Password</label>
            <input type="password" required minLength={8} className="input-lux" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>

          {mode === "signup" && (
            <>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Store name</label>
                <input required className="input-lux" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Maison Dorée" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Tagline (optional)</label>
                <input className="input-lux" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Phone</label>
                <input className="input-lux" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+251 9…" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Default language</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["en", "am"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setLanguage(l)}
                      className={`p-2 rounded-lg border text-sm ${
                        language === l
                          ? "bg-gold-300/15 border-gold-300/50 text-gold-100"
                          : "bg-white/3 border-white/10 text-white/60"
                      }`}
                    >
                      {l === "en" ? "English" : "አማርኛ"}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && <div className="text-red-300 text-sm">{error}</div>}

          <button type="submit" disabled={submitting} className="btn-gold w-full">
            {submitting ? "…" : mode === "signin" ? "Sign in" : "Create store"}
          </button>
        </form>

        <div className="divider-gold my-5" />
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-sm text-white/60 hover:text-gold-200 w-full text-center"
        >
          {mode === "signin" ? "No account? Create one →" : "Have an account? Sign in →"}
        </button>
      </div>
    </div>
  );
}
