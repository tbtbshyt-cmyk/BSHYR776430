'use client';

import { useEffect, useState } from 'react';
import { useParams, notFound } from 'next/navigation';
import { getProduct, getProducts } from '@/lib/store';
import { ProductDetail } from '@/components/ProductDetail';
import { ProductGrid } from '@/components/ProductGrid';
import type { Product } from '@/lib/types';
import { Loader2 } from 'lucide-react';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [related, setRelated] = useState<Product[]>([]);

  useEffect(() => {
    (async () => {
      const p = await getProduct(id);
      setProduct(p);
      if (p) {
        const all = await getProducts({});
        setRelated(
          all.filter((x) => x.category_id === p.category_id && x.id !== p.id).slice(0, 4),
        );
      }
    })();
  }, [id]);

  if (product === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gold-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }
  if (product === null) notFound();

  return (
    <>
      <ProductDetail product={product} />
      {related.length > 0 && (
        <section className="container-x py-14">
          <h2 className="section-title mb-6">قد يعجبك أيضاً</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </>
  );
}
