-- =====================================================================
-- أبو بشار ستورز - ترقية v2
-- يضيف: جدول البانرات، عمود الباركود للمنتجات،
--        إثبات الدفع (proof_url) وحقول الـ OCR للدفعات،
--        وتحديث دالة create_payment لاستقبال رابط الإثبات.
-- يُشغّل بعد abubashar_schema.sql / abubashar_rpc.sql.
-- =====================================================================

-- 1) البانرات الديناميكية ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title_ar TEXT NOT NULL,
    subtitle_ar TEXT,
    image_url TEXT NOT NULL,
    cta_label TEXT,
    cta_link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON public.banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "banners_staff_write" ON public.banners
    FOR ALL USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_banners_sort ON public.banners(sort_order) WHERE is_active = true;

-- -----------------------------------------------------------------------
-- 2) عمود الباركود للمنتجات
-- -----------------------------------------------------------------------
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS barcode TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode
    ON public.products(barcode) WHERE barcode IS NOT NULL;

-- -----------------------------------------------------------------------
-- 3) إثبات الدفع / بيانات الـ OCR على جدول المعاملات
-- -----------------------------------------------------------------------
ALTER TABLE public.transactions
    ADD COLUMN IF NOT EXISTS proof_url TEXT,
    ADD COLUMN IF NOT EXISTS ocr_status TEXT
        CHECK (ocr_status IS NULL OR ocr_status IN ('pending','verified','rejected')),
    ADD COLUMN IF NOT EXISTS ocr_data JSONB;

-- -----------------------------------------------------------------------
-- 4) تحديث دالة إنشاء الدفعة لتستقبل رابط إثبات الدفع
-- -----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_payment(
    p_order_id UUID,
    p_method TEXT,
    p_amount DECIMAL(12,2),
    p_reference TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL,
    p_proof_url TEXT DEFAULT NULL
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
        WHERE id = p_order_id AND (customer_id = v_uid OR public.is_staff())
    ) INTO v_allowed;

    IF NOT v_allowed THEN
        RAISE EXCEPTION 'الطلب غير موجود أو لا تملك صلاحية الوصول إليه'
            USING ERRCODE = '42501';
    END IF;

    -- عند وجود إثبات دفع، تبقى الحالة pending مع ocr_status=pending
    -- حتى يراجعها الموظف؛ وفي غياب الإثبات تبقى pending أيضاً.
    INSERT INTO public.transactions
        (order_id, amount, method, status, reference, note, proof_url, ocr_status)
    VALUES
        (p_order_id, p_amount, p_method, 'pending', p_reference, p_note,
         p_proof_url, CASE WHEN p_proof_url IS NOT NULL THEN 'pending' ELSE NULL END)
    RETURNING id INTO v_tx_id;

    RETURN v_tx_id;
END;
$$;

-- دالة مساعدة لتحديث حالة مراجعة إثبات الدفع (للموظفين)
CREATE OR REPLACE FUNCTION public.review_payment_proof(
    p_tx_id UUID,
    p_ocr_status TEXT,
    p_ocr_data JSONB DEFAULT NULL
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

    IF p_ocr_status NOT IN ('pending','verified','rejected') THEN
        RAISE EXCEPTION 'حالة المراجعة غير صحيحة';
    END IF;

    -- التحقق يلغي/يؤكد الدفعة تلقائياً
    UPDATE public.transactions
    SET ocr_status = p_ocr_status,
        ocr_data = COALESCE(p_ocr_data, ocr_data),
        status = CASE
                    WHEN p_ocr_status = 'verified' THEN 'paid'
                    WHEN p_ocr_status = 'rejected' THEN 'failed'
                    ELSE status
                 END
    WHERE id = p_tx_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'الدفعة غير موجودة';
    END IF;

    RETURN QUERY SELECT * FROM public.transactions WHERE id = p_tx_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) TO authenticated;

-- =====================================================================
-- 5) بيانات أولية للبانرات (يمكن تعديلها من لوحة التحكم)
-- =====================================================================
INSERT INTO public.banners (title_ar, subtitle_ar, image_url, cta_label, cta_link, is_active, sort_order)
VALUES
  ('مجموعة البشوت الملكية',
   'تطريز ذهبي وقماش صوف فاخر للمناسبات الكبرى',
   'https://placehold.co/1600x600/0f0f0f/c9a24b?text=Royal+Bisht+Collection',
   'تسوّق البشوت', '/products?slug=bisht', true, 1),
  ('عطور العود الفاخرة',
   'دهن عود كمبودي وبخور معسّل برائحة ثابتة',
   'https://placehold.co/1600x600/1a1a1a/c9a24b?text=Oud+%26+Bakhoor',
   'اكتشف العطور', '/products?slug=perfumes', true, 2),
  ('توصيل داخل اليمن',
   'اطلب الآن وادفع عند الاستلام مع تغطية واسعة',
   'https://placehold.co/1600x600/0f0f0f/c9a24b?text=Delivery+across+Yemen',
   'ابدأ التسوق', '/products', true, 3)
ON CONFLICT DO NOTHING;
