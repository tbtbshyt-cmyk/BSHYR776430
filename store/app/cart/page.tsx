'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-store';
import { formatYER } from '@/lib/utils';
import { CartItemsList } from '@/components/CartDrawer';
import { CartUpsell } from '@/components/CartUpsell';
import { ArrowLeft, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const subtotal = useCart((s) => s.subtotal());
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.quantity, 0));

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-3xl font-black">سلة المشتريات</h1>
      <div className="divider-gold mt-3" />

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CartItemsList />
        </div>

        {count > 0 && (
          <aside className="lg:col-span-1">
            <CartUpsell />
            <div className="card sticky top-24 p-6 mt-6">
              <h3 className="font-display text-lg font-extrabold">ملخص الطلب</h3>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between text-stone-300">
                  <span>عدد القطع</span>
                  <span>{count}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>المجموع الفرعي</span>
                  <span>{formatYER(subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-300">
                  <span>التوصيل</span>
                  <span className="text-emerald-400">يُحسب عند التوصيل</span>
                </div>
                <div className="my-2 border-t border-white/10" />
                <div className="flex justify-between text-lg font-extrabold">
                  <span>الإجمالي</span>
                  <span className="gold-text">{formatYER(subtotal)}</span>
                </div>
              </div>

              <Link href="/checkout" className="btn-gold mt-6 w-full">
                إتمام الطلب <ArrowLeft size={18} />
              </Link>
              <Link
                href="/products"
                className="mt-3 flex items-center justify-center gap-2 text-sm text-stone-400 hover:text-gold-300"
              >
                <ShoppingBag size={16} /> متابعة التسوق
              </Link>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
