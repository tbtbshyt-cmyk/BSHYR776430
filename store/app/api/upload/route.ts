import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
// حد أقصى 50 ميجابايت لمسار الرفع (متعدد الصور)
export const maxDuration = 60;

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

/**
 * مسار خادم حقيقي لرفع الصور.
 *  - يستقبل multipart/form-data
 *  - يضغط الصور ويحوّلها إلى WebP (عبر sharp)
 *  - يرفعها إلى Supabase Storage عند توفر مفاتيح الخادم
 *  - في وضع الديمو يعيد data URLs
 *
 * الحقول:
 *  files: صورة أو أكثر (مطلوب)
 *  productId?: معرّف المنتج للربط
 *  bucket?: اسم الحاوية (افتراضي product-images)
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    const productId = String(form.get('productId') ?? '');
    const bucket = String(form.get('bucket') ?? 'product-images');

    if (files.length === 0) {
      return NextResponse.json({ error: 'لم تُرفع أي ملفات' }, { status: 400, headers: corsHeaders() });
    }

    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'الحجم الإجمالي يتجاوز 50 ميجابايت' },
        { status: 413, headers: corsHeaders() },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isSupabase = Boolean(supabaseUrl && serviceKey);

    // تحميل sharp ديناميكياً (فقط على الخادم)
    let sharp: any = null;
    try {
      sharp = (await import('sharp')).default;
    } catch {
      sharp = null;
    }

    const urls: { name: string; url: string; size: number; originalSize: number; error?: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        urls.push({ name: file.name, url: '', size: 0, originalSize: file.size, error: 'ليس صورة' });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        urls.push({ name: file.name, url: '', size: 0, originalSize: file.size, error: 'حجم الصورة أكبر من 10MB' });
        continue;
      }

      let buffer = Buffer.from(await file.arrayBuffer());
      let outType = file.type;
      let outExt = (file.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');

      // ضغط الصورة وتحويلها إلى WebP
      if (sharp) {
        try {
          buffer = await sharp(buffer)
            .rotate() // احترام اتجاه EXIF
            .resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          outType = 'image/webp';
          outExt = 'webp';
        } catch {
          // لو فشل الضغط نكمل بالصورة الأصلية
        }
      }

      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${outExt}`;
      const path = `${productId ? productId + '/' : ''}${safeName}`;

      if (isSupabase) {
        const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey!,
            'Content-Type': outType,
            'x-upsert': 'true',
          },
          body: buffer,
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          urls.push({ name: file.name, url: '', size: buffer.length, originalSize: file.size, error: `فشل الرفع: ${res.status} ${errText.slice(0, 80)}` });
          continue;
        }
        urls.push({
          name: file.name,
          url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`,
          size: buffer.length,
          originalSize: file.size,
        });
      } else {
        // وضع محلي: data URL للمعاينة
        urls.push({
          name: file.name,
          url: `data:${outType};base64,${buffer.toString('base64')}`,
          size: buffer.length,
          originalSize: file.size,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        count: urls.filter((u) => u.url).length,
        productId: productId || null,
        bucket,
        compressed: Boolean(sharp),
        urls,
      },
      { headers: corsHeaders() },
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'فشل الرفع' },
      { status: 500, headers: corsHeaders() },
    );
  }
}
