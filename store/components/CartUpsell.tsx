'use client';

import { useCart } from '@/lib/cart-store';
import { getDemoProducts } from '@/lib/demo-store';
import type { Product } from '@/lib/types';
import { formatYER } from '@/lib/utils';
import { Truck, Gift } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

const FREE_SHIPPING_THRESHOLD = 15000; // ريال يمني للتوصيل المجاني داخل عتق

/**
 * شريط التقدم في السلة + اقتراح منتجات مكملة (Upsell).
 */
export function CartUpsell() {
  const { lines, add, subtotal } = useCart();
  const sub = subtotal();
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - sub);
  const pct = Math.min(100, (sub / FREE_SHIPPING_THRESHOLD) * 100);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    setProducts(getDemoProducts());
  }, []);

  // منتجات مقترحة غير موجودة في السلة ومن نفس الفئة
  const suggestions = useMemo(() => {
    const inCart = new Set(lines.map((l) => l.product_id));
    const cats = new Set(lines.map((l) => products.find((p) => p.id === l.product_id)?.category_id));
    return products
      .filter((p) => !inCart.has(p.id) && p.stock_quantity > 0 && (cats.has(p.category_id) || p.is_featured))
      .slice(0, 4);
  }, [lines, products]);

  return (
    <div className="space-y-5">
      {/* شريط التوصيل المجاني */}
      <div className="card p-4">
        {remaining > 0 ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Truck size={16} className="text-gold-400" />
              <span>
                أضف بقيمة <strong className="text-gold-300">{formatYER(remaining)}</strong> للحصول على توصيل مجاني في عتق
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-900">
              <div className="h-full rounded-full bg-gold-gradient transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Gift size={16} />
            <span>🎉 تهانينا! حصلت على توصيل مجاني في عتق</span>
          </div>
        )}
      </div>

      {/* منتجات مقترحة */}
      {suggestions.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-stone-300">منتجات قد تعجبك</h3>
          <div className="grid grid-cols-2 gap-3">
            {suggestions.map((p) => (
              <div key={p.id} className="card flex gap-2 p-2">
                <Link href={`/products/${p.id}`} className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-ink-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.images[0]} alt={p.title_ar} className="h-full w-full object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight">{p.title_ar}</p>
                  <p className="mt-1 text-xs font-bold text-gold-300">{formatYER(p.price)}</p>
                  <button
                    onClick={() => add(p, p.sizes[0] ?? 'one-size', 1)}
                    className="mt-1 rounded-lg bg-gold-400 px-2 py-0.5 text-[10px] font-bold text-ink-950"
                  >
                    أضف
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
