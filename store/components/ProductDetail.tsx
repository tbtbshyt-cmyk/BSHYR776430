'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Truck, ShieldCheck, RefreshCw, ShoppingBag, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatYER, discountPercent } from '@/lib/utils';
import { useCart } from '@/lib/cart-store';

const SizeGuide = dynamic(
  () => import('./SizeGuide').then((m) => m.SizeGuide),
  { ssr: false, loading: () => <p className="text-sm text-stone-500">جاري تحميل حاسبة المقاسات...</p> },
);

export function ProductDetail({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [size, setSize] = useState<string | null>(
    product.sizes.length === 1 ? product.sizes[0] : null,
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const add = useCart((s) => s.add);
  const router = useRouter();

  const off = discountPercent(product.price, product.compare_at_price);
  const outOfStock = product.stock_quantity === 0;

  const handleAdd = () => {
    if (!size || outOfStock) return;
    add(product, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    if (!size || outOfStock) return;
    add(product, size, qty);
    router.push('/checkout');
  };

  return (
    <div className="container-x py-10">
      <Link href="/products" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-400 hover:text-gold-300">
        <ChevronRight size={16} /> العودة للمنتجات
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* معرض الصور */}
        <div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-gold-400/20 bg-ink-800 shadow-gold">
            <Image
              src={product.images[active]}
              alt={product.title_ar}
              fill
              priority
              sizes="(max-width:1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
              {off > 0 && (
                <span className="badge bg-red-600/90 text-white">وفّر {off}%</span>
              )}
              {product.is_featured && (
                <span className="badge bg-gold-gradient text-ink-950">مميز</span>
              )}
            </div>
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setActive((i) => (i - 1 + product.images.length) % product.images.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 p-2 text-gold-300 hover:bg-ink-950"
                  aria-label="الصورة التالية"
                >
                  <ChevronRight />
                </button>
                <button
                  onClick={() => setActive((i) => (i + 1) % product.images.length)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/70 p-2 text-gold-300 hover:bg-ink-950"
                  aria-label="الصورة السابقة"
                >
                  <ChevronLeft />
                </button>
              </>
            )}
          </div>

          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  className={`relative h-20 w-16 overflow-hidden rounded-xl border-2 transition ${
                    active === i ? 'border-gold-400' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* المعلومات */}
        <div>
          {product.category && (
            <Link
              href={`/products?slug=${(product.category as any).slug}`}
              className="text-sm font-semibold text-gold-400 hover:text-gold-300"
            >
              {product.category.name_ar}
            </Link>
          )}
          <h1 className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">
            {product.title_ar}
          </h1>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-black text-gold-300">{formatYER(product.price)}</span>
            {off > 0 && (
              <span className="mb-1 text-lg text-stone-500 line-through">
                {formatYER(product.compare_at_price!)}
              </span>
            )}
          </div>

          <p className="mt-5 leading-8 text-stone-300">{product.description_ar}</p>

          {/* المخزون */}
          <div className="mt-5">
            {outOfStock ? (
              <span className="badge bg-red-600/20 text-red-400">نفد المخزون</span>
            ) : product.stock_quantity <= 5 ? (
              <span className="badge bg-amber-600/20 text-amber-400">
                آخر {product.stock_quantity} قطع - سارع بالطلب
              </span>
            ) : (
              <span className="badge bg-emerald-600/20 text-emerald-400">
                <Check size={14} /> متوفر في المخزون
              </span>
            )}
          </div>

          {/* المقاسات */}
          <div className="mt-6">
            <SizeGuide
              title={product.title_ar}
              categoryId={product.category_id}
              availableSizes={product.sizes}
              selected={size}
              onSelect={setSize}
            />
          </div>

          {/* الكمية + أزرار */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 p-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="rounded-lg p-2 hover:bg-white/5"
              >
                -
              </button>
              <span className="w-10 text-center font-bold">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(product.stock_quantity, q + 1))}
                className="rounded-lg p-2 hover:bg-white/5"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={!size || outOfStock}
              className="btn-ghost flex-1"
            >
              <ShoppingBag size={18} />
              {added ? 'تمت الإضافة ✓' : 'أضف للسلة'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!size || outOfStock}
              className="btn-gold flex-1"
            >
              اشترِ الآن
            </button>
          </div>

          {!size && !outOfStock && product.sizes[0] !== 'one-size' && (
            <p className="mt-2 text-xs text-amber-400">الرجاء اختيار المقاس قبل الإضافة</p>
          )}

          {/* مزايا */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/5 pt-6 text-center text-xs text-stone-300">
            <div className="flex flex-col items-center gap-2">
              <Truck className="text-gold-400" size={22} />
              <span>توصيل سريع لجميع المحافظات</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <ShieldCheck className="text-gold-400" size={22} />
              <span>جودة مضمونة 100%</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="text-gold-400" size={22} />
              <span>إرجاع خلال 7 أيام</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-xl border border-gold-400/20 bg-gold-400/5 p-3 text-sm text-stone-300">
            <Store size={18} className="flex-shrink-0 text-gold-400" />
            <span>يُباع ويُشحن من قبل <strong className="text-gold-300">أبو بشار ستورز</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
