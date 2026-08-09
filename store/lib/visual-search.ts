'use client';

import type { Product } from './types';

/**
 * بحث بصري مرجّح (weighted visual search).
 * يستخرج بصمات بسيطة من الصور (متوسط الألوان + كثافة النسيج) ويقارنها
 * بمنتجات الكتالوج. لا يحتاج مفاتيح خارجية ويعمل بالكامل في المتصفح.
 */

type Signature = {
  r: number;
  g: number;
  b: number;
  brightness: number;
  edges: number;
};

const cache = new Map<string, Signature>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function signature(src: string): Promise<Signature> {
  if (cache.has(src)) return cache.get(src)!;
  try {
    const img = await loadImage(src);
    const size = 16; // بصمة 16x16
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);

    let r = 0, g = 0, b = 0, brightness = 0;
    const gray: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      const v = (data[i] + data[i + 1] + data[i + 2]) / 3;
      gray.push(v);
      brightness += v;
    }
    const n = (data.length / 4) || 1;
    r /= n; g /= n; b /= n; brightness /= n;

    // حساب الحواف (تغييرات الرمادي بين البكسلات)
    let edges = 0;
    for (let y = 1; y < size; y++) {
      for (let x = 1; x < size; x++) {
        const i = y * size + x;
        edges += Math.abs(gray[i] - gray[i - 1]) + Math.abs(gray[i] - gray[i - size]);
      }
    }

    const sig = { r, g, b, brightness, edges };
    cache.set(src, sig);
    return sig;
  } catch {
    return { r: 0, g: 0, b: 0, brightness: 0, edges: 0 };
  }
}

function distance(a: Signature, b: Signature): number {
  const color =
    Math.abs(a.r - b.r) * 0.4 +
    Math.abs(a.g - b.g) * 0.4 +
    Math.abs(a.b - b.b) * 0.4;
  const bright = Math.abs(a.brightness - b.brightness) * 0.3;
  const edge = Math.abs(a.edges - b.edges) * 0.2;
  return color + bright + edge;
}

/**
 * يبحث عن أقرب المنتجات للصورة المرفوعة.
 */
export async function visualSearch(file: File, products: Product[], limit = 12): Promise<Product[]> {
  const url = URL.createObjectURL(file);
  try {
    const target = await signature(url);
    const scored = await Promise.all(
      products.map(async (p) => {
        const sig = await signature(p.images[0]);
        return { p, d: distance(target, sig) };
      }),
    );
    return scored
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => x.p);
  } finally {
    URL.revokeObjectURL(url);
  }
}
