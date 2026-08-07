'use client';

import { useRef, useState } from 'react';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { uploadImage } from '@/lib/supabase/upload';

/**
 * رافع صور متعدد: يرفع إلى Supabase Storage في وضع الإنتاج،
 * ويحوّل إلى data URL في الوضع التجريبي. يعرض قائمة صور مع إمكانية الحذف.
 */
export function ImageUploader({
  bucket = 'product-images',
  images,
  onChange,
}: {
  bucket?: 'product-images' | 'banners';
  images: string[];
  onChange: (images: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          setError('يمكن رفع ملفات الصور فقط');
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          setError('حجم الصورة يجب أن يكون أقل من 5 ميجابايت');
          continue;
        }
        const { url } = await uploadImage(bucket, file);
        uploaded.push(url);
      }
      if (uploaded.length) onChange([...images, ...uploaded]);
    } catch (e: any) {
      setError(e?.message ?? 'فشل رفع الصورة');
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
            <Loader2 size={22} className="animate-spin" />
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
        <ImageIcon size={12} /> الصور المسموحة: JPG, PNG, WebP حتى 5 ميجابايت.
      </p>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
