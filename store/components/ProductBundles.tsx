'use client';

import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import type { Product } from '@/lib/types';
import { DEMO_BUNDLES, bundleTotal } from '@/lib/bundles';
import { getProducts } from '@/lib/store';
import { useCart } from '@/lib/cart-store';
import { formatYER } from '@/lib/utils';
import Link from 'next/link';

/**
 * عروض الباقات المدمجة (Dynamic Product Bundles) مع زر إضافة الطقم كاملاً.
 */
export function ProductBundles() {
  const [products, setProducts] = useState<Product[]>([]);
  const { add } = useCart();
  const [added, setAdded] = useState<string | null>(null);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const bundles = DEMO_BUNDLES.map((b) => ({ b, ...bundleTotal(products, b) })).filter((x) => x.items.length > 1);

  if (bundles.length === 0) return null;

  const addBundle = (bundleId: string, items: Product[]) => {
    items.forEach((p) => add(p, p.sizes[0] ?? 'one-size', 1));
    setAdded(bundleId);
    setTimeout(() => setAdded(null), 2000);
  };

  return (
    <section className="container-x py-10">
      <div className="mb-6 flex items-center gap-2">
        <Package size={22} className="text-gold-400" />
        <h2 className="section-title">أطقم وعروض مدمجة</h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {bundles.map(({ b, items, sum, discounted, savings }) => (
          <div key={b.id} className="card p-5">
            <h3 className="font-display text-lg font-extrabold">{b.title}</h3>
            <p className="text-sm text-stone-400">{b.description}</p>

            <div className="mt-4 flex -space-x-3 rtl:space-x-reverse">
              {items.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="relative h-16 w-14 overflow-hidden rounded-lg border-2 border-ink-900 bg-cover bg-center"
                  style={{ backgroundImage: `url(${p.images[0]})` }}
                  title={p.title_ar}
                />
              ))}
            </div>

            <div className="mt-4 flex items-end justify-between">
              <div>
                <p className="text-xs text-stone-500 line-through">{formatYER(sum)}</p>
                <p className="text-xl font-black text-gold-300">{formatYER(discounted)}</p>
                <p className="text-xs text-emerald-400">وفّر {formatYER(savings)} ({b.discount_pct}%)</p>
              </div>
              <button
                onClick={() => addBundle(b.id, items)}
                className="btn-gold !py-2 text-sm"
              >
                {added === b.id ? '✓ تمت الإضافة' : 'أضف الطقم للسلة'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
