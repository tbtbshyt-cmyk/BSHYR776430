'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, Plus, CheckCircle2 } from 'lucide-react';
import { processImage } from '@/lib/image-processor';
import { createProduct } from '@/lib/admin';
import type { Category } from '@/lib/types';

interface Extracted {
  title_ar: string;
  description_ar: string;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  sizes: string[];
  image: string;
}

/**
 * استخراج حتى 10 صور دفعة واحدة وإنشائها كمنتجات تلقائياً.
 */
export function BulkExtract({ categories, cfg }: { categories: Category[]; cfg: { provider: string; model: string; apiKey: string } }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Extracted[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    if (files.length > 10) {
      setError('يمكن رفع 10 صور كحد أقصى');
      return;
    }
    setError(null);
    setResults([]);
    const urls: string[] = [];
    for (const f of Array.from(files).slice(0, 10)) {
      const p = await processImage(f, { maxSize: 1200, quality: 0.82 });
      urls.push(p.dataUrl);
    }
    setPreviews(urls);
  };

  const run = async () => {
    if (previews.length === 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extract_products',
          provider: cfg.provider,
          model: cfg.model,
          apiKey: cfg.apiKey,
          images: previews.map((url) => ({ url })),
          categories: categories.map((c) => ({ id: c.id, name_ar: c.name_ar })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'فشل الاستخراج');
      setResults(data.products);

      for (const p of data.products as Extracted[]) {
        await createProduct({
          title_ar: p.title_ar,
          description_ar: p.description_ar,
          price: p.price,
          compare_at_price: p.compare_at_price,
          stock_quantity: 10,
          category_id: p.category_id,
          sizes: p.sizes,
          images: [p.image],
          is_featured: false,
          is_active: true,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء الاستخراج');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 font-bold">
        <Upload size={18} className="text-gold-400" /> استخراج جماعي (حتى 10 صور)
      </h3>
      <p className="mb-4 text-xs text-stone-400">
        ارفع صور المنتجات، سيستخرج الذكاء الاصطناعي العنوان والوصف والسعر والفئة والمقاسات ثم يُنشئها تلقائياً.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost !py-2 text-sm">
          <Upload size={16} /> اختيار الصور
        </button>
        <button type="button" onClick={run} disabled={busy || previews.length === 0} className="btn-gold !py-2 text-sm">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          استخراج وإضافة {previews.length} منتج
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {previews.map((src, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              {results[i] && (
                <div className="absolute inset-x-0 bottom-0 bg-ink-950/80 p-1 text-center text-[9px] text-emerald-300">
                  <CheckCircle2 size={12} className="mx-auto" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-emerald-400">تم إنشاء {results.length} منتج:</p>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg bg-ink-900 p-2 text-xs">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span className="flex-1 truncate">{r.title_ar}</span>
              <span className="font-bold text-gold-300">{r.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
