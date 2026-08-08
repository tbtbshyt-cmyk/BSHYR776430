import type { Banner, Category } from "./types";
import { mockProducts } from "./mock-products";

export const mockBanners: Banner[] = [
  {
    id: 'b1',
    title_ar: 'مجموعة البشوت الملكية',
    subtitle_ar: 'تطريز ذهبي وقماش صوف فاخر للمناسبات الكبرى',
    image_url: 'https://placehold.co/1600x600/0f0f0f/c9a24b?text=Royal+Bisht+Collection',
    cta_label: 'تسوّق البشوت',
    cta_link: '/products?slug=bisht',
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'b2',
    title_ar: 'عطور العود الفاخرة',
    subtitle_ar: 'دهن عود كمبودي وبخور معسّل برائحة ثابتة',
    image_url: 'https://placehold.co/1600x600/1a1a1a/c9a24b?text=Oud+%26+Bakhoor',
    cta_label: 'اكتشف العطور',
    cta_link: '/products?slug=perfumes',
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'b3',
    title_ar: 'توصيل داخل اليمن',
    subtitle_ar: 'اطلب الآن وادفع عند الاستلام مع تغطية واسعة',
    image_url: 'https://placehold.co/1600x600/0f0f0f/c9a24b?text=Delivery+across+Yemen',
    cta_label: 'ابدأ التسوق',
    cta_link: '/products',
    is_active: true,
    sort_order: 3,
  },
];
export { mockProducts };

// نسخة مطابقة لبيانات abubashar_seed.sql لتعمل الواجهة فوراً بدون قاعدة بيانات.
export const mockCategories: Category[] = [
  { id: 'c1', name_ar: 'الملابس الرجالية', slug: 'clothes', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Clothes', is_active: true, sort_order: 1 },
  { id: 'c2', name_ar: 'الأحذية', slug: 'shoes', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Shoes', is_active: true, sort_order: 2 },
  { id: 'c3', name_ar: 'الإكسسوارات', slug: 'accessories', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Accessories', is_active: true, sort_order: 3 },
];


