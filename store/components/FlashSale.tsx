'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Flame } from 'lucide-react';
import type { Campaign, Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import Link from 'next/link';

function useCountdown(endsAt: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ms, h, m, s };
}

/**
 * قسم التخفيضات السريعة: يعرض الحملات النشطة القريبة من الانتهاء
 * مع عدّاد تنازلي ونسبة المبيع ورسائل FOMO.
 */
export function FlashSale({
  products,
  campaigns,
}: {
  products: Product[];
  campaigns: Campaign[];
}) {
  // نأخذ أقرب حملة تنتهي
  const flash = useMemo(() => {
    const active = campaigns
      .filter((c) => c.is_active && new Date(c.ends_at) > new Date())
      .sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at));
    return active[0];
  }, [campaigns]);

  const discounted = useMemo(() => {
    if (!flash) return [];
    return products
      .filter((p) => flash.product_ids.length === 0 || flash.product_ids.includes(p.id))
      .slice(0, 8);
  }, [flash, products]);

  const { ms, h, m, s } = useCountdown(flash?.ends_at ?? new Date().toISOString());

  if (!flash || discounted.length === 0 || ms <= 0) return null;

  const soldPct = 60 + (flash.clicks % 35); // نسبة تقريبية للعرض التسويقي
  const stockLeft = Math.max(0, 100 - soldPct);

  return (
    <section className="container-x py-10">
      <div className="overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-l from-red-500/10 via-ink-900 to-ink-900 p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-black text-white">
              <Flame className="text-red-400" /> {flash.name}
            </h2>
            <p className="mt-1 text-sm text-stone-300">أسعار تنتهي قريباً — الكميات محدودة!</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-ink-950/70 px-4 py-2">
            <Clock size={16} className="text-red-400" />
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* شريط FOMO */}
        <div className="mb-5">
          <div className="mb-1 flex justify-between text-xs text-stone-400">
            <span>🔥 تم بيع {soldPct}%</span>
            <span>{stockLeft}% متبقٍ</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-ink-950">
            <div
              className="h-full rounded-full bg-gradient-to-l from-red-500 to-amber-400 transition-all"
              style={{ width: `${soldPct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {discounted.map((p) => (
            <ProductCard key={p.id} product={p} compact />
          ))}
        </div>

        <div className="mt-5 text-center">
          <Link href="/products" className="inline-block rounded-xl bg-red-500 px-6 py-2.5 text-sm font-bold text-white hover:bg-red-600">
            تسوّق كل العروض
          </Link>
        </div>
      </div>
    </section>
  );
}
