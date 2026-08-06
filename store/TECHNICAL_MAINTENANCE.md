# الصيانة التقنية لمتجر أبو بشار ستورز

دليل مرجعي باللغة العربية لصيانة المشروع وتطويره دون كسر البنية الحالية.

---

## 1) إضافة ميزة جديدة دون كسر الهيكل الحالي

اتبع طبقات المشروع المعمارية من الأسفل للأعلى:

1. **قاعدة البيانات (SQL)**
   - أضف الجداول/الأعمدة الجديدة في ملف ترقية جديد، مثلاً:
     `../abubashar_v4_<feature>.sql`، ولا تعدّل ملفات الترحيل السابقة بعد نشرها.
   - فعّل **RLS** فوراً: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
   - أضف سياسات أقل صلاحية ممكنة (principle of least privilege):
     - العملاء يرون/يعدّلون بياناتهم فقط عبر شرط `customer_id = auth.uid()`.
     - الموظفون (`is_staff()`) فقط يديرون الجداول الإدارية.
   - إن لزم منطق معقّد، أنشئ دالة `SECURITY DEFINER` مع `search_path = public, pg_temp` لمنع حقن المسار.

2. **الأنواع (TypeScript)**
   - حدّث `types/database.types.ts` ليطابق المخطط الجديد (يفضّل توليده تلقائياً):
     ```bash
     npx supabase gen types typescript --project-id <id> > types/database.types.ts
     ```
   - أضف واجهات التطبيق في `lib/types.ts`.

3. **طبقة البيانات (lib/)**
   - ضع استعلامات Supabase في `lib/store.ts` (المتجر) أو `lib/admin.ts` (الإدارة) أو `lib/delivery.ts` (التوصيل).
   - حافظ على نمط الوضعين: Supabase حقيقي عند ضبط المفاتيح، وبيانات محلية (`mock-data.ts`) للعرض التجريبي.
   - للعمليات الذرّة (مثل إنشاء طلب) استدعِ دوال RPC عبر `(supabase as any).rpc('<name>', {...})`.

4. **المكوّنات (components/)**
   - مكوّنات قابلة لإعادة الاستخدام في `components/`.
   - مكوّنات إدارية في `components/admin/`، ومكوّنات التوصيل في `components/delivery/`.
   - استخدم `"use client"` فقط عند الحاجة (state, events, browser APIs).
   - المكوّنات الثقيلة (محررات، خرائط، ماسحات باركود) حمّلها بـ `next/dynamic` مع `ssr: false`.

5. **الصفحات (app/)**
   - أضف المسار الجديد تحت `app/<feature>/page.tsx`.
   - المسارات المحمية داخل `app/admin` أو `app/delivery` محمية تلقائياً بالـ `Shell` الخاص بها.

6. **التحقق قبل الرفع**
   ```bash
   ./node_modules/.bin/tsc --noEmit
   ./node_modules/.bin/next lint
   npm run build
   ```

---

## خط أنابيب التكامل المستمر (GitHub Actions)

يتضمن المشروع سير عمل تلقائي في `.github/workflows/ci.yml` يعمل عند كل
`push` أو `pull_request` على `main`، وينفّذ على **Node.js 20**:

1. `npm ci` (تثبيت حتمي من `package-lock.json`).
2. `npm run lint` (ESLint).
3. `npx tsc --noEmit` (فحص الأنواع).
4. `npm run build` (البناء الإنتاجي).

### محاكاة الـ CI محلياً
```bash
cd store
env -u NEXT_PUBLIC_SUPABASE_URL -u NEXT_PUBLIC_SUPABASE_ANON_KEY \
  NEXT_TELEMETRY_DISABLED=1 CI=true npm run build
```
يلاحَظ أن البناء ينجح **بدون** مفاتيح Supabase لأن المتجر يتحوّل تلقائياً
إلى وضع البيانات التجريبية المحلية عند غياب المتغيرات.

### أسرار/متغيرات اختيارية في GitHub
- `vars.NEXT_PUBLIC_SUPABASE_URL` (Variable)
- `secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY` (Secret)

هذه القيم اختيارية للفحص؛ لا تضع أبداً `service_role` في متغيرات عامة.

---

## 2) تحديث الإصدارات البرمجية (Dependency Upgrade)

افحص الإصدارات القديمة:
```bash
npm outdated
```

إجراء التحديث الآمن:
1. أنشئ فرعاً جديداً: `git checkout -b chore/upgrade-<date>`
2. حدّث الحزم الصغيرة آلياً:
   ```bash
   npm update
   ```
3. للترقية الرئيسية (Major)، عدّل `package.json` يدوياً ثم `npm install`.
   - احتفظ بالتوافق: Next.js 15 يتطلب React 19 وNode ≥ 18.18.
   - راجع [Next.js Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading).
4. شغّل الفحوصات الكاملة:
   ```bash
   npm run lint && npx tsc --noEmit && npm run build
   ```
5. اختبر المسارات الحرجة يدوياً:
   - تصفّح المنتج، إضافة للسلة، إتمام الطلب.
   - دخول الموظف، تأكيد دفعة، إسناد وتسليم طلب.
6. بعد التأكد، ادمج الفرع وانشر على Vercel.

### تحديث أنواع قاعدة البيانات
بعد تغيير المخطط:
```bash
npx supabase gen types typescript --project-id <id> > types/database.types.ts
```
ثم صحّح أي أخطاء أنواع في `lib/`.

### نسخ الاحتياطي للإصدار
```bash
git tag -a v1.x.y -m "وصف الإصدار"
git push origin v1.x.y
```

---

## 3) استعادة قاعدة البيانات عند حدوث خطأ

### أ) النسخ الاحتياطي الدوري (موصى به)
في Supabase:
- **Database → Backups**: فعّل النسخ اليومي التلقائي (متاح في الخطط المدفوعة).
- أو نفّذ تفريغاً يدوياً:
  ```bash
  pg_dump "postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
    --format=custom --file=backup-$(date +%F).dump
  ```

### ب) الاستعادة من ملف تفريغ
```bash
pg_restore --clean --if-exists --no-owner \
  --dbname="postgresql://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
  backup-2026-08-07.dump
```

### ج) استعادة سريعة عبر إعادة تشغيل ملفات SQL
إن كانت البيانات قابلة لإعادة الإنشاء (بيئة تطوير/اختبار):
1. احذف الجداول بالترتيب العكسي (transactions → order_items → orders → ...).
2. أعد تشغيل الملفات بالترتيب:
   ```
   abu_bashar_schema.sql
   abubashar_rpc.sql
   abubashar_v2_banners_barcode_proof.sql
   abubashar_v3_security_hardening.sql
   abubashar_seed.sql
   ```

### د) التراجع عن ترقية فاشلة (Migration Rollback)
اجعل كل ترقية تحتوي على جزأين:
- `up`: التغييرات الجديدة.
- `down`: إعادة الحالة السابقة.
مثال:
```sql
-- up
ALTER TABLE products ADD COLUMN barcode TEXT;
-- down
ALTER TABLE products DROP COLUMN IF EXISTS barcode;
```
لا تُعدّل الترحيلات المنشورة؛ أضف ترقية جديدة عكسها بدلاً من ذلك.

### هـ) إرشادات الطوارئ
- في حال حذف بيانات عن طريق الخطأ: أوقف التطبيق فوراً (`vercel pause` أو عكس النشر)، ثم استعد من آخر نسخة احتياطية.
- تحقق من RLS بعد أي استعادة:
  ```sql
  SELECT tablename, rowsecurity
  FROM pg_tables WHERE schemaname='public';
  ```
  يجب أن تكون `rowsecurity = true` لكل الجداول.
- اختبر سياسات الدور برموز أدوار مختلفة (عميل، مندوب، مسؤول) قبل إعادة فتح التطبيق.

---

## 4) قائمة التحقق قبل الإنتاج

- [ ] `npx tsc --noEmit` بلا أخطاء.
- [ ] `npm run lint` بلا تحذيرات.
- [ ] `npm run build` ناجح.
- [ ] جميع الجداول عليها RLS ومحمية بسياسات.
- [ ] كلمات مرور الحسابات التجريبية مُغيّرة.
- [ ] مفاتيح Supabase في Vercel مضبوطة (Public anon فقط).
- [ ] لا توجد أسرار في `NEXT_PUBLIC_*`.
- [ ] حاوية `payment-proofs` وسياساتها مُنشأة.
- [ ] اختبار دورة طلب كاملة: عميل → دفعة → موظف → توصيل.
- [ ] التحقق من ترويسات الأمان في رأس الاستجابة على Vercel.
