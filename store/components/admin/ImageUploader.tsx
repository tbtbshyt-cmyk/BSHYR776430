'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';

/**
 * رافع صور متعدد.
 * يستخدم مسار الخادم /api/upload (يضغط ويحفظ) — يعمل في وضع الديمو والإنتاج.
 */
export function ImageUploader({
  images,
  onChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const valid: File[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError('بعض الملفات ليست صوراً وتم تجاهلها');
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          setError('بعض الصور أكبر من 10MB وتم تجاهلها');
          continue;
        }
        valid.push(file);
      }
      if (valid.length === 0) {
        setUploading(false);
        return;
      }

      const uploaded: string[] = [];
      // رفع على دفعات لتجنب كبر الحمولة
      for (let i = 0; i < valid.length; i++) {
        setProgress(`جارٍ رفع الصورة ${i + 1} من ${valid.length}...`);
        const form = new FormData();
        form.append('files', valid[i]);
        form.append('bucket', 'product-images');

        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok || !data.urls?.[0]?.url) {
          throw new Error(data?.error ?? `فشل رفع الصورة ${i + 1}`);
        }
        uploaded.push(data.urls[0].url);
      }

      if (uploaded.length) onChange([...images, ...uploaded]);
      setProgress('');
    } catch (e: any) {
      setError(e?.message ?? 'فشل رفع الصور');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {images.map((src, i) => (
          <div
            key={i}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-ink-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`صورة ${i + 1}`} className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute left-1 top-1 rounded-full bg-red-600/90 p-1 text-white opacity-0 transition group-hover:opacity-100"
              aria-label="حذف الصورة"
            >
              <X size={14} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gold-400/30 text-stone-400 transition hover:border-gold-400/70 hover:text-gold-300 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={22} className="animate-spin" />
              <span className="px-1 text-center text-[10px] leading-tight">{progress || 'جارٍ الرفع...'}</span>
            </>
          ) : (
            <>
              <Upload size={22} />
              <span className="text-xs">رفع صورة</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      <p className="mt-2 flex items-center gap-1 text-xs text-stone-500">
        <ImageIcon size={12} /> الصور تُضغط وتُرفع تلقائياً. الحد الأقصى 10MB لكل صورة.
      </p>
      {error && <p className="mt-1 rounded-lg bg-red-500/10 p-2 text-xs text-red-300">{error}</p>}
    </div>
  );
}
