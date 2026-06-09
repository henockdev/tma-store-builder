"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("merchant_token") : null;
    if (!token && !pathname?.startsWith("/admin/login")) {
      router.replace("/admin/login");
    } else {
      setReady(true);
    }
  }, [pathname, router]);

  const isLogin = pathname?.startsWith("/admin/login");

  if (isLogin) {
    return <div className="min-h-screen bg-midnight-gradient">{children}</div>;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="skeleton-gold w-32 h-8 rounded-lg" />
      </div>
    );
  }

  const tabs = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/orders", label: "Orders" },
  ];

  const logout = () => {
    localStorage.removeItem("merchant_token");
    localStorage.removeItem("merchant_slug");
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-midnight-950/90 backdrop-blur-xl border-b border-gold-300/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center text-midnight-950 font-bold">◆</div>
            <span className="font-semibold gold-text">TMA Admin</span>
          </Link>
          <div className="flex-1" />
          <button onClick={logout} className="text-sm text-white/50 hover:text-white">Sign out</button>
        </div>
        <nav className="max-w-3xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => {
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  active
                    ? "text-gold-200 border-gold-300"
                    : "text-white/50 border-transparent hover:text-white/80"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="max-w-3xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}
