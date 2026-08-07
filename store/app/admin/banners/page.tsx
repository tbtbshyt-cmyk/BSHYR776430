'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { uploadImage } from '@/lib/supabase/upload';
import { Loader2, Plus, Trash2, GripVertical, X, Upload } from 'lucide-react';
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
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('banners')
        .select('*')
        .order('sort_order', { ascending: true });
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

  const update = (id: string, patch: Partial<Banner>) => {
    setBanners((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const remove = (id: string) => setBanners((b) => b.filter((x) => x.id !== id));

  const handleImage = async (id: string, file: File) => {
    setUploading(true);
    try {
      const { url } = await uploadImage('banners', file);
      update(id, { image_url: url });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      await supabase.from('banners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (banners.length) await supabase.from('banners').insert(banners as any);
    } else {
      writeLocal(banners);
    }
    setLoading(false);
    alert('تم حفظ البانرات بنجاح');
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-gold-400" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black">إدارة البانرات</h2>
          <p className="text-sm text-stone-400">بانرات الصفحة الرئيسية وترتيبها</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addBanner} className="btn-ghost !py-2 text-sm"><Plus size={16} /> بانر جديد</button>
          <button onClick={save} disabled={loading} className="btn-gold !py-2 text-sm">حفظ التغييرات</button>
        </div>
      </div>

      <div className="space-y-4">
        {banners.map((b, i) => (
          <div key={b.id} className="card p-5">
            <div className="flex items-start gap-4">
              <GripVertical className="mt-2 text-stone-600" size={20} />

              <div className="relative h-28 w-44 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-ink-900">
                {b.image_url ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.image_url} alt={b.title_ar} className="h-full w-full object-cover" />
                    <button
                      onClick={() => update(b.id, { image_url: '' })}
                      className="absolute left-1 top-1 rounded-full bg-red-600/90 p-1 text-white"
                    >
                      <X size={12} />
                    </button>
                  </>
                ) : (
                  <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-1 text-stone-500 hover:text-gold-300">
                    <Upload size={20} />
                    <span className="text-xs">رفع صورة</span>
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={(e) => e.target.files?.[0] && handleImage(b.id, e.target.files[0])}
                    />
                  </label>
                )}
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <input
                  value={b.title_ar}
                  onChange={(e) => update(b.id, { title_ar: e.target.value })}
                  placeholder="العنوان"
                  className="input-field"
                />
                <input
                  value={b.subtitle_ar ?? ''}
                  onChange={(e) => update(b.id, { subtitle_ar: e.target.value })}
                  placeholder="العنوان الفرعي"
                  className="input-field"
                />
                <input
                  value={b.cta_label ?? ''}
                  onChange={(e) => update(b.id, { cta_label: e.target.value })}
                  placeholder="نص الزر"
                  className="input-field"
                />
                <input
                  value={b.cta_link ?? ''}
                  onChange={(e) => update(b.id, { cta_link: e.target.value })}
                  placeholder="رابط الزر"
                  className="input-field"
                  dir="ltr"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={b.is_active ?? true}
                      onChange={(e) => update(b.id, { is_active: e.target.checked })}
                      className="h-4 w-4 accent-gold-400"
                    />
                    منشور
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    الترتيب
                    <input
                      type="number"
                      value={b.sort_order ?? i + 1}
                      onChange={(e) => update(b.id, { sort_order: Number(e.target.value) })}
                      className="w-16 rounded-lg border border-white/10 bg-ink-900 px-2 py-1"
                    />
                  </label>
                </div>
              </div>

              <button onClick={() => remove(b.id)} className="rounded-lg p-2 text-red-400 hover:bg-red-500/10">
                <Trash2 size={18} />
              </button>
            </div>
            {uploading && <p className="mt-2 flex items-center gap-2 text-xs text-gold-300"><Loader2 size={12} className="animate-spin" /> جاري الرفع...</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
