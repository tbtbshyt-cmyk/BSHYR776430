-- =====================================================================
-- مزامنة أدوار الموظفين إلى auth.users.app_metadata
-- لتمكين Middleware من اتخاذ قرار الحماية دون استعلام قاعدة بيانات إضافي.
-- يُشغّل بعد إنشاء/تعديل profiles.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.sync_role_to_app_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- يعيّن staff_role فقط للموظفين؛ العملاء يُحذف المفتاح.
    UPDATE auth.users
    SET raw_app_meta_data =
        CASE
            WHEN NEW.role IN ('admin','manager','delivery') THEN
                COALESCE(raw_app_meta_data, '{}'::jsonb) ||
                jsonb_build_object('staff_role', NEW.role)
            ELSE
                COALESCE(raw_app_meta_data, '{}'::jsonb) - 'staff_role'
        END
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_role_metadata ON public.profiles;
CREATE TRIGGER trg_sync_role_metadata
    AFTER INSERT OR UPDATE OF role ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_role_to_app_metadata();

-- مزامنة فورية للحسابات الموجودة
UPDATE public.profiles SET role = role;

GRANT EXECUTE ON FUNCTION public.sync_role_to_app_metadata() TO authenticated;
