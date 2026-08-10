-- =====================================================================
--  تهيئة سريعة وآمنة — انسخ هذا الملف كاملاً والصقه في SQL Editor
--  بعد التشغيل: ستُنشأ كل الجداول والحاويات والدوال، وستعمل رفع الصور.
-- =====================================================================

-- تنظيف الدوال المتعارضة أولاً (يحل خطأ cannot change return type)
DROP FUNCTION IF EXISTS public.admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.assign_order_to_me(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.mark_delivered(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.request_cancellation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_payment(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.review_payment_proof(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_order_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(UUID, TEXT) CASCADE;
