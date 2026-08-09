'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Loader2, Plus, Trash2, X, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Banner } from '@/lib/types';

const LS_BANNERS = 'abubashar-demo-banners';

function readLocal(): Banner[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_BANNERS) || '[]');
  } catch {
    return [];
  }
}
function writeLocal(b: Banner[]) {
  localStorage.setItem(LS_BANNERS, JSON.stringify(b));
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
      setBanners((data as Banner[]) ?? []);
    } else {
      setBanners(readLocal());
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addBanner = () => {
    const nb: Banner = {
      id: 'bn-' + Date.now(),
      title_ar: 'بانر جديد',
      subtitle_ar: '',
      image_url: '',
      cta_label: 'تسوّق الآن',
      cta_link: '/products',
      is_active: true,
      sort_order: banners.length + 1,
    };
    setBanners([...banners, nb]);
  };

  const update = (id: string, patch: Partial<Banner>) =>
    setBanners((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setBanners((b) => b.filter((x) => x.id !== id));

  const handleImage = async (id: string, file: File) => {
    if (!file.type.startsWith('image/')) { showToast(false, 'الملف ليس صورة'); return; }
    if (file.size > 10 * 1024 * 1024) { showToast(false, 'حجم الصورة أكبر من 10MB'); return; }
    setUploadingId(id);
    try {
      const form = new FormData();
      form.append('files', file);
      form.append('bucket', 'banners');
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok || !data.urls?.[0]?.url) throw new Error(data?.error ?? 'فشل الرفع');
      update(id, { image_url: data.urls[0].url });
      showToast(true, 'تم رفع صورة البانر بنجاح');
    } catch (e: any) {
      showToast(false, e?.message ?? 'فشل رفع الصورة');
    } finally {
      setUploadingId(null);
    }
  };

  const save = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        if (banners.length) await supabase.from('banners').insert(banners as any);
      } else {
        writeLocal(banners);
      }
      showToast(true, 'تم حفظ البانرات بنجاح');
    } catch {
      showToast(false, 'حدث خطأ أثناء الحفظ');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black">إعلانات/البانرات</h2>
          <p className="text-sm text-stone-400">إدارة بانرات الصفحة الرئيسية</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={addBanner} className="btn-ghost !py-2 text-sm"><Plus size={16} /> بانر جديد</button>
          <button type="button" onClick={save} disabled={loading} className="btn-gold !py-2 text-sm">حفظ التغييرات</button>
        </div>
      </div>

      {toast && (
        <div className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${toast.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.text}
        </div>
      )}

      <div className="grid gap-4">
        {banners.map((b) => (
          <div key={b.id} className="card relative grid gap-4 p-4 md:grid-cols-[200px_1fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-white/10 bg-ink-900">
              {b.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.image_url} alt={b.title_ar} className="h-full w-full object-cover" />
                  <button type="button" onClick={() => update(b.id, { image_url: '' })} className="absolute left-1 top-1 rounded-full bg-red-600/90 p-1 text-white"><X size={12} /></button>
                </>
              ) : (
                <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-stone-500 hover:text-gold-300">
                  {uploadingId === b.id ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                  <span className="text-xs">{uploadingId === b.id ? 'جارٍ الرفع...' : 'رفع صورة'}</span>
                  <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && handleImage(b.id, e.target.files[0])} />
                </label>
              )}
            </div>

            <div className="grid flex-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-400">العنوان</span>
                <input value={b.title_ar} onChange={(e) => update(b.id, { title_ar: e.target.value })} className="input-field" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-400">زر CTA</span>
                <input value={b.cta_label ?? ""} onChange={(e) => update(b.id, { cta_label: e.target.value })} className="input-field" />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold text-stone-400">الرابط</span>
                <input value={b.cta_link ?? ""} onChange={(e) => update(b.id, { cta_link: e.target.value })} className="input-field" dir="ltr" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-stone-400">الترتيب</span>
                <input type="number" value={b.sort_order} onChange={(e) => update(b.id, { sort_order: Number(e.target.value) })} className="input-field" />
              </label>
              <label className="flex items-center gap-2 pt-6 text-sm font-semibold">
                <input type="checkbox" checked={b.is_active} onChange={(e) => update(b.id, { is_active: e.target.checked })} className="h-4 w-4 accent-gold-400" />
                منشور
              </label>
            </div>
            <button type="button" onClick={() => remove(b.id)} className="absolute left-3 top-3 rounded-lg p-2 text-red-400 hover:bg-red-500/10"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
