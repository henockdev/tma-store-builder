"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // 1. Attempt to grab the Telegram WebApp context
    const tg = (window as any).Telegram?.WebApp;
    
    // 2. Check if a start_param exists (e.g., from a link like ?startapp=mystore)
    const startParam = tg?.initDataUnsafe?.start_param;

    // 3. If a store slug exists in the start parameter, redirect immediately
    if (startParam) {
      router.replace(`/store/${startParam}`);
    }
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto animate-fade-in">
      <div className="text-6xl mb-4">◆</div>
      <h1 className="text-3xl font-bold gold-text mb-2">TMA Store Builder</h1>
      <p className="text-white/60 mb-8">
        A luxury Telegram Mini App platform for Ethiopian merchants. Open a storefront or manage your store.
      </p>

      <div className="flex flex-col gap-3 w-full">
        <Link href="/admin/login" className="btn-gold w-full">
          Merchant sign in
        </Link>
        <Link href="/admin/login?signup=1" className="btn-ghost w-full">
          Create your store
        </Link>
      </div>

      <p className="text-xs text-white/30 mt-12">
        For shoppers: open this app from a merchant&apos;s Telegram bot button to view their store.
      </p>
    </div>
  );
}