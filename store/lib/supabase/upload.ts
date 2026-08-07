import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * رفع صورة إلى حاوية Supabase Storage.
 * في الوضع التجريبي (بدون مفاتيح) يُرجِع كائن بيانات محلي (data URL).
 */
export async function uploadImage(
  bucket: 'product-images' | 'banners' | 'payment-proofs',
  file: File,
): Promise<UploadResult> {
  if (isSupabaseConfigured && supabase) {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || 'image/jpeg',
      });
    if (error) throw new Error(`فشل رفع الصورة: ${error.message}`);
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: data.publicUrl, path };
  }

  // وضع تجريبي: تحويل الصورة إلى data URL للمعاينة
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ url: reader.result as string, path: '' });
    reader.onerror = () => reject(new Error('تعذّرت قراءة الصورة'));
    reader.readAsDataURL(file);
  });
}
