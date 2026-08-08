'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductGrid } from '@/components/ProductGrid';
import { getCategories, getProducts } from '@/lib/store';
import Link from 'next/link';
import type { Category, Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';

function ProductsContent({ slug, q }: { slug?: string; q?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getCategories(), getProducts({ categorySlug: slug, query: q })])
      .then(([c, p]) => {
        setCategories(c);
        setProducts(p);
      })
      .finally(() => setLoading(false));
  }, [slug, q]);

  const activeCat = categories.find((c) => c.slug === slug);
  const title = q ? `نتائج البحث: ${q}` : activeCat ? activeCat.name_ar : 'جميع المنتجات';
  const topLevel = categories.filter((c) => !c.parent_id);

  return (
    <div className="container-x py-10">
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <Link href="/" className="hover:text-gold-300">الرئيسية</Link>
          <span>/</span>
          <span className="text-stone-300">المنتجات</span>
          {activeCat && (
            <>
              <span>/</span>
              <span className="text-gold-300">{activeCat.name_ar}</span>
            </>
          )}
        </div>
        <h1 className="mt-3 font-display text-3xl font-black sm:text-4xl">{title}</h1>
        <div className="divider-gold mt-3" />
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/products"
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            !slug ? 'border-gold-400 bg-gold-gradient text-ink-950'
              : 'border-white/10 text-stone-300 hover:border-gold-400/50'
          }`}
        >
          الكل
        </Link>
        {topLevel.map((c) => (
          <Link
            key={c.id}
            href={`/products?slug=${c.slug}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              slug === c.slug
                ? 'border-gold-400 bg-gold-gradient text-ink-950'
                : 'border-white/10 text-stone-300 hover:border-gold-400/50'
            }`}
          >
            {c.name_ar}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gold-400"><Loader2 className="animate-spin" /></div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}

function ProductsPageInner() {
  const params = useSearchParams();
  return (
    <ProductsContent
      slug={params.get('slug') ?? undefined}
      q={params.get('q') ?? undefined}
    />
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="container-x flex min-h-[40vh] items-center justify-center text-gold-400">
        جاري التحميل...
      </div>
    }>
      <ProductsPageInner />
    </Suspense>
  );
}
