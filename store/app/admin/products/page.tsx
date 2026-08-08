'use client';

import { useEffect, useState, lazy, Suspense } from 'react';
import { adminFetchProducts, createProduct, updateProduct, deleteProduct, fetchCategories } from '@/lib/admin';
import type { Product } from '@/lib/types';
import { formatYER, discountPercent } from '@/lib/utils';
import { Loader2, AlertTriangle, Search, Plus, Pencil, Trash2, X } from 'lucide-react';
import { BulkImport } from '@/components/admin/BulkImport';

const ProductForm = lazy(() =>
  import('@/components/admin/ProductForm').then((m) => ({ default: m.ProductForm })),
);
const Barcode = lazy(() =>
  import('@/components/admin/Barcode').then((m) => ({ default: m.Barcode })),
);

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [p, c] = await Promise.all([adminFetchProducts(), fetchCategories()]);
    setProducts(p);
    setCategories(c);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = products.filter((p) => p.title_ar.includes(q.trim()));

  const onSubmit = async (data: Partial<Product>) => {
    if (editing) {
      await updateProduct(editing.id, data);
      setEditing(null);
    } else {
      await createProduct(data);
      setCreating(false);
    }
    load();
  };

  const onDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      await deleteProduct(id);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-gold-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-black">المنتجات والمخزون</h2>
          <p className="text-sm text-stone-400">إضافة وتعديل وحذف المنتجات وإدارة الباركود والاستيراد بالجملة</p>
        </div>
        <button
          onClick={() => { setCreating(true); setEditing(null); }}
          className="btn-gold !py-2.5"
        >
          <Plus size={18} /> منتج جديد
        </button>
      </div>

      <BulkImport onDone={load} />

      {(creating || editing) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm">
          <div className="card relative w-full max-w-3xl border-gold-400/30 p-2 shadow-gold-lg">
            <h3 className="px-4 py-3 font-display text-lg font-extrabold">
              {editing ? 'تعديل المنتج' : 'إضافة منتج جديد'}
            </h3>
            <button
              onClick={() => { setCreating(false); setEditing(null); }}
              className="absolute left-4 top-4 rounded-lg p-2 hover:bg-white/5"
            >
              <X size={18} />
            </button>
            <Suspense fallback={<div className="p-6 text-center text-stone-400">جاري التحميل...</div>}>
              <ProductForm
                initial={editing ?? undefined}
                categories={categories}
                onSubmit={onSubmit}
                onCancel={() => { setCreating(false); setEditing(null); }}
              />
            </Suspense>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث عن منتج..."
          className="input-field pr-10"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="text-xs text-stone-500">
            <tr className="border-b border-white/5">
              <th className="py-3 pl-4 pr-4">المنتج / الباركود</th>
              <th className="py-3 pl-4">السعر</th>
              <th className="py-3 pl-4">المخزون</th>
              <th className="py-3 pl-4">الحالة</th>
              <th className="py-3">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const off = discountPercent(p.price, p.compare_at_price);
              const low = p.stock_quantity <= 5;
              return (
                <tr key={p.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-10 flex-shrink-0 rounded-lg bg-cover bg-center"
                        style={{ backgroundImage: `url(${p.images[0]})` }}
                      />
                      <div>
                        <p className="font-semibold">{p.title_ar}</p>
                        {p.barcode ? (
                          <div className="mt-1">
                            <Suspense fallback={<div className="h-10 w-32 rounded bg-white/10" />}>
                              <Barcode value={p.barcode} />
                            </Suspense>
                          </div>
                        ) : (
                          <span className="text-[10px] text-stone-600">بدون باركود</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pl-4">
                    <p className="font-bold text-gold-300">{formatYER(p.price)}</p>
                    {off > 0 && <p className="text-[10px] text-red-400">خصم {off}%</p>}
                  </td>
                  <td className="py-3 pl-4">
                    <span className={low ? 'font-bold text-red-400' : ''}>
                      {p.stock_quantity}
                      {low && <AlertTriangle size={14} className="mr-1 inline text-red-400" />}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    {p.is_active ? (
                      <span className="badge bg-emerald-600/20 text-emerald-400">نشط</span>
                    ) : (
                      <span className="badge bg-stone-600/30 text-stone-400">مخفي</span>
                    )}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(p); setCreating(false); }}
                        className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10"
                        title="تعديل"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"
                        title="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
