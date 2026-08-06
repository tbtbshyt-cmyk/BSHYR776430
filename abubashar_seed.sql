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
