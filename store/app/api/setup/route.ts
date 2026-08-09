import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * يتحقق من حالة تهيئة قاعدة البيانات ويعيد تعليمات/SQL الجاهز.
 * GET /api/setup → حالة الجداول
 * GET /api/setup?sql=1 → نص SQL الكامل للنسخ
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  // إعادة نص SQL الكامل
  if (url.searchParams.get('sql') === '1') {
    try {
      const sql = await readFile(join(process.cwd(), 'FULL_SETUP.sql'), 'utf8');
      return new NextResponse(sql, {
        headers: {
          'Content-Type': 'application/sql; charset=utf-8',
          'Content-Disposition': 'attachment; filename="FULL_SETUP.sql"',
        },
      });
    } catch {
      return NextResponse.json({ error: 'ملف التهيئة غير موجود' }, { status: 404 });
    }
  }

  // فحص الجداول الأساسية
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { configured: false, missing: ['env'], message: 'متغيرات بيئة Supabase غير مضبوطة' },
      { status: 200 },
    );
  }

  const required = [
    'products',
    'categories',
    'orders',
    'order_items',
    'banners',
    'campaigns',
    'ai_settings',
  ];

  const status: Record<string, boolean> = {};
  for (const table of required) {
    try {
      const res = await fetch(
        `${supabaseUrl}/rest/v1/${table}?select=*&limit=0`,
        { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
      );
      status[table] = res.ok;
    } catch {
      status[table] = false;
    }
  }

  const missing = Object.entries(status).filter(([, ok]) => !ok).map(([t]) => t);
  return NextResponse.json({
    configured: true,
    ready: missing.length === 0,
    tables: status,
    missing,
  });
}
