'use client';

import { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getDemoProducts } from '@/lib/demo-store';
import Link from 'next/link';

interface Story {
  id: string;
  title: string;
  image: string;
  productId?: string;
  badge?: string;
}

/**
 * شريط قصص (Stories) أعلى الصفحة الرئيسية.
 */
export function Stories() {
  const [stories, setStories] = useState<Story[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const products = getDemoProducts();
    const featured = products
      .filter((p) => p.is_featured || p.compare_at_price)
      .slice(0, 8);
    setStories(
      featured.map((p) => ({
        id: p.id,
        title: p.title_ar.slice(0, 20),
        image: p.images[0],
        productId: p.id,
        badge: p.compare_at_price ? 'خصم' : 'جديد',
      })),
    );
  }, []);

  useEffect(() => {
    if (active === null) return;
    setProgress(0);
    const start = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        if (active < stories.length - 1) setActive(active + 1);
        else setActive(null);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [active, stories.length]);

  if (stories.length === 0) return null;
  const current = active !== null ? stories[active] : null;

  return (
    <>
      <section className="container-x py-8">
        <div className="flex gap-4 overflow-x-auto pb-2">
          {stories.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className="flex flex-shrink-0 flex-col items-center gap-1.5"
            >
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-gold-400 via-amber-500 to-gold-400 p-[2px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image} alt={s.title} className="h-full w-full rounded-full border-2 border-ink-950 object-cover" />
                {s.badge && (
                  <span className="absolute -bottom-1 rounded-full bg-gold-400 px-1.5 text-[9px] font-bold text-ink-950">
                    {s.badge}
                  </span>
                )}
              </span>
              <span className="max-w-[64px] truncate text-[10px] text-stone-400">{s.title}</span>
            </button>
          ))}
          <button className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-gold-400/40 text-gold-400">
              <Plus size={22} />
            </span>
            <span className="text-[10px] text-stone-500">الكل</span>
          </button>
        </div>
      </section>

      {current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/95 p-4 backdrop-blur-sm">
          <button
            onClick={() => setActive(null)}
            className="absolute right-5 top-5 z-10 rounded-full bg-ink-900/70 p-2 text-white"
            aria-label="إغلاق"
          >
            <X size={22} />
          </button>
          <button
            onClick={() => setActive((a) => (a !== null && a > 0 ? a - 1 : a))}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-900/60 p-2 text-white"
          >
            <ChevronRight size={24} />
          </button>
          <button
            onClick={() => setActive((a) => (a !== null && a < stories.length - 1 ? a + 1 : a))}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-900/60 p-2 text-white"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="relative h-[80vh] w-full max-w-md overflow-hidden rounded-2xl">
            <div className="absolute left-0 right-0 top-0 z-10 flex gap-1 p-3">
              {stories.map((_, i) => (
                <div key={i} className="h-0.5 flex-1 overflow-hidden rounded bg-white/20">
                  <div
                    className="h-full bg-white"
                    style={{ width: i < (active ?? 0) ? '100%' : i === active ? `${progress}%` : '0%' }}
                  />
                </div>
              ))}
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent p-5 pt-16">
              <p className="text-lg font-bold text-white">{current.title}</p>
              {current.productId && (
                <Link
                  href="/products"
                  onClick={() => setActive(null)}
                  className="mt-3 inline-block rounded-xl bg-gold-400 px-5 py-2 text-sm font-bold text-ink-950"
                >
                  تسوّق الآن
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
