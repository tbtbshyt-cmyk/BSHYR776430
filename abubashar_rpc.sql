-- =====================================================================
-- أبو بشار ستورز - دوال RPC الذكية وقواعد التشغيل
-- تُشغّل بعد إنشاء المخطط (abubashar_schema.sql)
-- =====================================================================

-- صلاحيات افتراضية ضرورية للتسلسلات عند الإدراج المباشر
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- =====================================================================
-- 1) إنشاء طلب ذري (Validates stock → locks products → creates order
--    → inserts items → clears cart) في معاملة واحدة
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_order_atomic(
    p_shipping_address TEXT,
    p_items JSONB,
    p_note TEXT DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL,
    p_clear_cart BOOLEAN DEFAULT true
)
RETURNS TABLE(
    id UUID,
    order_number BIGINT,
    total_amount DECIMAL(12,2),
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer UUID := auth.uid();
    v_order_id UUID;
    v_gps POINT;
BEGIN
    IF v_customer IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول لإنشاء طلب'
            USING ERRCODE = '28000';
    END IF;

    IF p_shipping_address IS NULL OR btrim(p_shipping_address) = '' THEN
        RAISE EXCEPTION 'عنوان الشحن مطلوب';
    END IF;

    IF p_items IS NULL
       OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'يجب إضافة منتج واحد على الأقل إلى الطلب';
    END IF;

    IF p_lat IS NOT NULL AND p_lng IS NOT NULL THEN
        v_gps := point(p_lng, p_lat);   -- (x=lng, y=lat)
    END IF;

    -- تطبيع العناصر وتجميع المتكرر منها (نفس المنتج/المقاس)
    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    WITH normalized AS (
        SELECT
            (item->>'product_id')::uuid                     AS product_id,
            NULLIF(btrim(item->>'size'), '')                AS size,
            GREATEST(1, COALESCE((item->>'quantity')::int, 1)) AS quantity
        FROM jsonb_array_elements(p_items) AS item
    )
    SELECT product_id, size, SUM(quantity)::int AS quantity
    FROM normalized
    GROUP BY product_id, size;

    -- التحقق من صحة المعرّفات
    IF EXISTS (
        SELECT 1 FROM tmp_order_items t
        LEFT JOIN public.products p ON p.id = t.product_id
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'أحد المنتجات المطلوبة غير موجود'
            USING ERRCODE = 'foreign_key_violation';
    END IF;

    -- رفض المنتجات غير النشطة
    IF EXISTS (
        SELECT 1 FROM tmp_order_items t
        JOIN public.products p ON p.id = t.product_id
        WHERE p.is_active = false
    ) THEN
        RAISE EXCEPTION 'أحد المنتجات غير متاح حالياً للطلب';
    END IF;

    -- قفل صفوف المنتجات (ترتيب ثابت لمنع deadlocks) ثم فحص المخزون
    PERFORM 1
    FROM tmp_order_items t
    JOIN public.products p ON p.id = t.product_id
    ORDER BY p.id
    FOR UPDATE OF p;

    IF EXISTS (
        SELECT 1 FROM tmp_order_items t
        JOIN public.products p ON p.id = t.product_id
        WHERE p.stock_quantity < t.quantity
    ) THEN
        RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة في المخزون'
            USING ERRCODE = '23514';
    END IF;

    -- إنشاء الطلب (المجموع يبدأ صفراً ويحسبه المحفّز من العناصر)
    INSERT INTO public.orders
        (customer_id, shipping_address, gps_coordinates, note, total_amount)
    VALUES
        (v_customer, p_shipping_address, v_gps, p_note, 0)
    RETURNING id INTO v_order_id;

    -- إدراج العناصر: المحفّز trg_order_item_change يتولى
    -- خصم المخزون وحساب total_amount تلقائياً
    INSERT INTO public.order_items
        (order_id, product_id, title_ar, unit_price, size, quantity)
    SELECT v_order_id, t.product_id, p.title_ar, p.price, t.size, t.quantity
    FROM tmp_order_items t
    JOIN public.products p ON p.id = t.product_id;

    -- تفريغ نفس العناصر من سلة العميل
    IF p_clear_cart THEN
        DELETE FROM public.cart c
        USING tmp_order_items t
        WHERE c.customer_id = v_customer
          AND c.product_id  = t.product_id
          AND c.size IS NOT DISTINCT FROM t.size;
    END IF;

    RETURN QUERY
    SELECT o.id, o.order_number, o.total_amount, o.status
    FROM public.orders o
    WHERE o.id = v_order_id;
END;
$$;

-- =====================================================================
-- 2) لوحة التوصيل: إسناد الطلب إلى عامل التوصيل الحالي
-- =====================================================================
CREATE OR REPLACE FUNCTION public.assign_order_to_me(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة: هذا الإجراء للموظفين فقط'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.orders
    SET assigned_to = v_uid,
        status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
    WHERE id = p_order_id
      AND (assigned_to IS NULL OR assigned_to = v_uid);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الطلب غير موجود أو مسند بالفعل لعامل توصيل آخر';
    END IF;

    RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id;
END;
$$;

-- =====================================================================
-- 3) تحديث حالة الطلب (للموظفين)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.update_order_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('pending','processing','shipped','delivered','cancelled') THEN
        RAISE EXCEPTION 'حالة الطلب غير صحيحة';
    END IF;

    UPDATE public.orders SET status = p_status WHERE id = p_order_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الطلب غير موجود';
    END IF;

    RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id;
END;
$$;

-- =====================================================================
-- 4) تسليم الطلب (يتطلب أن يكون في حالة processing/shipped)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.mark_delivered(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة' USING ERRCODE = '42501';
    END IF;

    UPDATE public.orders
    SET status = 'delivered'
    WHERE id = p_order_id
      AND status IN ('processing', 'shipped');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لا يمكن تسليم هذا الطلب في حالته الحالية';
    END IF;

    RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id;
END;
$$;

-- =====================================================================
-- 5) طلب العميل إلغاء طلب (مسموح فقط وهو pending)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.request_cancellation(p_order_id UUID)
RETURNS SETOF public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول' USING ERRCODE = '28000';
    END IF;

    UPDATE public.orders
    SET status = 'cancelled'
    WHERE id = p_order_id
      AND customer_id = v_uid
      AND status = 'pending';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'لا يمكن إلغاء هذا الطلب في حالته الحالية';
    END IF;

    RETURN QUERY SELECT * FROM public.orders WHERE id = p_order_id;
END;
$$;

-- =====================================================================
-- 6) تسجيل دفعة (تحويل/عربون) من العميل - تبقى pending حتى تأكيد الموظف
-- =====================================================================
CREATE OR REPLACE FUNCTION public.create_payment(
    p_order_id UUID,
    p_method TEXT,
    p_amount DECIMAL(12,2),
    p_reference TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_allowed BOOLEAN;
    v_tx_id UUID;
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'يجب تسجيل الدخول' USING ERRCODE = '28000';
    END IF;

    IF p_method NOT IN ('cash_on_delivery','deposit','bank_transfer','local_wallet') THEN
        RAISE EXCEPTION 'طريقة الدفع غير مدعومة';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'مبلغ الدفعة غير صحيح';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM public.orders
        WHERE id = p_order_id
          AND (customer_id = v_uid OR public.is_staff())
    ) INTO v_allowed;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'الطلب غير موجود أو لا تملك صلاحية الوصول إليه'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.transactions
        (order_id, amount, method, status, reference, note)
    VALUES
        (p_order_id, p_amount, p_method, 'pending', p_reference, p_note)
    RETURNING id INTO v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- =====================================================================
-- 7) تأكيد/رفض الدفعة من قبل الموظف
--    عند تعيين status=paid، يقوم المحفّز بتعليم الطلب مدفوع العربون
-- =====================================================================
CREATE OR REPLACE FUNCTION public.confirm_payment(
    p_tx_id UUID,
    p_status TEXT DEFAULT 'paid',
    p_reference TEXT DEFAULT NULL
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_staff() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة' USING ERRCODE = '42501';
    END IF;

    IF p_status NOT IN ('pending','paid','failed','refunded') THEN
        RAISE EXCEPTION 'حالة الدفعة غير صحيحة';
    END IF;

    UPDATE public.transactions
    SET status = p_status,
        reference = COALESCE(NULLIF(btrim(p_reference), ''), reference)
    WHERE id = p_tx_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة غير موجودة';
    END IF;

    RETURN QUERY SELECT * FROM public.transactions WHERE id = p_tx_id;
END;
$$;

-- =====================================================================
-- 8) تفاصيل طلب كاملة (order + items + payments) بصيغة JSONB
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_order_details(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid UUID := auth.uid();
    v_result JSONB;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = p_order_id
          AND (o.customer_id = v_uid OR public.is_staff())
    ) THEN
        RAISE EXCEPTION 'الطلب غير موجود أو لا تملك صلاحية الوصول إليه'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'order',    to_jsonb(o),
        'items',    COALESCE((
                        SELECT jsonb_agg(to_jsonb(oi) ORDER BY oi.created_at)
                        FROM public.order_items oi
                        WHERE oi.order_id = o.id
                    ), '[]'::jsonb),
        'payments', COALESCE((
                        SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at)
                        FROM public.transactions t
                        WHERE t.order_id = o.id
                    ), '[]'::jsonb)
    )
    INTO v_result
    FROM public.orders o
    WHERE o.id = p_order_id;

    RETURN v_result;
END;
$$;

-- =====================================================================
-- 9) إدارة الأدوار (للمسؤول فقط)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.set_user_role(
    p_user_id UUID,
    p_role TEXT
)
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة: للمسؤول فقط'
            USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('customer','admin','manager','delivery') THEN
        RAISE EXCEPTION 'دور المستخدم غير صحيح';
    END IF;

    UPDATE public.profiles SET role = p_role WHERE id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'المستخدم غير موجود';
    END IF;

    RETURN QUERY SELECT * FROM public.profiles WHERE id = p_user_id;
END;
$$;

-- =====================================================================
-- 10) إحصائيات لوحة التحكم
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_result JSONB;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'صلاحية مرفوضة: للمسؤول فقط'
            USING ERRCODE = '42501';
    END IF;

    SELECT jsonb_build_object(
        'orders_total',      COUNT(*),
        'orders_by_status',  COALESCE(jsonb_object_agg(status, status_count), '{}'::jsonb),
        'revenue_delivered', COALESCE(SUM(total_amount) FILTER (WHERE status = 'delivered'), 0),
        'revenue_pending',   COALESCE(SUM(total_amount) FILTER (WHERE status IN ('pending','processing','shipped')), 0),
        'pending_deposits',  COUNT(*) FILTER (WHERE deposit_paid = false AND status IN ('pending','processing')),
        'products_total',    (SELECT COUNT(*) FROM public.products),
        'low_stock_count',   (SELECT COUNT(*) FROM public.products WHERE stock_quantity < 5 AND is_active = true),
        'customers_total',   (SELECT COUNT(*) FROM public.profiles WHERE role = 'customer'),
        'staff_total',       (SELECT COUNT(*) FROM public.profiles WHERE role IN ('admin','manager','delivery'))
    )
    INTO v_result
    FROM (
        SELECT status, total_amount, deposit_paid, COUNT(*) AS status_count
        FROM public.orders
        GROUP BY status, total_amount, deposit_paid, id
    ) sub;

    -- ملاحظة: الاستعلام أعلوي لأجل object_agg؛ نعيد التصحيح عبر استعلام مباشر
    SELECT jsonb_build_object(
        'orders_total',      (SELECT COUNT(*) FROM public.orders),
        'orders_by_status',  COALESCE((
            SELECT jsonb_object_agg(status, COUNT)
            FROM (SELECT status, COUNT(*)::int FROM public.orders GROUP BY status) s
        ), '{}'::jsonb),
        'revenue_delivered', COALESCE((SELECT SUM(total_amount) FROM public.orders WHERE status='delivered'), 0),
        'revenue_pending',   COALESCE((SELECT SUM(total_amount) FROM public.orders WHERE status IN ('pending','processing','shipped')), 0),
        'pending_deposits',  (SELECT COUNT(*) FROM public.orders WHERE deposit_paid=false AND status IN ('pending','processing')),
        'products_total',    (SELECT COUNT(*) FROM public.products),
        'low_stock_count',   (SELECT COUNT(*) FROM public.products WHERE stock_quantity < 5 AND is_active = true),
        'customers_total',   (SELECT COUNT(*) FROM public.profiles WHERE role='customer'),
        'staff_total',       (SELECT COUNT(*) FROM public.profiles WHERE role IN ('admin','manager','delivery')),
        'generated_at',      NOW()
    )
    INTO v_result;

    RETURN v_result;
END;
$$;

-- =====================================================================
-- الصلاحيات: التنفيذ للمستخدمين المسجّلين فقط (والفحص الداخلي يحدد الصلاحية)
-- =====================================================================
REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.assign_order_to_me(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_order_to_me(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.update_order_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.mark_delivered(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_delivered(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.request_cancellation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_cancellation(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_order_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_details(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

-- =====================================================================
-- انتهت دوال RPC - أنت جاهز لبناء واجهات Next.js
-- الاستخدام من العميل (supabase-js):
--   const { data } = await supabase.rpc('create_order_atomic', {
--     p_shipping_address: 'صنعاء - الستين',
--     p_items: [{ product_id: '...', size: '58', quantity: 1 }],
--     p_lat: 15.35, p_lng: 44.20
--   });
-- =====================================================================
