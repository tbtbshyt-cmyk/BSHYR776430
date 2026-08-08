'use client';

/**
 * طبقة تخزين تجريبي موحّدة (localStorage).
 * تجعل بيانات المتجر تعمل في الوضع غير المتصل بـ Supabase:
 * المنتجات الجديدة/المعدّلة/المحذوفة تظهر في المتجر ولوحة التحكم معاً.
 */
import type { Banner, Category, Product } from '@/lib/types';
import { mockBanners, mockCategories, mockProducts } from '@/lib/mock-data';

const P = {
  products: 'abubashar-demo-products',
  productsDel: 'abubashar-demo-products-deleted',
  categories: 'abubashar-demo-categories',
  banners: 'abubashar-demo-banners',
  settings: 'abubashar-demo-settings',
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event('abubashar-change'));
}

/* ---------------- المنتجات ---------------- */

export function getDemoProducts(): Product[] {
  const overrides = read<Product[]>(P.products, []);
  const deleted = new Set(read<string[]>(P.productsDel, []));
  const byId = new Map<string, Product>();
  for (const p of mockProducts) if (!deleted.has(p.id)) byId.set(p.id, p);
  for (const p of overrides) byId.set(p.id, p);
  return Array.from(byId.values()).sort((a, b) => (a.id < b.id ? 1 : -1));
}

export function saveDemoProduct(p: Product) {
  const list = read<Product[]>(P.products, []);
  const idx = list.findIndex((x) => x.id === p.id);
  if (idx >= 0) list[idx] = p;
  else list.unshift(p);
  write(P.products, list);
}

export function deleteDemoProduct(id: string) {
  const list = read<Product[]>(P.products, []).filter((p) => p.id !== id);
  write(P.products, list);
  const del = read<string[]>(P.productsDel, []);
  if (!del.includes(id)) write(P.productsDel, [...del, id]);
}

/* ---------------- الأصناف ---------------- */

export function getDemoCategories(): Category[] {
  const overrides = read<Category[]>(P.categories, []);
  const byId = new Map<string, Category>();
  for (const c of mockCategories) byId.set(c.id, c);
  for (const c of overrides) byId.set(c.id, c);
  return Array.from(byId.values());
}

export function saveDemoCategory(c: Category) {
  const list = read<Category[]>(P.categories, []);
  const idx = list.findIndex((x) => x.id === c.id);
  if (idx >= 0) list[idx] = c;
  else list.push(c);
  write(P.categories, list);
}

export function deleteDemoCategory(id: string) {
  write(
    P.categories,
    read<Category[]>(P.categories, []).filter((c) => c.id !== id),
  );
}

/* ---------------- البانرات ---------------- */

export function getDemoBanners(): Banner[] {
  const local = read<Banner[]>(P.banners, []);
  return local.length ? local : mockBanners;
}

export function saveDemoBanners(banners: Banner[]) {
  write(P.banners, banners);
}

/* ---------------- إعدادات المتجر ---------------- */

export interface StoreSettings {
  store_name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  working_hours: string;
  facebook: string;
  instagram: string;
  currency: string;
  free_shipping_threshold: number;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'أبو بشار جوال',
  tagline: 'ملابس وأحذية رجالية فاخرة - شبوة عتق',
  phone: '776430697',
  whatsapp: '967776430697',
  email: '',
  address: 'شبوة - عتق - خالف سوق الجوالات - خلف شبوة مول الجديد',
  city: 'عتق، شبوة',
  working_hours: 'السبت - الخميس: 9ص - 10م',
  facebook: '',
  instagram: '',
  currency: 'ر.ي',
  free_shipping_threshold: 0,
};

const SETTINGS_VERSION = '1';

export function getSettings(): StoreSettings {
  const stored = read<Partial<StoreSettings & { __v?: string }>>(P.settings, {});
  // Reset stored settings when defaults change (e.g. store name/phone/address)
  if (stored.__v !== SETTINGS_VERSION) {
    return DEFAULT_SETTINGS;
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(s: StoreSettings) {
  write(P.settings, { ...s, __v: SETTINGS_VERSION } as StoreSettings);
}

/* ---------------- الاستيراد بالجملة ---------------- */

/**
 * استيراد منتجات من مصفوفة كائنات (يدعم حتى 500 منتج).
 * يقبل الحقول: title, price, category, stock, description, image, images, sizes...
 */
export function bulkImportProducts(rows: Record<string, unknown>[]): { imported: number } {
  const existing = getDemoProducts();
  const cats = getDemoCategories();
  const catByName = new Map(cats.map((c) => [c.name_ar.toLowerCase(), c.id]));
  const now = Date.now();
  const added: Product[] = rows.map((row, i) => {
    const title = String(row.title ?? row.name ?? row.product ?? 'منتج').trim();
    const price = Number(row.price ?? row.cost ?? 0) || 0;
    const compare = row.compare_at_price ? Number(row.compare_at_price) : null;
    const stock = Number(row.stock ?? row.quantity ?? 0) || 0;
    const catName = String(row.category ?? '').trim().toLowerCase();
    const category_id = catByName.get(catName) ?? cats[0]?.id ?? null;
    const imgs: string[] = [];
    if (typeof row.image === 'string' && row.image) imgs.push(row.image);
    if (typeof row.images === 'string') imgs.push(...row.images.split(/[,|]/).map((s: string) => s.trim()).filter(Boolean));
    const sizes =
      typeof row.sizes === 'string'
        ? row.sizes.split(',').map((s: string) => s.trim()).filter(Boolean)
        : ['one-size'];
    return {
      id: `bulk-${now}-${i}`,
      title_ar: title,
      description_ar: row.description ? String(row.description) : null,
      price,
      compare_at_price: compare,
      stock_quantity: stock,
      category_id,
      images: imgs.length ? imgs : ['https://placehold.co/800x1000/0f0f0f/c9a24b?text=' + encodeURIComponent(title)],
      sizes,
      is_featured: row.featured === true || row.featured === 'true',
      is_active: row.active !== false && row.active !== 'false',
      barcode: row.barcode ? String(row.barcode) : null,
    } as Product;
  });
  for (const p of added) existing.push(p);
  write(P.products, [...read<Product[]>(P.products, []), ...added]);
  return { imported: added.length };
}

/** تحويل ملف JSON/CSV إلى مصفوفة صفوف */
export function parseImportFile(text: string, fileName: string): Record<string, unknown>[] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  }
  // CSV
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, unknown> = {};
    headers.forEach((h, i) => (row[h] = (cells[i] ?? '').trim()));
    return row;
  });
}
