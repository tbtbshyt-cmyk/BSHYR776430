-- =====================================================================
-- أبو بشار ستورز - ترقية توسيع قاعدة البيانات v5
-- فهارس أداء، تحسينات استعلامات، وتجهيز للنمو العالي.
-- آمن للتشغيل المتكرر (IF NOT EXISTS).
-- =====================================================================

-- 1) فهارس إضافية للاستعلامات الأكثر تكراراً ------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
    ON public.orders (customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_assigned
    ON public.orders (status, assigned_to);

CREATE INDEX IF NOT EXISTS idx_orders_assigned_status
    ON public.orders (assigned_to, status);

CREATE INDEX IF NOT EXISTS idx_orders_deposit_status
    ON public.orders (deposit_paid, status)
    WHERE deposit_paid = false;

CREATE INDEX IF NOT EXISTS idx_order_items_order
    ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_transactions_order
    ON public.transactions (order_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
    ON public.transactions (status)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_products_category_active
    ON public.products (category_id, is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_featured
    ON public.products (is_featured)
    WHERE is_featured = true;

CREATE INDEX IF NOT EXISTS idx_products_active_created
    ON public.products (is_active, created_at DESC);

-- تفعيل امتداد pg_trgm للبحث النصي المرن
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- فهرس بحث نصي على أسماء المنتجات (للبحث السريع)
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
    ON public.products USING gin (title_ar gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_categories_slug
    ON public.categories (slug);

CREATE INDEX IF NOT EXISTS idx_profiles_phone
    ON public.profiles (phone);

CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles (role);

-- 2) تحديث إحصائيات المخطط لتحسين خطط الاستعلام ------------------------
ANALYZE public.orders;
ANALYZE public.order_items;
ANALYZE public.transactions;
ANALYZE public.products;
ANALYZE public.profiles;
ANALYZE public.categories;
ANALYZE public.cart;

-- 3) ضبط حجم الاتصال وتجمع البيانات (إعدادات آمنة قابلة للتعديل) -------
-- ملاحظة: هذه القيم معقولة لـ Supabase؛ عدّلها بحجم خطتك.
ALTER ROLE postgres SET statement_timeout = '30s';

-- 4) عرض (View) يجمع تفاصيل الطلب في استعلام واحد  --------------------
CREATE OR REPLACE VIEW public.order_summary AS
SELECT
    o.id,
    o.order_number,
    o.status,
    o.total_amount,
    o.deposit_paid,
    o.assigned_to,
    o.created_at,
    p.full_name  AS customer_name,
    p.phone      AS customer_phone,
    COUNT(oi.id) AS items_count
FROM public.orders o
LEFT JOIN public.profiles p ON p.id = o.customer_id
LEFT JOIN public.order_items oi ON oi.order_id = o.id
GROUP BY o.id, p.full_name, p.phone;

COMMENT ON VIEW public.order_summary IS 'ملخص سريع للطلبات مع بيانات العميل وعدد العناصر';

-- 5) جدول تدقيق اختياري لتسجيل تغييرات حالات الطلب -------------------
CREATE TABLE IF NOT EXISTS public.order_status_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_log_order
    ON public.order_status_log (order_id, created_at DESC);

ALTER TABLE public.order_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_log_staff_read" ON public.order_status_log;
CREATE POLICY "order_log_staff_read" ON public.order_status
    FOR SELECT TO authenticated USING (public.is_staff());

-- دالة لتسجيل تغيير الحالة تلقائياً
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        INSERT INTO public.order_status_log
            (order_id, from_status, to_status, changed_by)
        VALUES
            (NEW.id, OLD.status, NEW.status, auth.uid());
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_order_status ON public.orders;
CREATE TRIGGER trg_log_order_status
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

-- =====================================================================
-- انتهت ترقية v5.
-- تحقق من الفهارس:
--   SELECT indexname, tablename FROM pg_indexes WHERE schemaname='public';
-- =====================================================================
