# دليل النشر للإنتاج (Production Deployment)

## 1) إعداد قاعدة البيانات
نفّذ ملفات SQL على Supabase بالترتيب:
1. `../abu_bashar_schema.sql` — المخطط الأساسي والجداول وRLS والمحفّزات.
2. `../abubashar_rpc.sql` — دوال RPC الذكية.
3. `../abubashar_seed.sql` — البيانات التجريبية وحسابات الموظفين.
4. `../abubashar_v2_banners_barcode_proof.sql` — البانرات والباركود وإثبات الدفع/الـ OCR.

## 2) إعداد Supabase Storage
أنشئ حاوية تخزين عامة باسم `payment-proofs` لصور إيصالات الدفع، وأضف سياسة:
```sql
CREATE POLICY "Customers upload proofs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-proofs');
CREATE POLICY "Staff read proofs" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'payment-proofs');
```

## 3) متغيرات البيئة
```bash
cp .env.example .env.production
# ضع:
# NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## 4) البناء والتشغيل
```bash
npm install
npm run build
npm start
```

## 5) الأمان
- غيّر كلمات مرور الحسابات التجريبية فوراً من قاعدة البيانات.
- فعّل Phone Auth في Supabase مع OTP.
- راجع سياسات RLS بعد أي تعديل على الجداول.
- استخدم WAF / rate limiting أمام التطبيق.
- فعّل HTTPS عبر Vercel/Cloudflare.

## 6) أداء ملحوظ
- `First Load JS` الأقصى ≈ 191KB (ضمن الحدود الممتازة).
- معظم الصفحات static، والصفحات الديناميكية فقط `/orders/[id]` و`/products/[id]` و`/admin/orders/[id]`.
- الخطوط العربية (Cairo/Tajawal) محمّلة عبر `next/font` مع `display: swap`.

## بنية المشروع
```
app/          صفحات App Router (المتجر، الإدارة، التوصيل)
components/   مكوّنات الواجهة (Navbar, ProductCard, SizeGuide, AdminShell...)
lib/          طبقة البيانات (store, supabase/{client,server}, auth, cart-store)
types/        database.types.ts (أنواع قاعدة البيانات)
```

## الوصول الخفي للوحة الإدارة
من صفحة المتجر، انقر على شعار "أبو بشار" **5 نقرات سريعة** خلال 1.2 ثانية لتوجّهك إلى `/login`.
يمكنك أيضاً زيارة `/login` مباشرة.
