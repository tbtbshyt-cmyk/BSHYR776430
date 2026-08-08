'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, CheckCircle2, X, Sparkles } from 'lucide-react';
import type { Product } from '@/lib/types';
import { processImage, matchImageToProduct, formatBytes } from '@/lib/image-processor';
import { updateProduct } from '@/lib/admin';

interface Item {
  file: File;
  name: string;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  matchedTo?: string;
  matchedTitle?: string;
  error?: string;
  originalSize: number;
  newSize?: number;
}

/**
 * رافع صور بالجملة:
 *  - يقبل 30-50+ صورة دفعة واحدة.
 *  - يضغطها ويحوّلها إلى WebP بأبعاد مناسبة.
 *  - يربط كل صورة بالمنتج المناسب تلقائياً عبر اسم الملف.
 */
export function BulkImageUploader({
  products,
  onDone,
}: {
  products: Product[];
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const next: Item[] = Array.from(files).map((file) => ({
      file,
      name: file.name,
      preview: URL.createObjectURL(file),
      status: 'pending',
      originalSize: file.size,
    }));
    setItems((cur) => [...cur, ...next]);
  };

  const remove = (i: number) => {
    setItems((cur) => cur.filter((_, idx) => idx !== i));
  };

  const run = async () => {
    setRunning(true);
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.status === 'done') continue;
      setItems((cur) => cur.map((x, idx) => (idx === i ? { ...x, status: 'processing' } : x)));
      try {
        const processed = await processImage(it.file, { maxSize: 1200, quality: 0.82 });
        const match = matchImageToProduct(it.name, products);

        if (match) {
          const product = products.find((p) => p.id === match.id)!;
          // أضف الصورة للمنتج (دون تكرار)
          const images = Array.from(new Set([...(product.images ?? []), processed.dataUrl]));
          await updateProduct(match.id, { images });
        }

        setItems((cur) =>
          cur.map((x, idx) =>
            idx === i
              ? {
                  ...x,
                  status: 'done',
                  matchedTo: match?.id,
                  matchedTitle: match?.title_ar,
                  newSize: processed.sizeBytes,
                }
              : x,
          ),
        );
      } catch (e: any) {
        setItems((cur) =>
          cur.map((x, idx) =>
            idx === i ? { ...x, status: 'error', error: e?.message ?? 'خطأ' } : x,
          ),
        );
      }
    }
    setRunning(false);
    onDone();
  };

  const done = items.filter((x) => x.status === 'done').length;
  const matched = items.filter((x) => x.matchedTo).length;

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 font-bold">
        <Sparkles size={18} className="text-gold-400" /> رفع الصور بالجملة بالذكاء الاصطناعي
      </h3>
      <p className="mb-4 text-xs text-stone-400">
        ارفع 30 إلى 50 صورة دفعة واحدة. سيتم ضغطها وتحويلها إلى WebP، وربطها تلقائياً
        بالمنتج المطابق لاسم الملف (المعرّف أو الباركود أو الاسم).
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />
      <div className="flex flex-wrap gap-2">
        <button onClick={() => inputRef.current?.click()} className="btn-ghost !py-2 text-sm">
          <Upload size={16} /> اختيار الصور
        </button>
        <button
          onClick={run}
          disabled={running || items.length === 0}
          className="btn-gold !py-2 text-sm"
        >
          {running ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          معالجة ورفع {items.length} صورة
        </button>
        {items.length > 0 && (
          <button onClick={() => setItems([])} className="btn-ghost !py-2 text-sm">
            مسح الكل
          </button>
        )}
      </div>

      {items.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-stone-400">
            <span>الإجمالي: {items.length}</span>
            <span className="text-emerald-400">تم: {done}</span>
            <span className="text-gold-300">رُبطت بمنتج: {matched}</span>
          </div>

          <div className="mt-4 grid max-h-80 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
            {items.map((it, i) => (
              <div
                key={i}
                className={`relative overflow-hidden rounded-lg border bg-ink-900 ${
                  it.status === 'error' ? 'border-red-500/50' : it.matchedTo ? 'border-emerald-500/40' : 'border-white/10'
                }`}
              >
                <div className="aspect-square w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.preview} alt={it.name} className="h-full w-full object-cover" />
                </div>
                <button
                  onClick={() => remove(i)}
                  className="absolute left-1 top-1 rounded-full bg-ink-950/80 p-1 text-white"
                >
                  <X size={12} />
                </button>
                <div className="p-2 text-[10px] leading-tight">
                  <p className="truncate text-stone-300" title={it.name}>{it.name}</p>
                  {it.status === 'processing' && <p className="text-amber-400">جاري المعالجة...</p>}
                  {it.status === 'done' && (
                    <>
                      {it.matchedTitle ? (
                        <p className="flex items-center gap-1 text-emerald-400">
                          <CheckCircle2 size={10} /> {it.matchedTitle}
                        </p>
                      ) : (
                        <p className="text-stone-500">لم يُطابق منتج</p>
                      )}
                      {it.newSize && it.newSize < it.originalSize && (
                        <p className="text-stone-500">
                          {formatBytes(it.originalSize)} ← {formatBytes(it.newSize)}
                        </p>
                      )}
                    </>
                  )}
                  {it.status === 'error' && <p className="text-red-400">{it.error}</p>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
