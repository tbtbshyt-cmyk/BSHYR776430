-- =====================================================================
-- ملف إصلاح سريع: إنشاء دالة create_order_atomic فقط
-- شغّل هذا الملف بعد 01_schema.sql مباشرة
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
        RAISE EXCEPTION 'يجب تسجيل الدخول لإنشاء طلب';
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
        v_gps := point(p_lng, p_lat);
    END IF;

    CREATE TEMP TABLE tmp_order_items ON COMMIT DROP AS
    SELECT
        (item->>'product_id')::uuid AS product_id,
        NULLIF(btrim(item->>'size'), '') AS size,
        GREATEST(1, COALESCE((item->>'quantity')::int, 1)) AS quantity
    FROM jsonb_array_elements(p_items) AS item;

    IF EXISTS (
        SELECT 1 FROM tmp_order_items t
        LEFT JOIN public.products p ON p.id = t.product_id
        WHERE p.id IS NULL
    ) THEN
        RAISE EXCEPTION 'أحد المنتجات المطلوبة غير موجود';
    END IF;

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
        RAISE EXCEPTION 'الكمية المطلوبة غير متوفرة في المخزون';
    END IF;

    INSERT INTO public.orders (customer_id, shipping_address, gps_coordinates, note, total_amount)
    VALUES (v_customer, p_shipping_address, v_gps, p_note, 0)
    RETURNING id INTO v_order_id;

    INSERT INTO public.order_items (order_id, product_id, title_ar, unit_price, size, quantity)
    SELECT v_order_id, t.product_id, p.title_ar, p.price, t.size, t.quantity
    FROM tmp_order_items t
    JOIN public.products p ON p.id = t.product_id;

    IF p_clear_cart THEN
        DELETE FROM public.cart c
        USING tmp_order_items t
        WHERE c.customer_id = v_customer
          AND c.product_id = t.product_id
          AND c.size IS NOT DISTINCT FROM t.size;
    END IF;

    RETURN QUERY
    SELECT o.id, o.order_number, o.total_amount, o.status
    FROM public.orders o
    WHERE o.id = v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;
