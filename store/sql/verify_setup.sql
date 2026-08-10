-- =====================================================================
-- تحقق نهائي من نجاح التهيئة
-- شغّل هذا الملف بعد إكمال كل خطوات setup
-- =====================================================================

-- 1) الدوال المطلوبة
SELECT proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'create_order_atomic',
    'create_payment',
    'confirm_payment',
    'assign_order_to_me',
    'update_order_status',
    'mark_delivered'
  )
ORDER BY proname;

-- 2) الجداول الأساسية وعدد الصفوف
SELECT 'profiles' AS table_name, COUNT(*) FROM public.profiles
UNION ALL SELECT 'categories', COUNT(*) FROM public.categories
UNION ALL SELECT 'products', COUNT(*) FROM public.products
UNION ALL SELECT 'orders', COUNT(*) FROM public.orders
UNION ALL SELECT 'banners', COUNT(*) FROM public.banners
UNION ALL SELECT 'campaigns', COUNT(*) FROM public.campaigns
UNION ALL SELECT 'ai_settings', COUNT(*) FROM public.ai_settings;

-- 3) حاويات التخزين
SELECT id, name, public FROM storage.buckets
WHERE id IN ('product-images', 'banners', 'payment-proofs');

-- 4) سياسات RLS (عدّاد)
SELECT tablename, COUNT(*) AS policies
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
