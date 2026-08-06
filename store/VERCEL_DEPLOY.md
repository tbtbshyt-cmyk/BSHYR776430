# 🚀 نشر متجر أبو بشار ستورز على Vercel

## 0) مصادقة العملاء (OTP)

- **`/otp`**: دخول العميل برقم الهاتف ورمز تحقق عبر رسالة نصية (Supabase Phone Auth).
- **`/account`**: منطقة حساب العميل (الملف الشخصي + سجل الطلبات + إجمالي الإنفاق).
- في **الوضع التجريبي** (بدون مفاتيح Supabase) يعمل الرمز الثابت `123456`.
- لتفعيل الرسائل الحقيقية: فعّل Phone provider في Supabase واربط مزود SMS
  (مثل Twilio) وأضِف المفاتيح عبر لوحة Supabase.
- دخول الموظفين يبقى عبر **`/login`** (كلمة المرور).

---

## 1) المتطلبات قبل النشر

1. حساب على [Vercel](https://vercel.com).
2. مشروع [Supabase](https://supabase.com) جاهز مع تنفيذ ملفات SQL بالترتيب:
   - `../abu_bashar_schema.sql`
   - `../abubashar_rpc.sql`
   - `../abubashar_seed.sql`
   - `../abubashar_v2_banners_barcode_proof.sql`
3. إنشاء حاوية تخزين `payment-proofs` (Public) في Supabase Storage.
4. نسخ `Project URL` و `anon key` من **Supabase → Settings → API**.

---

## 2) النشر عبر GitHub (موصى به)

```bash
# تهيئة Git ورفع المشروع
cd /home/user/store
git init
git add .
git commit -m "feat: أبو بشار ستورز - نسخة إنتاجية"
git branch -M main
git remote add origin https://github.com/<your-user>/abubashar-store.git
git push -u origin main
```

ثم من لوحة Vercel:
1. **Add New → Project**
2. استورد المستودع.
3. Framework Preset = **Next.js** (يُكتشف تلقائياً).
4. Root Directory = `store`.
5. أضِف متغيرات البيئة (انظر القسم التالي).
6. اضغط **Deploy**.

كل عملية `git push` ستُطلق نشراً تلقائياً على Preview/Production.

---

## 3) متغيرات البيئة (Vercel → Settings → Environment Variables)

| المفتاح | القيمة | البيئات |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | مفتاح anon العام | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://store.abubashar.ye` | Production |

> ⚠️ المفتاح `anon` آمن للوصول من المتصفح لأنه محمي بـ **RLS** في قاعدة البيانات. لا تُضف `service_role` مطلقاً في متغيرات `NEXT_PUBLIC_*`.

---

## 4) ملفات الإعداد

- **`vercel.json`**: يحدّث Region إلى **فرانكفورت (fra1)** الأقرب لليمن، ويضيف ترويسات أمان:
  - HSTS, X-Frame-Options, X-Content-Type-Options
  - Permissions-Policy (للميكروفون/الكاميرا/الموقع)
  - **Content-Security-Policy** تسمح بـ Supabase والخطوط والصور
  - Caching لأصول `/_next/static` لمدة سنة.
- **`.nvmrc`**: يثبّت Node.js 20 في البناء.
- **`engines`** في `package.json`: يتطلب Node ≥ 18.18.

### اختيار منطقة أسرع (Region)
القيمة الافتراضية `fra1` (فرانكفورت). بدائل أقرب للشرق الأوسط:
- `dub1` (دبي) — حالياً لبعض خطط Pro/Enterprise.
يمكنك تغييرها في `vercel.json` عبر حقل `regions`.

---

## 5) نطاق مخصص (Custom Domain)

1. في Vercel → Project → **Settings → Domains**.
2. أضف `store.abubashar.ye` و `abubashar.ye`.
3. اضبط سجلات DNS لدى مسجّل النطاق:
   - `A` → `76.76.21.21`
   - `CNAME www` → `cname.vercel-dns.com`
4. Vercel يوفّر شهادة SSL تلقائياً.

---

## 6) التحقق بعد النشر

- [ ] المتجر يفتح وتظهر البانرات والمنتجات.
- [ ] البحث الصوتي يعمل (يتطلب HTTPS — متوفر على Vercel).
- [ ] إنشاء طلب من `/checkout` يصل إلى Supabase.
- [ ] `/login` → تسجيل دخول الموظفين.
- [ ] `/admin` تعرض الإحصائيات (للمسؤول).
- [ ] `/delivery` لعامل التوصيل.
- [ ] رفع إيصال الدفع يصل إلى Storage.

---

## 7) أمان إضافي قبل الإطلاق

- غيّر كلمات مرور الحسابات التجريبية من قاعدة البيانات فوراً.
- فعّل **Phone Auth + OTP** في Supabase Authentication.
- ضع معدّل طلبات (Rate Limiting) عبر Cloudflare أو Vercel WAF.
- راجع سياسات RLS بعد أي تعديل على الجداول.
- في Supabase، قيّد `auth.users` بسماح نطاق بريدك/هاتفك للموظفين.

---

## 8) أوامر محلية مطابقة للإنتاج

```bash
npm install
npm run build       # بناء إنتاجي
npm start           # تشغيل خادم الإنتاج محلياً على :3000
```

---

## 9) النشر اليدوي السريع (اختياري)

```bash
npm i -g vercel
cd /home/user/store
vercel link          # ربط المشروع
vercel env pull      # سحب متغيرات البيئة
vercel --prod        # نشر مباشر
```
