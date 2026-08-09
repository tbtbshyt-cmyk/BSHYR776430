'use client';

import type { Product } from './types';

export interface Bundle {
  id: string;
  title: string;
  description: string;
  product_ids: string[];
  discount_pct: number; // نسبة خصم على المجموع
}

/**
 * باقات مقترحة ثابتة (تُدار لاحقاً من CMS).
 * في الوضع الحقيقي تأتي من جدول bundles في قاعدة البيانات.
 */
export const DEMO_BUNDLES: Bundle[] = [
  {
    id: 'bundle-friday',
    title: 'طقم الجمعة الكامل',
    description: 'ثوب سدرة + بشت ملكي + عقال وغترة',
    product_ids: ['p1', 'p2', 'p12'],
    discount_pct: 12,
  },
  {
    id: 'bundle-casual',
    title: 'اللوك اليومي',
    description: 'قميص قطني + حذاء رياضي + حزام جلد',
    product_ids: ['p3', 'p6', 'p10'],
    discount_pct: 10,
  },
];

export function bundleTotal(products: Product[], bundle: Bundle) {
  const items = bundle.product_ids
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));
  const sum = items.reduce((s, p) => s + p.price, 0);
  const discounted = Math.round(sum * (1 - bundle.discount_pct / 100));
  return { items, sum, discounted, savings: sum - discounted };
}
