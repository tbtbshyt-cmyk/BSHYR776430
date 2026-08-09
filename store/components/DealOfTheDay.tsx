'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, Flame } from 'lucide-react';
import type { Campaign, Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

function useCountdown(endsAt: string) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  return {
    h: Math.floor(ms / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
    done: ms === 0,
  };
}

/**
 * عرض اليوم/الأسبوع: يختار حملة نشطة حسب النوع ويعرض منتجاً واحداً بعدّاد.
 */
export function DealOfTheDay({
  products,
  campaigns,
}: {
  products: Product[];
  campaigns: Campaign[];
}) {
  const now = new Date();
  const deal = useMemo(() => {
    const active = campaigns
      .filter((c) => c.is_active && new Date(c.starts_at) <= now && new Date(c.ends_at) > now)
      .sort((a, b) => +new Date(a.ends_at) - +new Date(b.ends_at));
    return active[0];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns, now.toDateString()]);

  const { h, m, s } = useCountdown(deal?.ends_at ?? now.toISOString());

  const product = useMemo(() => {
    if (!deal) return null;
    const pool = products.filter((p) => deal.product_ids.length === 0 || deal.product_ids.includes(p.id));
    return pool[0];
  }, [deal, products]);

  if (!deal || !product) return null;

  return (
    <section className="container-x py-10">
      <div className="overflow-hidden rounded-3xl border border-gold-400/30 bg-gradient-to-l from-ink-900 via-ink-900 to-ink-800 p-6 md:p-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-gold-400">
              <Flame size={16} /> عرض {deal.name.includes('أسبوع') ? 'الأسبوع' : 'اليوم'}
            </p>
            <h2 className="mt-1 font-display text-2xl font-black text-white">{deal.name}</h2>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-ink-950/70 px-4 py-2">
            <Clock size={16} className="text-red-400" />
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1">
            <ProductCard product={product} compact />
          </div>
          <div className="flex flex-col justify-center md:col-span-2">
            <h3 className="font-display text-xl font-bold text-white">{product.title_ar}</h3>
            <p className="mt-2 line-clamp-3 text-sm text-stone-300">{product.description_ar}</p>
            <div className="mt-4 flex items-center gap-3">
              {product.compare_at_price && (
                <span className="text-sm text-stone-500 line-through">{product.compare_at_price.toLocaleString()} ر.ي</span>
              )}
              <span className="text-2xl font-black text-gold-300">{product.price.toLocaleString()} ر.ي</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
