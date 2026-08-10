-- =====================================================================
-- ملف التشخيص: شغّله أولاً
-- يتحقق من وجود الجداول والدوال ويعرض أي شيء ناقص
-- =====================================================================

DO $$
BEGIN
  RAISE NOTICE '=== فحص الجداول ===';
  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='products';
  IF NOT FOUND THEN RAISE EXCEPTION 'جدول products غير موجود — شغّل 01_schema.sql أولاً'; END IF;

  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='orders';
  IF NOT FOUND THEN RAISE EXCEPTION 'جدول orders غير موجود — شغّل 01_schema.sql أولاً'; END IF;

  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='order_items';
  IF NOT FOUND THEN RAISE EXCEPTION 'جدول order_items غير موجود'; END IF;

  PERFORM 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cart';
  IF NOT FOUND THEN RAISE EXCEPTION 'جدول cart غير موجود'; END IF;

  RAISE NOTICE 'كل الجداول موجودة ✓';
END $$;

-- عرض الدوال الموجودة:
SELECT proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname='public'
  AND proname IN ('create_order_atomic','create_payment','confirm_payment','assign_order_to_me','update_order_status')
ORDER BY proname;
