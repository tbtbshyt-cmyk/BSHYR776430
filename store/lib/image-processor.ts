'use client';

/**
 * ضغط ومعالجة الصور في المتصفح قبل الرفع.
 * يقلل مساحة التخزين ويسرّع تحميل المتجر عبر ضبط الأبعاد والجودة.
 */

export interface ProcessedImage {
  blob: Blob;
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function processImage(
  file: File,
  options: { maxSize?: number; quality?: number } = {},
): Promise<ProcessedImage> {
  const { maxSize = 1200, quality = 0.82 } = options;

  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;

  if (width > maxSize || height > maxSize) {
    if (width >= height) {
      height = Math.round((height * maxSize) / width);
      width = maxSize;
    } else {
      width = Math.round((width * maxSize) / height);
      height = maxSize;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/webp', quality),
  );

  const dataUrl = await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(blob);
  });

  return { blob, dataUrl, width, height, sizeBytes: blob.size };
}

/**
 * ربط "ذكي" لاسم ملف الصورة بأحد المنتجات.
 * يبحث في: المعرّف، الباركود، الاسم (عربي/إنجليزي)، والكلمات المفتاحية.
 */
export function matchImageToProduct(
  filename: string,
  products: { id: string; title_ar: string; barcode?: string | null }[],
): { id: string; title_ar: string } | null {
  const base = filename
    .toLowerCase()
    .replace(/\.(jpe?g|png|webp|avif|gif)$/i, '')
    .replace(/[_\-]+/g, ' ')
    .trim();
  const digits = base.replace(/\D/g, '');

  // 1) مطابقة بمعرّف المنتج (p1, p2...)
  const byId = products.find((p) => base === p.id.toLowerCase());
  if (byId) return byId;

  // 2) مطابقة بالباركود
  if (digits) {
    const byBarcode = products.find((p) => p.barcode && p.barcode.includes(digits));
    if (byBarcode) return byBarcode;
  }

  // 3) مطابجة نصية بالاسم
  const tokens = base.split(/\s+/).filter((t) => t.length > 2);
  let best: { id: string; title_ar: string; score: number } | null = null;
  for (const p of products) {
    const title = p.title_ar.toLowerCase();
    let score = 0;
    for (const t of tokens) {
      if (title.includes(t)) score += t.length;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { ...p, score };
    }
  }
  return best;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
