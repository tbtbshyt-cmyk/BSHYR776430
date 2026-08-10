-- =====================================================================
-- إصلاح سريع: إسقاط الدوال القديمة المتعارضة قبل إعادة إنشائها
-- شغّل هذا الملف أولاً إذا ظهر خطأ:
--   42P13: cannot change return type of existing function
-- =====================================================================

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

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE 'تم إسقاط الدوال القديمة. يمكنك الآن تشغيل 02_rpc.sql أو FULL_SETUP.sql بأمان.';
END $$;
