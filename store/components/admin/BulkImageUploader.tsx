'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { processImage, matchImageToProduct, formatBytes } from '@/lib/image-processor';
import { updateProduct } from '@/lib/admin';

interface Item {
  id: string;
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
 * رافع صور بالجملة.
 * مهم: كل الأزرار type="button" لأن المكوّن يُعرض داخل نموذج منتج (<form>).
 */
export function BulkImageUploader({ products, onDone }: { products: Product[]; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const showToast = (type: 'error' | 'success', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 4000);
  };

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid: Item[] = [];
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        errors.push(`${file.name}: ليس صورة`);
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        errors.push(`${file.name}: أكبر من 8 ميجابايت`);
        continue;
      }
      valid.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        preview: URL.createObjectURL(file),
        status: 'pending',
        originalSize: file.size,
      });
    }
    if (valid.length) setItems((cur) => [...cur, ...valid]);
    if (errors.length) showToast('error', errors.slice(0, 3).join(' · '));
    else if (valid.length) showToast('success', `تمت إضافة ${valid.length} صورة جاهزة للمعالجة`);
  };

  const remove = (id: string) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  };

  const run = async () => {
    if (running || items.length === 0) return;
    setRunning(true);
    let ok = 0;
    let failed = 0;
    let matchedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.status === 'done') { ok++; continue; }
      setItems((cur) => cur.map((x) => (x.id === it.id ? { ...x, status: 'processing' } : x)));
      try {
        const processed = await processImage(it.file, { maxSize: 1200, quality: 0.82 });
        const match = matchImageToProduct(it.name, products);
        if (match) {
          const product = products.find((p) => p.id === match.id);
          if (product) {
            const images = Array.from(new Set([...(product.images ?? []), processed.dataUrl]));
            await updateProduct(match.id, { images });
            matchedCount++;
          }
        }
        setItems((cur) =>
          cur.map((x) =>
            x.id === it.id
              ? { ...x, status: 'done', matchedTo: match?.id, matchedTitle: match?.title_ar, newSize: processed.sizeBytes }
              : x,
          ),
        );
        ok++;
      } catch (e: any) {
        failed++;
        setItems((cur) =>
          cur.map((x) => (x.id === it.id ? { ...x, status: 'error', error: e?.message ?? 'خطأ في المعالجة' } : x)),
        );
      }
    }

    setRunning(false);
    onDone();
    if (failed > 0) showToast('error', `اكتمل: ${ok} نجاح، ${failed} فشل، رُبط ${matchedCount} بمنتج`);
    else showToast('success', `تمت معالجة ${ok} صورة وربط ${matchedCount} بمنتجاتها`);
  };

  const done = items.filter((x) => x.status === 'done').length;
  const matched = items.filter((x) => x.matchedTo).length;
  const errors = items.filter((x) => x.status === 'error').length;

  return (
    <div className="card p-5">
      <h3 className="mb-1 flex items-center gap-2 font-bold">
        <Sparkles size={18} className="text-gold-400" /> رفع الصور بالجملة
      </h3>
      <p className="mb-4 text-xs leading-6 text-stone-400">
        ارفع حتى 50 صورة دفعة واحدة (حد 8MB للصورة). تُضغط وتُحوّل إلى WebP وتُربط تلقائياً
        بالمنتج المطابق لاسم الملف (المعرّف/الباركود/الاسم).
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
        <button type="button" onClick={() => inputRef.current?.click()} className="btn-ghost !py-2 text-sm">
          <Upload size={16} /> اختيار الصور
        </button>
        <button type="button" onClick={run} disabled={running || items.length === 0} className="btn-gold !py-2 text-sm">
          {running ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          معالجة ورفع {items.length} صورة
        </button>
        {items.length > 0 && (
          <button type="button" onClick={() => setItems([])} className="btn-ghost !py-2 text-sm" disabled={running}>
            مسح الكل
          </button>
        )}
      </div>

      {toast && (
        <div
          className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-sm ${
            toast.type === 'error'
              ? 'border-red-500/30 bg-red-500/10 text-red-300'
              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {items.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
            <span>الإجمالي: {items.length}</span>
            <span className="text-emerald-400">تم: {done}</span>
            <span className="text-gold-300">رُبطت: {matched}</span>
            {errors > 0 && <span className="text-red-400">أخطاء: {errors}</span>}
          </div>

          <div className="mt-4 grid max-h-96 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 md:grid-cols-5">
            {items.map((it) => (
              <div
                key={it.id}
                className={`relative overflow-hidden rounded-lg border bg-ink-900 ${
                  it.status === 'error'
                    ? 'border-red-500/50'
                    : it.status === 'done'
                      ? 'border-emerald-500/40'
                      : 'border-white/10'
                }`}
              >
                <div className="aspect-square w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.preview} alt={it.name} className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="absolute right-1 top-1 rounded-full bg-ink-950/80 p-1 text-white hover:bg-red-600"
                  aria-label="حذف"
                >
                  <X size={12} />
                </button>
                {it.status === 'processing' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60">
                    <Loader2 size={20} className="animate-spin text-gold-300" />
                  </div>
                )}
                {it.status === 'done' && (
                  <div className="absolute bottom-0 w-full bg-ink-950/80 p-1.5 text-center text-[9px] leading-tight text-emerald-300">
                    ✓ {it.matchedTitle ? it.matchedTitle.slice(0, 18) : 'تم'}
                    {it.newSize && it.newSize < it.originalSize && (
                      <div className="text-stone-500">{formatBytes(it.originalSize)} ← {formatBytes(it.newSize)}</div>
                    )}
                  </div>
                )}
                {it.status === 'error' && (
                  <div className="absolute bottom-0 w-full bg-red-950/90 p-1.5 text-center text-[9px] text-red-200">
                    {it.error}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
