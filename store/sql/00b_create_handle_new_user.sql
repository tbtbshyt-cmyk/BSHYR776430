-- =====================================================================
--  إصلاح عاجل: تعريف handle_new_user بشكل صحيح
--  شغّل هذا الملف كاملاً قبل أي شيء
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
    -- auth.users في هذا المشروع لا تحتوي عمود phone؛
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

-- تأكيد
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء handle_new_user بنجاح ✓';
END $$;
