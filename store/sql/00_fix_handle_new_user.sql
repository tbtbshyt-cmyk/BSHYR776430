-- =====================================================================
-- إصلاح عاجل لدالة إنشاء الملف الشخصي
-- يُشغّل مرة واحدة على قاعدة بيانات سبق تهيئتها
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_phone TEXT;
    v_name  TEXT;
BEGIN
    -- auth.users لا تحتوي عمود phone في هذا المشروع؛
    -- نعتمد كلياً على raw_user_meta_data
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);
    v_name  := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

    IF v_phone IS NULL OR btrim(v_phone) = '' THEN
        RAISE EXCEPTION 'رقم الهاتف مطلوب لإنشاء الحساب'
            USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (NEW.id, v_name, v_phone)
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
