-- =====================================================================
-- أبو بشار جوال - v7: الحملات التسويقية وتوسيع قاعدة البيانات
-- آمن للتشغيل المتكرر.
-- =====================================================================

-- 1) جدول الحملات الإعلانية -------------------------------------------
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('percentage','fixed','bogo')),
    value NUMERIC(12,2) NOT NULL DEFAULT 0,
    product_ids UUID[] NOT NULL DEFAULT '{}',
    banner_title TEXT,
    banner_subtitle TEXT,
    banner_image TEXT,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    views BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- العملاء يقرأون الحملات النشطة فقط (لعرض الخصومات)
DROP POLICY IF EXISTS "campaigns_public_active" ON public.campaigns;
CREATE POLICY "campaigns_public_active" ON public.campaigns
    FOR SELECT
    USING (
        is_active = TRUE
        AND starts_at <= NOW()
        AND ends_at >= NOW()
    );

-- الموظفون يديرون الحملات
DROP POLICY IF EXISTS "campaigns_staff_all" ON public.campaigns;
CREATE POLICY "campaigns_staff_all" ON public.campaigns
    FOR ALL TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 2) دوال تتبّع المشاهدات/النقرات (آمنة) ---------------------------
CREATE OR REPLACE FUNCTION public.increment_campaign_view(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.campaigns SET views = views + 1 WHERE id = p_id AND is_active;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_click(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.campaigns SET clicks = clicks + 1 WHERE id = p_id AND is_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_campaign_view(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.increment_campaign_click(UUID) TO authenticated, anon;

-- 3) فهارس أداء إضافية لاستيعاب النمو --------------------------------
CREATE INDEX IF NOT EXISTS idx_campaigns_active_period
    ON public.campaigns (is_active, starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_products_price
    ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_orders_created_status
    ON public.orders (created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_order_items_product
    ON public.order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_status
    ON public.transactions (order_id, status);

-- 4) عرض يحسب السعر بعد الخصم النشط لكل منتج -------------------------
CREATE OR REPLACE VIEW public.products_with_discount AS
SELECT
    p.*,
    COALESCE(
        (
            SELECT
                CASE
                    WHEN c.type = 'percentage' THEN ROUND(p.price * (1 - c.value / 100.0))
                    WHEN c.type = 'fixed'      THEN GREATEST(p.price - c.value, 0)
                    WHEN c.type = 'bogo'       THEN ROUND(p.price * 0.75)
                END
            FROM public.campaigns c
            WHERE c.is_active = TRUE
              AND c.starts_at <= NOW()
              AND c.ends_at >= NOW()
              AND (cardinality(c.product_ids) = 0 OR p.id = ANY(c.product_ids))
            ORDER BY
                CASE WHEN c.type = 'percentage' THEN p.price * (1 - c.value / 100.0)
                     WHEN c.type = 'fixed' THEN GREATEST(p.price - c.value, 0)
                     WHEN c.type = 'bogo' THEN p.price * 0.75
                END ASC
            LIMIT 1
        ),
        p.price
    ) AS discounted_price,
    EXISTS (
        SELECT 1 FROM public.campaigns c
        WHERE c.is_active = TRUE
          AND c.starts_at <= NOW()
          AND c.ends_at >= NOW()
          AND (cardinality(c.product_ids) = 0 OR p.id = ANY(c.product_ids))
    ) AS has_discount
FROM public.products p
WHERE p.is_active = TRUE;

COMMENT ON VIEW public.products_with_discount IS 'المنتجات مع احتساب أعلى خصم نشط تلقائياً';

ANALYZE public.campaigns;
ANALYZE public.products;
ANALYZE public.orders;

-- =====================================================================
-- انتهت الترقية v7.
-- =====================================================================
