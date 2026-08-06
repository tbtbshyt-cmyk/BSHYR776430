'use client';

import { useCart } from '@/lib/cart-store';
import { formatYER } from '@/lib/utils';
import Link from 'next/link';
import { ShoppingBag, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';

// سلة منزلقة بسيطة (تظهر كشريط عائم عند الانتقال لصفحة السلة).
export function CartDrawer() {
  return null;
}

export function CartItemsList() {
  const { lines, updateQty, remove } = useCart();

  if (lines.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold-400/10">
          <ShoppingBag className="text-gold-400" size={36} />
        </div>
        <h3 className="text-xl font-bold">سلتك فارغة</h3>
        <p className="max-w-sm text-sm text-stone-400">
          اكتشف مجموعتنا الفاخرة من الثياب والبشوت والأحذية وأضف ما يناسب ذوقك الرفيع.
        </p>
        <Link href="/products" className="btn-gold mt-2">
          <ArrowLeft size={18} /> تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lines.map((l) => (
        <div
          key={`${l.product_id}-${l.size}`}
          className="card flex gap-4 p-3"
        >
          <div
            className="h-24 w-20 flex-shrink-0 rounded-lg bg-cover bg-center"
            style={{ backgroundImage: `url(${l.image})` }}
          />
          <div className="flex flex-1 flex-col">
            <h4 className="font-bold leading-6">{l.title_ar}</h4>
            <p className="text-xs text-stone-400">المقاس: {l.size}</p>
            <div className="mt-auto flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 p-1">
                <button
                  onClick={() => updateQty(l.product_id, l.size, l.quantity - 1)}
                  className="rounded p-1 hover:bg-white/5"
                  aria-label="تقليل"
                >
                  <Minus size={14} />
                </button>
                <span className="w-8 text-center text-sm font-bold">{l.quantity}</span>
                <button
                  onClick={() => updateQty(l.product_id, l.size, l.quantity + 1)}
                  className="rounded p-1 hover:bg-white/5"
                  aria-label="زيادة"
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-gold-300">
                  {formatYER(l.price * l.quantity)}
                </span>
                <button
                  onClick={() => remove(l.product_id, l.size)}
                  className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                  aria-label="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
