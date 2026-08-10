-- =====================================================================
-- أبو بشار ستورز - سياسات التخزين (Storage) v6
-- ينشئ حاويات الصور ويضيف سياسات الرفع/القراءة الآمنة.
-- آمن للتشغيل المتكرر.
-- =====================================================================

-- 1) إنشاء الحاويات (عامة القراءة) --------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
    ('product-images', 'product-images', true),
    ('banners',        'banners',        true),
    ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2) إزالة السياسات القديمة إن وُجدت لإعادة تعريفها بنظافة -------------
DROP POLICY IF EXISTS "product_images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "product_images_staff_write" ON storage.objects;
DROP POLICY IF EXISTS "banners_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "banners_staff_write"        ON storage.objects;
DROP POLICY IF EXISTS "proofs_select"              ON storage.objects;
DROP POLICY IF EXISTS "proofs_insert_owner"        ON storage.objects;
DROP POLICY IF EXISTS "proofs_delete_staff"        ON storage.objects;

-- 3) صور المنتجات: قراءة عامة، كتابة للموظفين فقط --------------------
CREATE POLICY "product_images_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_staff_write" ON storage.objects
    FOR ALL TO authenticated
    USING      (bucket_id = 'product-images' AND public.is_staff())
    WITH CHECK (bucket_id = 'product-images' AND public.is_staff());

-- 4) صور البانرات: قراءة عامة، كتابة للموظفين فقط --------------------
CREATE POLICY "banners_public_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'banners');

CREATE POLICY "banners_staff_write" ON storage.objects
    FOR ALL TO authenticated
    USING      (bucket_id = 'banners' AND public.is_staff())
    WITH CHECK (bucket_id = 'banners' AND public.is_staff());

-- 5) إثباتات الدفع: قراءة للملاك/الموظفين، رفع للعملاء، حذف للموظفين -
CREATE POLICY "proofs_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'payment-proofs'
        AND (public.is_staff() OR public.is_admin())
    );

CREATE POLICY "proofs_insert_owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

CREATE POLICY "proofs_delete_staff" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'payment-proofs' AND public.is_staff());

-- 6) حد أقصى لحجم الملفات (5 ميجابايت) واقتصار على الصور ---------------
-- يتم التحقق في التطبيق، ويمكن فرضه أيضاً عبر Postgres عند الرفع:
CREATE OR REPLACE FUNCTION public.check_image_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.bucket_id IN ('product-images','banners','payment-proofs') THEN
        IF NEW.metadata IS NOT NULL
           AND (NEW.metadata->>'mimetype') NOT LIKE 'image/%' THEN
            RAISE EXCEPTION 'يُسمح برفع ملفات الصور فقط';
        END IF;
        IF NEW.metadata IS NOT NULL
           AND (NEW.metadata->>'size')::bigint > 5 * 1024 * 1024 THEN
            RAISE EXCEPTION 'حجم الصورة يجب ألا يتجاوز 5 ميجابايت';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_image_upload ON storage.objects;
CREATE TRIGGER trg_check_image_upload
    BEFORE INSERT ON storage.objects
    FOR EACH ROW EXECUTE FUNCTION public.check_image_upload();

-- =====================================================================
-- انتهت الترقية. تحقق:
--   SELECT id, public FROM storage.buckets WHERE id IN
--     ('product-images','banners','payment-proofs');
-- =====================================================================
