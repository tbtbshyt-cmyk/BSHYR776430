'use client';

import { useEffect, useState } from 'react';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '@/lib/admin';
import type { Category } from '@/lib/types';
import { uploadImage } from '@/lib/supabase/upload';
import { Pencil, Trash2, Plus, Upload, X } from 'lucide-react';

export default function AdminCategoriesPage() {
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);

  const load = async () => {
    setLoading(true);
    setCats(await fetchCategories());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name_ar) return;
    if (editing.id) {
      await updateCategory(editing.id, editing);
    } else {
      const slug = editing.slug || editing.name_ar.trim().toLowerCase().replace(/\s+/g, '-');
      await createCategory({ ...editing, slug });
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (confirm('حذف الصنف؟ المنتجات المرتبطة لن تُحذف.')) {
      await deleteCategory(id);
      load();
    }
  };

  const uploadIcon = async (file: File) => {
    const { url } = await uploadImage('banners', file);
    setEditing((e) => (e ? { ...e, image_url: url } : e));
  };

  if (loading) return <p className="text-stone-400">جاري التحميل...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black">إدارة الأصناف</h2>
          <p className="text-sm text-stone-400">إضافة وتعديل وحذف أصناف المتجر</p>
        </div>
        <button
          onClick={() => setEditing({ name_ar: '', slug: '', image_url: '', is_active: true, sort_order: cats.length })}
          className="btn-gold !py-2 text-sm"
        >
          <Plus size={16} /> صنف جديد
        </button>
      </div>

      {editing && (
        <div className="card p-6">
          <h3 className="mb-4 font-bold">{editing.id ? 'تعديل صنف' : 'صنف جديد'}</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">الاسم *</span>
              <input value={editing.name_ar ?? ''} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">المعرّف (slug)</span>
              <input value={editing.slug ?? ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} dir="ltr" className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">صورة/أيقونة</span>
              <div className="flex items-center gap-3">
                {editing.image_url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={editing.image_url} alt="" className="h-full w-full object-cover" />
                    <button onClick={() => setEditing({ ...editing, image_url: '' })} className="absolute left-1 top-1 rounded-full bg-red-600 p-0.5 text-white"><X size={12} /></button>
                  </div>
                ) : null}
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-gold-400/30 px-4 py-2 text-sm text-stone-400 hover:text-gold-300">
                  <Upload size={16} /> رفع صورة
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && uploadIcon(e.target.files[0])} />
                </label>
              </div>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">القسم الأب</span>
              <select
                value={editing.parent_id ?? ''}
                onChange={(e) => setEditing({ ...editing, parent_id: e.target.value || null })}
                className="input-field"
              >
                <option value="">قسم رئيسي</option>
                {cats
                  .filter((c) => !c.parent_id && c.id !== editing.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name_ar}</option>
                  ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">الترتيب</span>
              <input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="input-field" />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="btn-gold !py-2">حفظ</button>
            <button onClick={() => setEditing(null)} className="btn-ghost !py-2">إلغاء</button>
          </div>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-right text-sm">
          <thead className="text-xs text-stone-500">
            <tr className="border-b border-white/5">
              <th className="py-3 pr-4">الصنف</th>
              <th className="py-3 px-4">المعرّف</th>
              <th className="py-3 px-4">الحالة</th>
              <th className="py-3 px-4">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    {c.image_url && (
                      <div className="h-10 w-10 overflow-hidden rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${c.image_url})` }} />
                    )}
                    <span className="font-semibold">{c.name_ar}</span>
                  </div>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-stone-400" dir="ltr">{c.slug}</td>
                <td className="py-3 px-4">
                  {c.is_active
                    ? <span className="badge bg-emerald-600/20 text-emerald-400">نشط</span>
                    : <span className="badge bg-stone-600/30 text-stone-400">مخفي</span>}
                </td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(c)} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10"><Pencil size={16} /></button>
                    <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
