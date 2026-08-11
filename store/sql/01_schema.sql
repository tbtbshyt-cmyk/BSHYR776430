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
