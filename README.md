# أبو بشار ستورز — المستودع الرئيسي

مستودع متعدد المجلدات (monorepo) يحتوي على:

```
/
├── .github/workflows/ci.yml    # خط أنابيب الفحص التلقائي (CI)
├── abu_bashar_schema.sql        # مخطط قاعدة البيانات والجداول وRLS
├── abubashar_rpc.sql            # دوال RPC الذكية
├── abubashar_seed.sql           # البيانات التجريبية وحسابات الموظفين
├── abubashar_v2_*.sql           # البانرات، الباركود، إثبات الدفع/الـ OCR
├── abubashar_v3_security*.sql   # ترقية الأمان وتصلّيب RLS
└── store/                       # تطبيق Next.js 15 (متجر + لوحة تحكم + تطبيق توصيل)
```

## البدء السريع

```bash
cd store
npm install
cp .env.example .env.local   # اضبط مفاتيح Supabase (اختياري للوضع التجريبي)
npm run dev
```

## التكامل المستمر (CI)

كل `push` أو `pull_request` على `main` يُشغّل تلقائياً على Node.js 20:
1. `npm ci`
2. `npm run lint`
3. `npx tsc --noEmit`
4. `npm run build`

(كل الأوامر تُنفّذ داخل مجلد `store/` عبر `defaults.run.working-directory`).

## ترتيب تشغيل ملفات SQL

```
1. abu_bashar_schema.sql
2. abubashar_rpc.sql
3. abubashar_v2_banners_barcode_proof.sql
4. abubashar_v3_security_hardening.sql
5. abubashar_seed.sql
```

التفاصيل الكاملة في [`store/TECHNICAL_MAINTENANCE.md`](store/TECHNICAL_MAINTENANCE.md)
ودليل النشر في [`store/VERCEL_DEPLOY.md`](store/VERCEL_DEPLOY.md).

## ترتيب تشغيل ملفات SQL (محدّث)

```
1. abu_bashar_schema.sql
2. abubashar_rpc.sql
3. abubashar_v2_banners_barcode_proof.sql
4. abubashar_v3_security_hardening.sql
5. abubashar_v4_role_metadata_sync.sql
6. abubashar_v5_scaling.sql          ← فهارس الأداء، عرض ملخص الطلبات، سجل الحالات
7. abubashar_v6_storage_policies.sql ← حاويات الصور وسياسات التخزين
8. abubashar_seed.sql
```
