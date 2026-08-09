'use client';

import { useEffect, useState } from 'react';
import { fetchSettings, updateSettings, type StoreSettings } from '@/lib/admin';
import { Save, Loader2, Store as StoreIcon, KeyRound } from 'lucide-react';

export default function AdminSettingsPage() {
  const [s, setS] = useState<StoreSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setS(fetchSettings()); }, []);

  if (!s) return <p className="text-stone-400">جاري التحميل...</p>;

  const set = (k: keyof StoreSettings, v: string | number) => setS({ ...s, [k]: v as never });

  const save = () => {
    setSaving(true);
    updateSettings(s);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-black">إعدادات المتجر</h2>
          <p className="text-sm text-stone-400">اسم المتجر، بيانات التواصل، والعنوان</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-gold">
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ
        </button>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          تم حفظ الإعدادات بنجاح ✓
        </div>
      )}

      <div className="card p-6">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <StoreIcon size={18} className="text-gold-400" /> معلومات أساسية
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="اسم المتجر" value={s.store_name} onChange={(v) => set('store_name', v)} />
          <Field label="الشعار/الوصف القصير" value={s.tagline} onChange={(v) => set('tagline', v)} />
          <Field label="رقم الهاتف" value={s.phone} onChange={(v) => set('phone', v)} dir="ltr" />
          <Field label="واتساب" value={s.whatsapp} onChange={(v) => set('whatsapp', v)} dir="ltr" />
          <Field label="البريد الإلكتروني" value={s.email} onChange={(v) => set('email', v)} dir="ltr" />
          <Field label="أوقات العمل" value={s.working_hours} onChange={(v) => set('working_hours', v)} />
          <div className="md:col-span-2">
            <Field label="العنوان" value={s.address} onChange={(v) => set('address', v)} textarea />
          </div>
          <Field label="المدينة" value={s.city} onChange={(v) => set('city', v)} />
          <Field label="العملة" value={s.currency} onChange={(v) => set('currency', v)} dir="ltr" />
        </div>
      </div>

      <div className="card p-6">
        <h3 className="mb-1 flex items-center gap-2 font-bold">
          <KeyRound size={18} className="text-gold-400" /> مفاتيح التكامل (Integrations)
        </h3>
        <p className="mb-4 text-xs text-stone-400">
          تُحفظ محلياً في وضع الديمو. في الإنتاج تُخزَّن مشفّرة في قاعدة البيانات.
        </p>
        <IntegrationsForm />
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, textarea, dir,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  textarea?: boolean;
  dir?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="input-field resize-none" dir={dir} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input-field" dir={dir} />
      )}
    </label>
  );
}

function IntegrationsForm() {
  const [aiKey, setAiKey] = useState('');
  const [vapidPub, setVapidPub] = useState('');
  const [vapidPriv, setVapidPriv] = useState('');
  const [paymentKey, setPaymentKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAiKey(localStorage.getItem('int_ai_key') ?? '');
    setVapidPub(localStorage.getItem('int_vapid_pub') ?? '');
    setVapidPriv(localStorage.getItem('int_vapid_priv') ?? '');
    setPaymentKey(localStorage.getItem('int_payment_key') ?? '');
  }, []);

  const save = () => {
    localStorage.setItem('int_ai_key', aiKey);
    localStorage.setItem('int_vapid_pub', vapidPub);
    localStorage.setItem('int_vapid_priv', vapidPriv);
    localStorage.setItem('int_payment_key', paymentKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">مفتاح الذكاء الاصطناعي (Gemini/OpenAI)</span>
        <input type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} className="input-field" dir="ltr" placeholder="AIza... or sk-..." />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">مفتاح VAPID العام</span>
        <input type="password" value={vapidPub} onChange={(e) => setVapidPub(e.target.value)} className="input-field" dir="ltr" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">مفتاح VAPID الخاص</span>
        <input type="password" value={vapidPriv} onChange={(e) => setVapidPriv(e.target.value)} className="input-field" dir="ltr" />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">مفتاح بوابة الدفع</span>
        <input type="password" value={paymentKey} onChange={(e) => setPaymentKey(e.target.value)} className="input-field" dir="ltr" />
      </label>
      <div className="md:col-span-2 flex items-center gap-3">
        <button onClick={save} className="btn-gold !py-2"><Save size={16} /> حفظ المفاتيح</button>
        {saved && <span className="text-sm text-emerald-400">تم الحفظ ✓</span>}
      </div>
    </div>
  );
}

