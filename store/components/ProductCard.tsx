import Link from 'next/link';
import Image from 'next/image';
import { Tag } from 'lucide-react';
import type { Product } from '@/lib/types';
import { formatYER, discountPercent } from '@/lib/utils';

export function ProductCard({ product, compact }: { product: Product; compact?: boolean }) {
  const off = discountPercent(product.price, product.compare_at_price);
  const low = product.stock_quantity > 0 && product.stock_quantity <= 5;

  return (
    <Link
      href={`/products/${product.id}`}
      className="card shine group relative flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/40 hover:shadow-gold"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-ink-900">
        <Image
          src={product.images[0]}
          alt={product.title_ar}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          {off > 0 ? (
            <span className="badge bg-red-600/90 text-white">
              <Tag size={12} /> خصم {off}%
            </span>
          ) : (
            <span />
          )}
          {product.is_featured && (
            <span className="badge bg-gold-gradient text-ink-950">مميز</span>
          )}
        </div>
        {product.stock_quantity === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-950/70">
            <span className="rounded-lg bg-white/10 px-4 py-2 font-bold text-white">نفد المخزون</span>
          </div>
        )}
        {low && (
          <span className="absolute bottom-3 right-3 rounded-full bg-amber-600/90 px-3 py-1 text-xs font-bold text-white">
            آخر {product.stock_quantity} قطع
          </span>
        )}
      </div>

      <div className={`flex flex-1 flex-col ${compact ? 'p-2' : 'p-4'}`}>
        <h3 className={`line-clamp-2 min-h-[2.8rem] font-display font-bold leading-7 text-stone-100 group-hover:text-gold-300 ${compact ? 'text-xs leading-5 min-h-0' : ''}`}>
          {product.title_ar}
        </h3>
        <div className="mt-auto flex items-end justify-between pt-4">
          <div>
            <p className="text-lg font-extrabold text-gold-300">{formatYER(product.price)}</p>
            {off > 0 && (
              <p className="text-xs text-stone-500 line-through">
                {formatYER(product.compare_at_price!)}
              </p>
            )}
          </div>
          {product.sizes.length > 0 && product.sizes[0] !== 'one-size' && (
            <div className="flex flex-wrap justify-end gap-1">
              {product.sizes.slice(0, 3).map((s) => (
                <span key={s} className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-stone-400">
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
