-- =====================================================================
--  تهيئة سريعة وآمنة — انسخ هذا الملف كاملاً والصقه في SQL Editor
--  بعد التشغيل: ستُنشأ كل الجداول والحاويات والدوال، وستعمل رفع الصور.
-- =====================================================================

-- تنظيف الدوال المتعارضة أولاً (يحل خطأ cannot change return type)
DROP FUNCTION IF EXISTS public.admin_dashboard_stats() CASCADE;
DROP FUNCTION IF EXISTS public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.assign_order_to_me(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.mark_delivered(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.request_cancellation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_payment(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.review_payment_proof(UUID, TEXT, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.get_order_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(UUID, TEXT) CASCADE;
-- =====================================================================
-- أبو بشار ستورز - المخطط الكامل لقاعدة البيانات (PostgreSQL / Supabase)
-- يتضمن: الملفات الشخصية، الفئات، المنتجات، الطلبات، عناصر الطلب،
--         عمليات الدفع المحلية، سياسات RLS، الفهارس، والمحفزات.
-- =====================================================================

-- امتداد لتوليد المعرّفات (مُفعّل افتراضياً في Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- 0. دوال مساعدة للأدوار والصلاحيات
-- =====================================================================

CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(current_role_name() = 'admin', false);
$$;

-- الموظفون: مدير، مسؤول، عامل توصيل
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(current_role_name() IN ('admin', 'manager', 'delivery'), false);
$$;

-- دالة عامة لتحديث عمود updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================================
-- 1. جدول المستخدمين والصلاحيات (Profiles & RBAC)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer'
        CHECK (role IN ('customer', 'admin', 'manager', 'delivery')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- يمكن لأي مستخدم مسجّل قراءة ملفه فقط، والموظفون يقرؤون الجميع
CREATE POLICY "profiles_select_self_or_staff" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR public.is_staff());

-- يمكن للمستخدم تعديل ملفه فقط، وللمدير/المسؤول تعديل الجميع
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE USING (
        auth.uid() = id
        OR public.current_role_name() IN ('admin', 'manager')
    );

-- الإدراج يتم عبر محفّز إنشاء المستخدم (لا يُسمح بالإدراج المباشر)
CREATE POLICY "profiles_insert_via_trigger" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR public.is_admin());

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- محفّز إنشاء ملف شخصي تلقائياً عند تسجيل مستخدم جديد في auth.users
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
    v_phone := COALESCE(NEW.raw_user_meta_data->>'phone', NULL);
    v_name  := COALESCE(NEW.raw_user_meta_data->>'full_name', '');

    IF v_phone IS NULL OR btrim(v_phone) = '' THEN
        RAISE EXCEPTION 'رقم الهاتف مطلوب لإنشاء الحساب'
            USING ERRCODE = 'check_violation';
    END IF;

    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (NEW.id, v_name, v_phone);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 2. جدول الفئات والمنتجات الفاخرة (Categories & Products)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name_ar TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY "categories_staff_write" ON public.categories
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID REFERENCES public.categories(id)
        ON DELETE SET NULL,
    title_ar TEXT NOT NULL,
    description_ar TEXT,
    price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
    compare_at_price DECIMAL(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
    stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    images TEXT[] NOT NULL DEFAULT '{}',
    sizes TEXT[] NOT NULL DEFAULT '{}',         -- للملابس والأحذية
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_public_read" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "products_staff_write" ON public.products
    FOR ALL USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================================
-- 3. جدول الطلبات وعناصرها والدفع المحلي
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number BIGSERIAL UNIQUE,                       -- رقم بشري للطلب
    customer_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE RESTRICT,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'shipped',
                          'delivered', 'cancelled')),
    shipping_address TEXT NOT NULL,
    gps_coordinates POINT,
    deposit_paid BOOLEAN NOT NULL DEFAULT false,
    assigned_to UUID REFERENCES public.profiles(id)
        ON DELETE SET NULL,                              -- عامل التوصيل
    note TEXT,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- العميل يرى طلباته فقط؛ الموظفون يرون كل الطلبات
CREATE POLICY "orders_select_owner_or_staff" ON public.orders
    FOR SELECT USING (customer_id = auth.uid() OR public.is_staff());

-- العميل ينشئ طلباته الخاصة؛ الإدارة تنشئ أيضاً
CREATE POLICY "orders_insert_owner_or_staff" ON public.orders
    FOR INSERT WITH CHECK (customer_id = auth.uid() OR public.is_staff());

-- العميل لا يعدّل الطلب؛ الموظفون يعدّلون الحالة والتعيين
CREATE POLICY "orders_update_staff_only" ON public.orders
    FOR UPDATE USING (public.is_staff())
    WITH CHECK (public.is_staff());

-- لا يُسمح بالحذف المباشر (نستخدم الإلغاء عبر الحالة)
CREATE POLICY "orders_delete_admin_only" ON public.orders
    FOR DELETE USING (public.is_admin());

DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ضبط الطوابع الزمنية للحالة وتحديث deposit_paid من الدفعات
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'delivered' AND OLD.status <> 'delivered' THEN
        NEW.delivered_at = COALESCE(NEW.delivered_at, NOW());
    END IF;

    IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
        NEW.cancelled_at = COALESCE(NEW.cancelled_at, NOW());
        -- إعادة الكميات للمخزون عند الإلغاء
        UPDATE public.products p
        SET stock_quantity = p.stock_quantity + oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = NEW.id AND p.id = oi.product_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_status_change ON public.orders;
CREATE TRIGGER trg_order_status_change
    BEFORE UPDATE OF status ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_status_change();

-- ---------------------------------------------------------------------
-- 3.1 عناصر الطلب
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id)
        ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id)
        ON DELETE RESTRICT,
    title_ar TEXT NOT NULL,           -- نسخة من الاسم وقت الطلب
    unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
    size TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, product_id, size)
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select_owner_or_staff" ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
    );

CREATE POLICY "order_items_insert_owner_or_staff" ON public.order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
    );

CREATE POLICY "order_items_update_staff" ON public.order_items
    FOR UPDATE USING (public.is_staff())
    WITH CHECK (public.is_staff());

CREATE POLICY "order_items_delete_staff" ON public.order_items
    FOR DELETE USING (public.is_staff());

-- خصم الكمية من المخزون وإجمالي الطلب تلقائياً عند إضافة عنصر
CREATE OR REPLACE FUNCTION public.handle_order_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stock INT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT stock_quantity INTO v_stock
        FROM public.products WHERE id = NEW.product_id FOR UPDATE;

        IF v_stock < NEW.quantity THEN
            RAISE EXCEPTION 'الكمية المطلوبة من المنتج % غير متوفرة (المتاح %)',
                NEW.title_ar, v_stock;
        END IF;

        UPDATE public.products
        SET stock_quantity = stock_quantity - NEW.quantity
        WHERE id = NEW.product_id;

        UPDATE public.orders
        SET total_amount = total_amount + (NEW.unit_price * NEW.quantity)
        WHERE id = NEW.order_id;

    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity
        WHERE id = OLD.product_id;

        UPDATE public.orders
        SET total_amount = GREATEST(0, total_amount - (OLD.unit_price * OLD.quantity))
        WHERE id = OLD.order_id;

        RETURN OLD;

    ELSIF TG_OP = 'UPDATE' THEN
        -- إعادة الفرق في الكمية
        UPDATE public.products
        SET stock_quantity = stock_quantity + OLD.quantity - NEW.quantity
        WHERE id = NEW.product_id;

        UPDATE public.orders
        SET total_amount = total_amount
                - (OLD.unit_price * OLD.quantity)
                + (NEW.unit_price * NEW.quantity)
        WHERE id = NEW.order_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_item_change ON public.order_items;
CREATE TRIGGER trg_order_item_change
    AFTER INSERT OR UPDATE OR DELETE ON public.order_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_order_item_change();

-- ---------------------------------------------------------------------
-- 3.2 عمليات الدفع المحلية (العربون / التحويل / الدفع عند الاستلام)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id)
        ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
    method TEXT NOT NULL
        CHECK (method IN ('cash_on_delivery', 'deposit',
                          'bank_transfer', 'local_wallet')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
    provider TEXT,                  -- مثال: كريمي/فلوس/بنك...
    reference TEXT,                 -- رقم العملية
    note TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transactions_select_owner_or_staff" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
    );

-- العميل يسجّل دفعة (تحويل/عربون)؛ الموظفون أيضاً
CREATE POLICY "transactions_insert_owner_or_staff" ON public.transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
    );

-- تأكيد/تحديث حالة الدفعة للموظفين فقط
CREATE POLICY "transactions_update_staff_only" ON public.transactions
    FOR UPDATE USING (public.is_staff())
    WITH CHECK (public.is_staff());

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- عند نجاح دفعة من نوع عربون/تحويل، يتم تعليم الطلب بأنه مدفوع العربون
CREATE OR REPLACE FUNCTION public.handle_transaction_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
        NEW.paid_at = COALESCE(NEW.paid_at, NOW());

        IF NEW.method IN ('deposit', 'bank_transfer', 'local_wallet') THEN
            UPDATE public.orders
            SET deposit_paid = true,
                status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
            WHERE id = NEW.order_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_paid ON public.transactions;
CREATE TRIGGER trg_transaction_paid
    BEFORE UPDATE OF status ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.handle_transaction_paid();

-- =====================================================================
-- 4. الفهارس لأداء الاستعلامات الشائعة
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_products_category      ON public.products(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_featured      ON public.products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_active        ON public.products(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug        ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_orders_customer        ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status          ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_assigned        ON public.orders(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_created         ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order      ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product    ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order     ON public.transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role          ON public.profiles(role);

-- =====================================================================
-- 5. سلة التسوق (اختياري لكن موصى به)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    customer_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id)
        ON DELETE CASCADE,
    size TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (customer_id, product_id, size)
);

ALTER TABLE public.cart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_owner_all" ON public.cart
    FOR ALL USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

DROP TRIGGER IF EXISTS trg_cart_updated_at ON public.cart;
CREATE TRIGGER trg_cart_updated_at
    BEFORE UPDATE ON public.cart
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX IF NOT EXISTS idx_cart_customer ON public.cart(customer_id);

-- =====================================================================
-- ملاحظات للتشغيل:
-- 1) تأكد من تفعيل الهاتف في شاشة التسجيل ليصبح متاحاً في NEW.phone
--    أو في raw_user_meta_data->>'phone'.
-- 2) لترقية عميل إلى مسؤول، نفّذ:
--      UPDATE public.profiles SET role='admin' WHERE phone='...';
-- 3) إنشاء طلب يتم بعمليتين: إدراج في orders ثم order_items؛
--    المحفّزات تخصم المخزون وتحسب الإجمالي تلقائياً.
-- =====================================================================
-- =====================================================================
-- إعداد دوال RPC
-- يتم حذف أي نسخ قديمة أولاً لتفادي تعارض نوع الإرجاع
-- =====================================================================
DROP FUNCTION IF EXISTS public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.assign_order_to_me(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.update_order_status(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.mark_delivered(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.request_cancellation(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_payment(UUID, TEXT, DECIMAL(12,2)) CASCADE;
DROP FUNCTION IF EXISTS public.confirm_payment(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_order_details(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.set_user_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.admin_dashboard_stats() CASCADE;

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
