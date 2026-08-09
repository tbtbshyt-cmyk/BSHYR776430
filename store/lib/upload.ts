'use client';

import { supabase, isSupabaseConfigured } from './supabase';

/**
 * رفع صورة واحدة. في وضع Supabase يستخدم مسار الخادم /api/upload
 * لتجاوز حدود حجم الطلب. في الوضع المحلي يعيد data URL فوراً.
 */
export async function uploadImage(
  blob: Blob,
  options: { productId?: string; bucket?: string } = {},
): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    const form = new FormData();
    form.append('files', blob, 'image.webp');
    if (options.productId) form.append('productId', options.productId);
    form.append('bucket', options.bucket ?? 'product-images');

    const res = await fetch('/api/upload', { method: 'POST', body: form });
    if (!res.ok) throw new Error('فشل رفع الصورة للخادم');
    const data = await res.json();
    return data.urls?.[0]?.url ?? '';
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
