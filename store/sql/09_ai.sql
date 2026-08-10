-- =====================================================================
-- أبو بشار جوال - v8: إدارة الذكاء الاصطناعي وإتمام الطلب عبر واتساب
-- آمن للتشغيل المتكرر.
-- =====================================================================

-- 1) جدول إعدادات الذكاء الاصطناعي (صف واحد فقط per-store) ------------
CREATE TABLE IF NOT EXISTS public.ai_settings (
    id INT PRIMARY KEY DEFAULT 1,
    provider TEXT NOT NULL DEFAULT 'gemini' CHECK (provider IN ('gemini','openai')),
    api_key_encrypted TEXT,
    model TEXT NOT NULL DEFAULT 'gemini-1.5-flash',
    features JSONB NOT NULL DEFAULT '["product_extract","campaigns"]'::jsonb,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_number TEXT,
    order_template TEXT NOT NULL DEFAULT
        'مرحباً 👋%0Aأرغب بطلب المنتجات التالية:%0A%0A{items}%0A%0Aالإجمالي: {total} ر.ي%0Aالاسم: {name}%0Aالعنوان: {address}%0Aالهاتف: {phone}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.ai_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- الموظفون فقط يقرأون/يعدّلون إعدادات الذكاء الاصطناعي
DROP POLICY IF EXISTS "ai_settings_staff_read" ON public.ai_settings;
CREATE POLICY "ai_settings_staff_read" ON public.ai_settings
    FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "ai_settings_staff_write" ON public.ai_settings;
CREATE POLICY "ai_settings_staff_write" ON public.ai_settings
    FOR UPDATE TO authenticated
    USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- 2) محفّز تحديث الوقت -----------------------------------------------
CREATE OR REPLACE FUNCTION public.touch_ai_settings()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_touch_ai_settings ON public.ai_settings;
CREATE TRIGGER trg_touch_ai_settings BEFORE UPDATE ON public.ai_settings
    FOR EACH ROW EXECUTE FUNCTION public.touch_ai_settings();

-- ملاحظة: لا نخزّن المفتاح صريحاً في وضع التطوير. في الإنتاج يُحفظ
-- مشفّراً (api_key_encrypted) ولا يعود للواجهة بعد إدخاله.
-- =====================================================================
