'use client';

import type { CartLine } from './cart-store';
import type { Category, Product } from './types';

const MEN_PREFIX = 'c1'; // رجالي
const WOMEN_PREFIX = 'c2'; // نسائي
const KIDS_PREFIX = 'c3'; // أولادي

/**
 * خصم عائلي: خصم إضافي 5% + توصيل مجاني عند شراء قطع من قسمين مختلفين
 * من أقسام (رجالي/نسائي/أولادي). يعتمد على أصناف المنتجات.
 */
export function calcFamilyDiscount(
  lines: CartLine[],
  products: Product[],
  categories: Category[],
): { applies: boolean; sections: string[]; discount: number; freeShipping: boolean } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const catById = new Map(categories.map((c) => [c.id, c]));

  const sections = new Set<string>();
  for (const l of lines) {
    const product = byId.get(l.product_id);
    if (!product) continue;
    // صعد لأعلى شجرة الصنف لمعرفة القسم الرئيسي
    let cat = catById.get(product.category_id ?? '');
    while (cat?.parent_id) cat = catById.get(cat.parent_id);
    if (cat?.id === MEN_PREFIX) sections.add('men');
    if (cat?.id === WOMEN_PREFIX) sections.add('women');
    if (cat?.id === KIDS_PREFIX) sections.add('kids');
  }

  const applies = sections.size >= 2;
  return {
    applies,
    sections: Array.from(sections),
    discount: applies ? 5 : 0, // 5% خصم عائلي
    freeShipping: applies,
  };
}
