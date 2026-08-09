'use client';

import { useState } from 'react';
import type { Category, Product } from '@/lib/types';
import { ImageUploader } from './ImageUploader';

export function ProductForm({
  initial,
  categories,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Product>;
  categories: Category[];
  onSubmit: (data: Partial<Product>) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial?.title_ar ?? '');
  const [desc, setDesc] = useState(initial?.description_ar ?? '');
  const [price, setPrice] = useState(initial?.price?.toString() ?? '');
  const [compare, setCompare] = useState(initial?.compare_at_price?.toString() ?? '');
  const [stock, setStock] = useState(initial?.stock_quantity?.toString() ?? '0');
  const [categoryId, setCategoryId] = useState(initial?.category_id ?? categories[0]?.id ?? '');
  const [sizes, setSizes] = useState((initial?.sizes ?? ['one-size']).join(','));
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [barcode, setBarcode] = useState(initial?.barcode ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [cost, setCost] = useState(initial?.cost_price?.toString() ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [featured, setFeatured] = useState(initial?.is_featured ?? false);
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) { setFormError('اسم المنتج مطلوب'); return; }
    if (!price || Number(price) <= 0) { setFormError('السعر غير صحيح'); return; }
    setSaving(true);
    try {
      await onSubmit({
        title_ar: title,
        description_ar: desc,
        price: Number(price),
        compare_at_price: compare ? Number(compare) : null,
        stock_quantity: Number(stock),
        category_id: categoryId || null,
        sizes: sizes.split(',').map((s) => s.trim()).filter(Boolean),
        images,
        barcode: barcode.trim() || null,
        sku: sku.trim() || null,
        cost_price: cost ? Number(cost) : undefined,
        color: color.trim() || null,
        is_featured: featured,
        is_active: active,
      });
    } catch (err: any) {
      setFormError(err?.message ?? 'فشل حفظ المنتج');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">اسم المنتج *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">الفئة</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name_ar}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">الوصف</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="input-field resize-none" />
      </label>

      <div className="grid gap-4 md:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">السعر *</span>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} required className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">السعر قبل الخصم</span>
          <input type="number" value={compare} onChange={(e) => setCompare(e.target.value)} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">المخزون</span>
          <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">الباركود</span>
          <input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="EAN-13 / UPC" dir="ltr" className="input-field text-right" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">SKU</span>
          <input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="رمز المنتج" dir="ltr" className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">سعر التكلفة (جملة)</span>
          <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="input-field" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">اللون</span>
          <input value={color} onChange={(e) => setColor(e.target.value)} className="input-field" />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">المقاسات (مفصولة بفاصلة)</span>
        <input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="54, 56, 58" className="input-field" />
      </label>

      <div className="block">
        <span className="mb-1 block text-sm font-semibold">صور المنتج</span>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="h-4 w-4 accent-gold-400" />
          منتج مميز
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-gold-400" />
          منشور (نشط)
        </label>
      </div>

      {formError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {formError}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">إلغاء</button>
      </div>
    </form>
  );
}
