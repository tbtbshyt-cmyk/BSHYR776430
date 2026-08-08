'use client';

import { useEffect, useState } from 'react';
import type { Campaign, Product } from '@/lib/types';
import {
  getCampaigns, saveCampaigns,
} from '@/lib/demo-store';
import { adminFetchProducts } from '@/lib/admin';
import { Plus, Trash2, Save, Megaphone, Eye, MousePointerClick, X } from 'lucide-react';

function emptyCampaign(): Campaign {
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 86400000);
  return {
    id: 'cmp-' + Date.now(),
    name: 'حملة جديدة',
    type: 'percentage',
    value: 10,
    product_ids: [],
    starts_at: now.toISOString().slice(0, 16),
    ends_at: week.toISOString().slice(0, 16),
    is_active: true,
    clicks: 0,
    views: 0,
    created_at: now.toISOString(),
  };
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Campaign | null>(null);

  useEffect(() => {
    setCampaigns(getCampaigns());
    adminFetchProducts().then(setProducts);
  }, []);

  const persist = (next: Campaign[]) => {
    setCampaigns(next);
    saveCampaigns(next);
  };

  const add = () => setEditing(emptyCampaign());
  const remove = (id: string) => persist(campaigns.filter((c) => c.id !== id));

  const saveEditing = () => {
    if (!editing) return;
    const exists = campaigns.some((c) => c.id === editing.id);
    persist(exists ? campaigns.map((c) => (c.id === editing.id ? editing : c)) : [...campaigns, editing]);
    setEditing(null);
  };

  const toggleProduct = (id: string) => {
    if (!editing) return;
    const has = editing.product_ids.includes(id);
    setEditing({
      ...editing,
      product_ids: has ? editing.product_ids.filter((x) => x !== id) : [...editing.product_ids, id],
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-black">
            <Megaphone size={22} className="text-gold-400" /> مركز الحملات الإعلانية
          </h2>
          <p className="text-sm text-stone-400">بناء العروض والخصومات وتتبّع الأداء وتطبيقها تلقائياً</p>
        </div>
        <button onClick={add} className="btn-gold !py-2 text-sm"><Plus size={16} /> حملة جديدة</button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/80 p-4 backdrop-blur-sm">
          <div className="card relative w-full max-w-2xl p-6">
            <h3 className="mb-4 font-bold">{campaigns.some((c) => c.id === editing.id) ? 'تعديل حملة' : 'حملة جديدة'}</h3>
            <button onClick={() => setEditing(null)} className="absolute left-4 top-4 rounded-lg p-2 hover:bg-white/5"><X size={18} /></button>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">اسم الحملة *</span>
                <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">نوع الخصم</span>
                <select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value as Campaign['type'] })} className="input-field">
                  <option value="percentage">نسبة مئوية %</option>
                  <option value="fixed">مبلغ ثابت</option>
                  <option value="bogo">اشترِ 1 والثانية بنصف السعر</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">قيمة الخصم</span>
                <input type="number" value={editing.value} onChange={(e) => setEditing({ ...editing, value: Number(e.target.value) })} className="input-field" />
              </label>
              <label className="flex items-center gap-2 pt-7 text-sm font-semibold">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} className="h-4 w-4 accent-gold-400" />
                منشورة ونشطة
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">تبدأ في</span>
                <input type="datetime-local" value={editing.starts_at} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">تنتهي في</span>
                <input type="datetime-local" value={editing.ends_at} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value })} className="input-field" />
              </label>
            </div>

            <div className="mt-4">
              <span className="mb-2 block text-sm font-semibold">المنتجات المشمولة (فارغ = الكل)</span>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-white/10 p-2">
                {products.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-white/5">
                    <input type="checkbox" checked={editing.product_ids.includes(p.id)} onChange={() => toggleProduct(p.id)} className="h-4 w-4 accent-gold-400" />
                    <span>{p.title_ar}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button onClick={saveEditing} className="btn-gold !py-2"><Save size={16} /> حفظ الحملة</button>
              <button onClick={() => setEditing(null)} className="btn-ghost !py-2">إلغاء</button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {campaigns.length === 0 && (
          <div className="card p-10 text-center text-stone-400">
            لا توجد حملات بعد. أنشئ حملة خصم وستُطبَّق تلقائياً على المنتجات في المتجر.
          </div>
        )}
        {campaigns.map((c) => {
          const active =
            c.is_active &&
            new Date(c.starts_at).getTime() <= Date.now() &&
            new Date(c.ends_at).getTime() >= Date.now();
          return (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div>
                <p className="font-bold">{c.name}</p>
                <p className="text-xs text-stone-400">
                  {c.type === 'percentage' ? `خصم ${c.value}%` : c.type === 'fixed' ? `خصم ${c.value} ر.ي` : 'اشترِ 1 والثانية بنصف السعر'}
                  {' · '}
                  {c.product_ids.length === 0 ? 'كل المنتجات' : `${c.product_ids.length} منتج`}
                  {' · '}
                  {new Date(c.starts_at).toLocaleDateString('ar')} ← {new Date(c.ends_at).toLocaleDateString('ar')}
                </p>
                <div className="mt-2 flex gap-4 text-xs text-stone-400">
                  <span className="flex items-center gap-1"><Eye size={12} /> {c.views} مشاهدة</span>
                  <span className="flex items-center gap-1"><MousePointerClick size={12} /> {c.clicks} نقرة</span>
                  <span className={active ? 'text-emerald-400' : 'text-stone-500'}>
                    {active ? '● نشطة' : '○ متوقفة'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(c)} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10">تعديل</button>
                <button onClick={() => remove(c.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={16} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
