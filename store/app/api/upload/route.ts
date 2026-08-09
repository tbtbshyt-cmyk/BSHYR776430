import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
// حجم أقصى 50 ميجابايت لمسار الرفع (متعدد الصور)
export const maxDuration = 60;

/**
 * مسار خادم لرفع الصور.
 * يستقبل multipart/form-data ويحتوي على:
 *  - files: صورة أو أكثر
 *  - productId? : معرّف المنتج (للربط)
 *  - bucket? : اسم الحاوية (افتراضياً product-images)
 *
 * في وضع Supabase، يُرفع إلى Storage عبر SUPABASE_URL/SERVICE_ROLE_KEY.
 * في الوضع المحلي، يعيد روابط data URLs للمعاينة فقط.
 */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    const productId = String(form.get('productId') ?? '');
    const bucket = String(form.get('bucket') ?? 'product-images');

    if (files.length === 0) {
      return NextResponse.json({ error: 'لم تُرفع أي ملفات' }, { status: 400 });
    }

    const totalSize = files.reduce((s, f) => s + f.size, 0);
    if (totalSize > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'الحجم الإجمالي يتجاوز 50 ميجابايت' },
        { status: 413 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isSupabase = Boolean(supabaseUrl && serviceKey);

    const urls: { name: string; url: string; size: number }[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 10 * 1024 * 1024) continue;

      const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      if (isSupabase) {
        // رفع إلى Supabase Storage عبر REST API (لا يحتاج مكتبة supabase-js على الخادم)
        const res = await fetch(
          `${supabaseUrl}/storage/v1/object/${bucket}/${productId ? productId + '/' : ''}${safeName}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${serviceKey}`,
              apikey: serviceKey!,
              'Content-Type': file.type,
              'x-upsert': 'true',
            },
            body: Buffer.from(await file.arrayBuffer()),
          },
        );
        if (!res.ok) {
          // أضف رسالة الخطأ لكن أكمل باقي الملفات
          continue;
        }
        urls.push({
          name: file.name,
          url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${productId ? productId + '/' : ''}${safeName}`,
          size: file.size,
        });
      } else {
        // وضع محلي: أعد بيانات الصورة كـ data URL للمعاينة/الديمو
        const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
        urls.push({
          name: file.name,
          url: `data:${file.type};base64,${b64}`,
          size: file.size,
        });
      }
    }

    return NextResponse.json({
      success: true,
      count: urls.length,
      productId: productId || null,
      bucket,
      urls,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? 'فشل الرفع' },
      { status: 500 },
    );
  }
}
