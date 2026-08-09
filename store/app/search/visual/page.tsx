'use client';

import { useEffect, useRef, useState } from 'react';
import { getProducts } from '@/lib/store';
import { visualSearch } from '@/lib/visual-search';
import { ProductGrid } from '@/components/ProductGrid';
import { Camera, Loader2, Search, X } from 'lucide-react';
import type { Product } from '@/lib/types';

export default function VisualSearchPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [results, setResults] = useState<Product[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const onFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('يرجى رفع صورة صالحة');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    setResults(null);
    try {
      const found = await visualSearch(file, products, 12);
      setResults(found);
    } catch {
      setError('تعذّر تحليل الصورة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x py-10">
      <h1 className="flex items-center gap-2 font-display text-3xl font-black">
        <Camera className="text-gold-400" /> البحث بالصورة
      </h1>
      <p className="mt-2 text-sm text-stone-400">ارفع صورة منتج وسنجد لك الأقرب إليه في المتجر.</p>

      <div className="card mt-6 flex flex-col items-center gap-4 p-8 text-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
        />
        {preview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="بحث" className="h-48 rounded-xl object-cover" />
            <button
              onClick={() => { setPreview(null); setResults(null); }}
              className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gold-400/40 text-gold-300 hover:bg-gold-400/5"
          >
            <Search size={28} />
            <span className="text-sm">اختر صورة</span>
          </button>
        )}
        {loading && (
          <p className="flex items-center gap-2 text-sm text-gold-300">
            <Loader2 size={16} className="animate-spin" /> جاري البحث...
          </p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      {results && (
        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl font-bold">النتائج المشابهة</h2>
          <ProductGrid products={results} />
        </section>
      )}
    </div>
  );
}
