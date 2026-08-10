-- =====================================================================
-- أبو بشار ستورز - ترقية الأمان الصارمة v3
-- تجبّ ما يلي بعد تشغيل جميع الملفات السابقة، وتصلّب سياسات RLS:
--   1) منع العملاء من رفع أدوارهم (privilege escalation).
--   2) منع إدراج دفعة بحالة مدفوعة مباشرة (يجب أن يمر تأكيد الموظف).
--   3) حصر الكتابة في order_items على الموظفين (الطلب الذكي يتم عبر دالة SECURITY DEFINER).
--   4) تقييد الطلبات التي ينشئها العميل مباشرة.
--   5) حاوية تخزين إثباتات الدفع وسياساتها.
--   6) منح صلاحيات التنفيذ للدوال بشكل صريح.
-- =====================================================================

-- 1) منع ترفيع الدور إلا من مسؤول ---------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_role_stability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_admin()
    THEN
        RAISE EXCEPTION 'لا يمكنك تغيير الدور (مطلوب صلاحية مسؤول)'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_stability();

-- تحديث سياسة التعديل: العميل يعدّل ملفه فقط، والموظفون يعدّلون أي ملف
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id OR public.is_staff())
    WITH CHECK (auth.uid() = id OR public.is_staff());

-- 2) تصلّب الدفعات: لا يمكن إدراجها إلا بحالة pending -----------------
DROP POLICY IF EXISTS "transactions_insert_owner_or_staff" ON public.transactions;
CREATE POLICY "transactions_insert_owner_or_staff" ON public.transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
        AND status = 'pending'
        AND paid_at IS NULL
    );

-- 3) حصر الكتابة في عناصر الطلب على الموظفين --------------------------
--    (الطلب الذكي create_order_atomic يعمل بصفة SECURITY DEFINER ويتجاوز RLS)
DROP POLICY IF EXISTS "order_items_insert_owner_or_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_staff" ON public.order_items;

CREATE POLICY "order_items_insert_staff_only" ON public.order_items
    FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "order_items_update_staff_only" ON public.order_items
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "order_items_delete_staff_only" ON public.order_items
    FOR DELETE USING (public.is_staff());

-- 4) تقييد الطلبات التي ينشئها العميل مباشرة ---------------------------
DROP POLICY IF EXISTS "orders_insert_owner_or_staff" ON public.orders;
CREATE POLICY "orders_insert_owner_or_staff" ON public.orders
    FOR INSERT
    WITH CHECK (
        (
            customer_id = auth.uid()
            AND total_amount = 0
            AND status = 'pending'
            AND assigned_to IS NULL
            AND deposit_paid = false
        )
        OR public.is_staff()
    );

-- 5) حاوية إثباتات الدفع وسياساتها ------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proofs_select" ON storage.objects;
CREATE POLICY "proofs_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "proofs_insert_owner" ON storage.objects;
CREATE POLICY "proofs_insert_owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "proofs_delete_staff" ON storage.objects;
CREATE POLICY "proofs_delete_staff" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'payment-proofs' AND public.is_staff());

-- 6) تأكيد صلاحيات تنفيذ دوال RPC ------------------------------------
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_to_me(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivered(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cancellation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_order_to_me(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_delivered(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_cancellation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_details(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;

-- =====================================================================
-- انتهت الترقية الأمنية. تحقق سريع بعد التشغيل:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid::regclass::text LIKE 'public.%';
-- =====================================================================
