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
  // الأقسام الرئيسية
  { id: 'c1', name_ar: 'رجالي', slug: 'men', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Men', is_active: true, sort_order: 1 },
  { id: 'c2', name_ar: 'نسائي', slug: 'women', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Women', is_active: true, sort_order: 2 },
  { id: 'c3', name_ar: 'أولادي وبناتي', slug: 'kids', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Kids', is_active: true, sort_order: 3 },
  { id: 'c4', name_ar: 'أحذية', slug: 'shoes', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Shoes', is_active: true, sort_order: 4 },
  { id: 'c5', name_ar: 'شرابات وكماليات', slug: 'accessories', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Accessories', is_active: true, sort_order: 5 },

  // رجالي
  { id: 'c10', name_ar: 'المعاوز اليمنية', slug: 'mawaz', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Mawaz', is_active: true, sort_order: 10, parent_id: 'c1' },
  { id: 'c11', name_ar: 'الشيلان والشمغ', slug: 'ghutra', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Ghutra', is_active: true, sort_order: 11, parent_id: 'c1' },
  { id: 'c12', name_ar: 'القمصان', slug: 'shirts', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Shirts', is_active: true, sort_order: 12, parent_id: 'c1' },
  { id: 'c13', name_ar: 'السراويل والشورتات', slug: 'pants', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Pants', is_active: true, sort_order: 13, parent_id: 'c1' },
  { id: 'c14', name_ar: 'البدلات', slug: 'suits', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Suits', is_active: true, sort_order: 14, parent_id: 'c1' },
  { id: 'c15', name_ar: 'الفنايل الداخلية', slug: 'undershirts', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Undershirts', is_active: true, sort_order: 15, parent_id: 'c1' },

  // نسائي
  { id: 'c20', name_ar: 'الدروع اليمنية', slug: 'darae', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Darae', is_active: true, sort_order: 20, parent_id: 'c2' },
  { id: 'c21', name_ar: 'الفساتين', slug: 'dresses', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Dresses', is_active: true, sort_order: 21, parent_id: 'c2' },
  { id: 'c22', name_ar: 'العبايات', slug: 'abayas', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Abayas', is_active: true, sort_order: 22, parent_id: 'c2' },
  { id: 'c23', name_ar: 'ملابس النوم والداخلية', slug: 'sleepwear', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Sleepwear', is_active: true, sort_order: 23, parent_id: 'c2' },

  // أولادي وبناتي
  { id: 'c30', name_ar: 'بدلات أولاد', slug: 'boys-suits', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Boys', is_active: true, sort_order: 30, parent_id: 'c3' },
  { id: 'c31', name_ar: 'فساتين بناتي', slug: 'girls-dresses', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Girls', is_active: true, sort_order: 31, parent_id: 'c3' },
  { id: 'c32', name_ar: 'ملابس أطفال', slug: 'kids-clothes', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Kids', is_active: true, sort_order: 32, parent_id: 'c3' },

  // أحذية
  { id: 'c40', name_ar: 'أحذية رياضية', slug: 'sneakers', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Sneakers', is_active: true, sort_order: 40, parent_id: 'c4' },
  { id: 'c41', name_ar: 'بواتي', slug: 'boots', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Boots', is_active: true, sort_order: 41, parent_id: 'c4' },
  { id: 'c42', name_ar: 'أحذية رسمية', slug: 'formal-shoes', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Formal', is_active: true, sort_order: 42, parent_id: 'c4' },
  { id: 'c43', name_ar: 'صنادل ومداع', slug: 'sandals', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Sandals', is_active: true, sort_order: 43, parent_id: 'c4' },
  { id: 'c44', name_ar: 'أحذية أطفال', slug: 'kids-shoes', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=KidsShoes', is_active: true, sort_order: 44, parent_id: 'c4' },

  // شرابات وكماليات
  { id: 'c50', name_ar: 'الشرابات', slug: 'socks', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Socks', is_active: true, sort_order: 50, parent_id: 'c5' },
  { id: 'c51', name_ar: 'الأحزمة', slug: 'belts', image_url: 'https://placehold.co/600x600/1a1a1a/c9a24b?text=Belts', is_active: true, sort_order: 51, parent_id: 'c5' },
  { id: 'c52', name_ar: 'العناية بالأحذية', slug: 'shoe-care', image_url: 'https://placehold.co/600x600/0f0f0f/c9a24b?text=Care', is_active: true, sort_order: 52, parent_id: 'c5' },
];


