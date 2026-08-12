-- =====================================================================
--  محلات أبو بشار — التهيئة الكاملة
-- =====================================================================
-- =====================================================================
-- إصلاح سريع: إسقاط الدوال القديمة المتعارضة قبل إعادة إنشائها
-- شغّل هذا الملف أولاً إذا ظهر خطأ:
--   42P13: cannot change return type of existing function
-- =====================================================================

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

-- رسالة تأكيد
DO $$
BEGIN
  RAISE NOTICE 'تم إسقاط الدوال القديمة. يمكنك الآن تشغيل 02_rpc.sql أو FULL_SETUP.sql بأمان.';
END $$;

-- ===== sql/01_schema.sql =====
-- =====================================================================
-- أبو بشار ستورز - المخطط الكامل لقاعدة البيانات (PostgreSQL / Supabase)
-- يتضمن: الملفات الشخصية، الفئات، المنتجات، الطلبات، عناصر الطلب،
--         عمليات الدفع المحلية، سياسات RLS، الفهارس، والمحفزات.
-- =====================================================================

-- امتداد لتوليد المعرّفات (مُفعّل افتراضياً في Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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


CREATE OR REPLACE FUNCTION public.current_role_name()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN role FROM public.profiles WHERE id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN COALESCE(current_role_name() = 'admin', false);
END;
$$;

-- الموظفون: مدير، مسؤول، عامل توصيل
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN COALESCE(current_role_name() IN ('admin', 'manager', 'delivery'), false);
END;
$$;


CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- محفّز إنشاء ملف شخصي تلقائياً عند تسجيل مستخدم جديد في auth.users






-- =====================================================================
-- 1. جدول المستخدمين والصلاحيات (Profiles & RBAC)
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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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

-- ===== sql/02_rpc.sql =====
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

-- ===== sql/03_banners.sql =====
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

-- ===== sql/04_security.sql =====
-- =====================================================================
-- أبو بشار ستورز - ترقية الأمان الصارمة v3
-- تجبّ ما يلي بعد تشغيل جميع الملفات السابقة، وتصلّب سياسات RLS:
--   1) منع العملاء من رفع أدوارهم (privilege escalation).
--   2) منع إدراج دفعة بحالة مدفوعة مباشرة (يجب أن يمر تأكيد الموظف).
--   3) حصر الكتابة في order_items على الموظفين (الطلب الذكي يتم عبر دالة SECURITY DEFINER).
--   4) تقييد الطلبات التي ينشئها العميل مباشرة.
--   5) حاوية تخزين إثباتات الدفع وسياساتها.
--   6) منح صلاحيات التنفيذ للدوال بشكل صريح.
-- =====================================================================

-- 1) منع ترفيع الدور إلا من مسؤول ---------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_profile_role_stability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role
       AND NOT public.is_admin()
    THEN
        RAISE EXCEPTION 'لا يمكنك تغيير الدور (مطلوب صلاحية مسؤول)'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_stability();

-- تحديث سياسة التعديل: العميل يعدّل ملفه فقط، والموظفون يعدّلون أي ملف
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_self_or_admin" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id OR public.is_staff())
    WITH CHECK (auth.uid() = id OR public.is_staff());

-- 2) تصلّب الدفعات: لا يمكن إدراجها إلا بحالة pending -----------------
DROP POLICY IF EXISTS "transactions_insert_owner_or_staff" ON public.transactions;
CREATE POLICY "transactions_insert_owner_or_staff" ON public.transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id
              AND (o.customer_id = auth.uid() OR public.is_staff())
        )
        AND status = 'pending'
        AND paid_at IS NULL
    );

-- 3) حصر الكتابة في عناصر الطلب على الموظفين --------------------------
--    (الطلب الذكي create_order_atomic يعمل بصفة SECURITY DEFINER ويتجاوز RLS)
DROP POLICY IF EXISTS "order_items_insert_owner_or_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_staff" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_staff" ON public.order_items;

CREATE POLICY "order_items_insert_staff_only" ON public.order_items
    FOR INSERT WITH CHECK (public.is_staff());
CREATE POLICY "order_items_update_staff_only" ON public.order_items
    FOR UPDATE USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "order_items_delete_staff_only" ON public.order_items
    FOR DELETE USING (public.is_staff());

-- 4) تقييد الطلبات التي ينشئها العميل مباشرة ---------------------------
DROP POLICY IF EXISTS "orders_insert_owner_or_staff" ON public.orders;
CREATE POLICY "orders_insert_owner_or_staff" ON public.orders
    FOR INSERT
    WITH CHECK (
        (
            customer_id = auth.uid()
            AND total_amount = 0
            AND status = 'pending'
            AND assigned_to IS NULL
            AND deposit_paid = false
        )
        OR public.is_staff()
    );

-- 5) حاوية إثباتات الدفع وسياساتها ------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "proofs_select" ON storage.objects;
CREATE POLICY "proofs_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "proofs_insert_owner" ON storage.objects;
CREATE POLICY "proofs_insert_owner" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "proofs_delete_staff" ON storage.objects;
CREATE POLICY "proofs_delete_staff" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'payment-proofs' AND public.is_staff());

-- 6) تأكيد صلاحيات تنفيذ دوال RPC ------------------------------------
GRANT EXECUTE ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_to_me(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_order_status(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_delivered(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_cancellation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

REVOKE ALL ON FUNCTION public.create_order_atomic(TEXT, JSONB, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_order_to_me(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_order_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_delivered(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_cancellation(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment(UUID, TEXT, DECIMAL, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_payment(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_payment_proof(UUID, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_details(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_user_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;

-- =====================================================================
-- انتهت الترقية الأمنية. تحقق سريع بعد التشغيل:
--   SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid::regclass::text LIKE 'public.%';
-- =====================================================================

-- ===== sql/05_roles.sql =====
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

-- ===== sql/06_scaling.sql =====
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

-- ===== sql/07_storage.sql =====
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

-- ===== sql/08_marketing.sql =====
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

-- ===== sql/09_ai.sql =====
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

-- ===== sql/10_seed.sql =====
-- =====================================================================
-- أبو بشار ستورز - البيانات التجريبية (Seed Data)
-- تُشغّل بعد abubashar_schema.sql ثم abubashar_rpc.sql
-- البيانات آمنة لإعادة التشغيل (Idempotent):
--   - الفئات تُدرج حسب slug (ON CONFLICT).
--   - المنتجات تُدرج إذا لم يكن العنوان موجوداً مسبقاً.
--   - حساب المسؤول وبيانات الاختبار داخل DO blocks متحكّمة.
--
-- ⚠️  غيّر كلمة المرور ورقم الهاتف قبل الإنتاج!
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) الفئات (ملابس وأحذية وكسوة فاخرة)
-- ---------------------------------------------------------------------
INSERT INTO public.categories (name_ar, slug, image_url, is_active, sort_order) VALUES
    ('الثياب اليمنية الفاخرة', 'thobes',         'https://placehold.co/600x600/0f0f0f/c9a24b?text=Thobes',        true, 1),
    ('البشوت والفراء',        'bisht',          'https://placehold.co/600x600/0f0f0f/c9a24b?text=Bisht',         true, 2),
    ('الأحذية الرجالية',      'shoes',          'https://placehold.co/600x600/0f0f0f/c9a24b?text=Shoes',         true, 3),
    ('العطور والبخور',        'perfumes',       'https://placehold.co/600x600/0f0f0f/c9a24b?text=Perfumes',      true, 4),
    ('الإكسسوارات الفاخرة',   'accessories',    'https://placehold.co/600x600/0f0f0f/c9a24b?text=Accessories',   true, 5)
ON CONFLICT (slug) DO UPDATE
SET name_ar = EXCLUDED.name_ar,
    image_url = EXCLUDED.image_url,
    sort_order = EXCLUDED.sort_order,
    is_active = EXCLUDED.is_active;

-- ---------------------------------------------------------------------
-- 2) المنتجات (الأسعار بالريال اليمني - YER)
-- ---------------------------------------------------------------------
WITH c AS (
    SELECT 'thobes'      AS slug, 'https://placehold.co/800x1000/0f0f0f/c9a24b?text=' AS img
    UNION ALL SELECT 'bisht',       'https://placehold.co/800x1000/1a1a1a/c9a24b?text='
    UNION ALL SELECT 'shoes',       'https://placehold.co/800x1000/0f0f0f/c9a24b?text='
    UNION ALL SELECT 'perfumes',    'https://placehold.co/800x1000/1a1a1a/c9a24b?text='
    UNION ALL SELECT 'accessories', 'https://placehold.co/800x1000/0f0f0f/c9a24b?text='
)
INSERT INTO public.products
    (category_id, title_ar, description_ar, price, compare_at_price,
     stock_quantity, images, sizes, is_featured, is_active)
SELECT
    cat.id,
    p.title_ar,
    p.description_ar,
    p.price::decimal(12,2),
    p.compare_at_price::decimal(12,2),
    p.stock,
    p.images::text[],
    p.sizes::text[],
    p.featured,
    true
FROM (VALUES
    -- الثياب
    ('thobes','ثوب يمني سدرة - صناعة يدوية فاخرة','ثوب سدرة أصيل مطرّز بخيوط حريرية بأعلى معايير الخياطة الصنعانية.',
     35000, 42000, 24, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Sedra+1','https://placehold.co/800x1000/0f0f0f/c9a24b?text=Sedra+2'],
     ARRAY['54','56','58','60','62'], true),
    ('thobes','ثوب قطن مصري - كلاسيك','ثوب قطن مصري 100% بقصّة عصرية ومريحة، مناسب لجميع المناسبات.',
     18000, 22000, 40, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Cotton+1'],
     ARRAY['52','54','56','58','60'], false),
    ('thobes','ثوب شتوي مبطّن بالفرو','ثوب شتوي ببطانة داخلية دافئة وقماش خارجي متين، لفصل الشتاء.',
     42000, 50000, 15, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Winter+1'],
     ARRAY['56','58','60','62'], true),
    ('thobes','ثوب معوزة - تراث يمني','ثوب معوزة تقليدي بألوان ترابية وخطوط يدوية مميزة.',
     28000, NULL, 18, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Maawaza+1'],
     ARRAY['54','56','58'], false),

    -- البشوت
    ('bisht','بشت ملكي مطرّز بالذهبي','بشت ملكي بقماش صوف فاخر وتطريز ذهبي أنيق، للمناسبات الرسمية والأعراس.',
     85000, 95000, 8, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Royal+Bisht+1','https://placehold.co/800x1000/1a1a1a/c9a24b?text=Royal+Bisht+2'],
     ARRAY['56','58','60'], true),
    ('bisht','بشت عقال أسود كلاسيكي','بشت أسود أنيق بقصّة رجالية تقليدية، مناسب للإهداء والمناسبات.',
     55000, NULL, 12, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Classic+Bisht+1'],
     ARRAY['54','56','58','60'], false),
    ('bisht','فروة شتوية فاخرة','فروة شتوية ببطانة فرو طبيعي ومظهر فخم، تمنحك الدفء والأناقة.',
     120000, 135000, 5, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Furwa+1'],
     ARRAY['58','60','62'], true),

    -- الأحذية
    ('shoes','حذاء جلد طبيعي كلاسيك','حذاء رجالي من الجلد الطبيعي الفاخر بنعل مريح وخياطة متينة.',
     22000, 26000, 30, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Classic+Shoe+1'],
     ARRAY['40','41','42','43','44'], true),
    ('shoes','حذاء سباحة جلدي','حذاء سباحة مصنوع يدوياً من الجلد الطبيعي، تصميم تراثي مريح.',
     14000, NULL, 25, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Sabaha+1'],
     ARRAY['40','41','42','43'], false),
    ('shoes','بوت جلد شتوي','بوت رجالي شتوي من الجلد السميك ببطانة داخلية دافئة.',
     32000, 38000, 14, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Boot+1'],
     ARRAY['41','42','43','44'], true),
    ('shoes','صندل رسمي فاخر','صندل جلدي رسمي بتصميم أنيق ومريح للاستعمال اليومي والمناسبات.',
     16000, 19000, 3, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Sandal+1'],
     ARRAY['40','41','42','43','44'], false),

    -- العطور
    ('perfumes','دهن العود الملكي - 50 مل','دهن عود كمبودي فاخر برائحة ثابتة وفواحة، يأتي في عبوة هدايا أنيقة.',
     45000, 52000, 20, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Oud+1'],
     ARRAY['50ml'], true),
    ('perfumes','بخور العود المعسّل','بخور عود معسّل طبيعي برائحة دافئة، مثالي للمجالس والمناسبات.',
     18000, 22000, 28, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Bakhoor+1'],
     ARRAY['50g','100g'], false),
    ('perfumes','طقم عطور هدية فاخر','طقم هدايا مكوّن من دهن عود وبخور وعطر فرنسي في علبة مخملية فاخرة.',
     75000, 90000, 10, ARRAY['https://placehold.co/800x1000/1a1a1a/c9a24b?text=Gift+Set+1'],
     ARRAY['set'], true),

    -- الإكسسوارات
    ('accessories','جنبية يمنية مطعّمة بالفضة','جنبية يمنية أصيلة مطعّمة بالفضة الخالصة بحزام جلدي فاخر.',
     95000, 110000, 6, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Janbiya+1'],
     ARRAY['one-size'], true),
    ('accessories','محفظة جلد طبيعي فاخرة','محفظة رجالية من الجلد الطبيعي بتصميم أنيق وعدة جيوب منظمة.',
     12000, 15000, 35, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Wallet+1'],
     ARRAY['one-size'], false),
    ('accessories','ساعة يد رجالية كلاسيك','ساعة رجالية فاخرة بسوار جلدي وحركة دقيقة ومقاومة للماء.',
     38000, 45000, 11, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Watch+1'],
     ARRAY['one-size'], true),
    ('accessories','عقال وغترة فاخرة','طقم عقال وغترة مطرّز بعناية، يكمل إطلالتك التقليدية بأناقة.',
     8500, NULL, 50, ARRAY['https://placehold.co/800x1000/0f0f0f/c9a24b?text=Oqal+1'],
     ARRAY['one-size'], false)
) AS p(cat_slug, title_ar, description_ar, price, compare_at_price, stock, images, sizes, featured)
JOIN public.categories cat ON cat.slug = p.cat_slug
WHERE NOT EXISTS (
    SELECT 1 FROM public.products existing WHERE existing.title_ar = p.title_ar
);

-- ---------------------------------------------------------------------
-- 3) إنشاء حساب المسؤول الافتراضي وحسابات الاختبار
--    الهاتف على الصيغة الدولية: 967XXXXXXXXX
--    كلمة المرور: Abubashar@2026  ← غيّرها فوراً بعد التشغيل!
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_admin_id UUID;
    v_manager_id UUID;
    v_delivery_id UUID;
    v_customer_id UUID;
BEGIN
    -- المسؤول
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '967777000001') THEN
        v_admin_id := gen_random_uuid();
        PERFORM auth.admin.create_user(
            _id => v_admin_id::text,
            _email => 'admin@abubashar.ye',
            _phone => '967777000001',
            _password => 'Abubashar@2026',
            _email_confirm => true,
            _phone_confirm => true,
            _user_metadata => jsonb_build_object('full_name', 'مدير المتجر')
        );
        -- سيقوم المحفّز handle_new_user بإنشاء الملف الشخصي،
        -- ثم نرفع الدور إلى admin:
        UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;
    END IF;

    -- مدير العمليات
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '967777000002') THEN
        v_manager_id := gen_random_uuid();
        PERFORM auth.admin.create_user(
            _id => v_manager_id::text,
            _email => 'manager@abubashar.ye',
            _phone => '967777000002',
            _password => 'Abubashar@2026',
            _email_confirm => true,
            _phone_confirm => true,
            _user_metadata => jsonb_build_object('full_name', 'مدير العمليات')
        );
        UPDATE public.profiles SET role = 'manager' WHERE id = v_manager_id;
    END IF;

    -- عامل توصيل
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '967777000003') THEN
        v_delivery_id := gen_random_uuid();
        PERFORM auth.admin.create_user(
            _id => v_delivery_id::text,
            _email => 'delivery@abubashar.ye',
            _phone => '967777000003',
            _password => 'Abubashar@2026',
            _email_confirm => true,
            _phone_confirm => true,
            _user_metadata => jsonb_build_object('full_name', 'عامل التوصيل')
        );
        UPDATE public.profiles SET role = 'delivery' WHERE id = v_delivery_id;
    END IF;

    -- عميل تجريبي
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE phone = '967777100001') THEN
        v_customer_id := gen_random_uuid();
        PERFORM auth.admin.create_user(
            _id => v_customer_id::text,
            _email => 'customer@example.com',
            _phone => '967777100001',
            _password => 'Customer@2026',
            _email_confirm => true,
            _phone_confirm => true,
            _user_metadata => jsonb_build_object('full_name', 'عميل تجريبي')
        );
        RAISE NOTICE 'تم إنشاء العميل التجريبي بالمعرّف %', v_customer_id;
    END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) عربات وطلبات تجريبية (للمعاينة فقط، لا تنفّذ في الإنتاج)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_customer UUID;
    v_delivery UUID;
    v_p1 UUID;
    v_p2 UUID;
    v_p3 UUID;
    v_p4 UUID;
    v_order1 UUID;
    v_order2 UUID;
BEGIN
    SELECT id INTO v_customer FROM public.profiles WHERE phone = '967777100001';
    SELECT id INTO v_delivery FROM public.profiles WHERE phone = '967777000003';

    IF v_customer IS NULL THEN
        RETURN;     -- لم يُنشأ العميل التجريبي، نتخطى
    END IF;

    SELECT id INTO v_p1 FROM public.products WHERE title_ar = 'ثوب يمني سدرة - صناعة يدوية فاخرة' LIMIT 1;
    SELECT id INTO v_p2 FROM public.products WHERE title_ar = 'بشت ملكي مطرّز بالذهبي'          LIMIT 1;
    SELECT id INTO v_p3 FROM public.products WHERE title_ar = 'حذاء جلد طبيعي كلاسيك'           LIMIT 1;
    SELECT id INTO v_p4 FROM public.products WHERE title_ar = 'دهن العود الملكي - 50 مل'        LIMIT 1;

    -- إضافة عناصر إلى سلة العميل (بدون خصم مخزون)
    INSERT INTO public.cart (customer_id, product_id, size, quantity)
    SELECT v_customer, v_p3, '42', 1
    WHERE v_p3 IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.cart
        WHERE customer_id = v_customer AND product_id = v_p3 AND size = '42'
    );

    -- إنشاء طلبين تجريبيين إن لم يكن للعميل طلبات سابقة
    IF NOT EXISTS (SELECT 1 FROM public.orders WHERE customer_id = v_customer) THEN

        -- الطلب الأول: قيد المعالجة مع عربون مدفوع ومسند لعامل توصيل
        INSERT INTO public.orders
            (customer_id, total_amount, status, shipping_address,
             gps_coordinates, deposit_paid, assigned_to, note)
        VALUES
            (v_customer, 0, 'processing', 'صنعاء - شارع الستين، بجوار جامتمر الإيمان',
             point(44.2067, 15.3508), true, v_delivery, 'الرجاء الاتصال قبل التوصيل')
        RETURNING id INTO v_order1;

        INSERT INTO public.order_items (order_id, product_id, title_ar, unit_price, size, quantity)
        SELECT v_order1, v_p1, p.title_ar, p.price, '58', 1
        FROM public.products p WHERE p.id = v_p1;

        INSERT INTO public.order_items (order_id, product_id, title_ar, unit_price, size, quantity)
        SELECT v_order1, v_p4, p.title_ar, p.price, '50ml', 1
        FROM public.products p WHERE p.id = v_p4;

        INSERT INTO public.transactions
            (order_id, amount, method, status, provider, reference, paid_at)
        VALUES
            (v_order1, 20000, 'bank_transfer', 'paid', 'بنك الكريمي',
             'DEP-' || lpad((floor(random()*1000000))::text, 6, '0'),
             NOW() - INTERVAL '1 day');

        -- الطلب الثاني: جديد بانتظار المعالجة (بدون عربون)
        INSERT INTO public.orders
            (customer_id, total_amount, status, shipping_address, gps_coordinates)
        VALUES
            (v_customer, 0, 'pending', 'صنعاء - حدة، أمام مستشفى الكويت', point(44.1910, 15.3450))
        RETURNING id INTO v_order2;

        INSERT INTO public.order_items (order_id, product_id, title_ar, unit_price, size, quantity)
        SELECT v_order2, v_p2, p.title_ar, p.price, '58', 1
        FROM public.products p WHERE p.id = v_p2;

    END IF;
END $$;

-- ---------------------------------------------------------------------
-- ملخص سريع بعد الحقن (يمكن تشغيله يدوياً للتحقق)
-- ---------------------------------------------------------------------
-- SELECT 'categories' AS tbl, COUNT(*) FROM public.categories
-- UNION ALL SELECT 'products', COUNT(*) FROM public.products
-- UNION ALL SELECT 'orders', COUNT(*) FROM public.orders
-- UNION ALL SELECT 'order_items', COUNT(*) FROM public.order_items
-- UNION ALL SELECT 'transactions', COUNT(*) FROM public.transactions
-- UNION ALL SELECT 'profiles', COUNT(*) FROM public.profiles;
--
-- بيانات الدخول الافتراضية (غيّرها فوراً):
--   المسؤول:      967777000001  /  Abubashar@2026
--   مدير العمليات: 967777000002  /  Abubashar@2026
--   عامل التوصيل:  967777000003  /  Abubashar@2026
--   عميل تجريبي:  967777100001  /  Customer@2026
-- =====================================================================
