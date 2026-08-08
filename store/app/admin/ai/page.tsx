'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Settings, KeyRound, Sparkles, Send, Plus, ImageIcon, Loader2,
  Bot, User, MessageSquare, CheckCircle2,
} from 'lucide-react';
import {
  getAiConfig, saveAiConfig,
  extractProductFromImage, runCommand,
  type AiConfig, type ExtractedProduct,
} from '@/lib/ai';
import { fetchCategories, createProduct, createCampaign } from '@/lib/admin';
import type { Category, Campaign } from '@/lib/types';

type Msg = {
  role: 'user' | 'ai';
  text: string;
  pending?: boolean;
  image?: string;
  product?: ExtractedProduct;
  campaign?: Partial<Campaign>;
};

export default function AiAdminPage() {
  const [tab, setTab] = useState<'chat' | 'settings'>('chat');
  const [cfg, setCfg] = useState<AiConfig>({ provider: 'gemini', apiKey: '', model: 'gemini-1.5-flash' });
  const [categories, setCategories] = useState<Category[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const chatEnd = useRef<HTMLDivElement>(null);

  // إعدادات الواتساب
  const [waEnabled, setWaEnabled] = useState(false);
  const [waNumber, setWaNumber] = useState('967776430697');
  const [waTemplate, setWaTemplate] = useState(
    'مرحباً 👋%0Aأرغب بطلب المنتجات التالية:%0A%0A{items}%0A%0Aالإجمالي: {total} ر.ي%0Aالاسم: {name}%0Aالعنوان: {address}%0Aالهاتف: {phone}',
  );

  useEffect(() => {
    (async () => {
      const c = await getAiConfig();
      setCfg(c);
      setCategories(await fetchCategories());
      if (!c.apiKey) setTab('settings');
      const wa = JSON.parse(localStorage.getItem('abubashar-whatsapp') || '{}');
      if (wa.number) setWaNumber(wa.number);
      if (wa.template) setWaTemplate(wa.template);
      if (typeof wa.enabled === 'boolean') setWaEnabled(wa.enabled);
    })();
  }, []);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const saveSettings = async () => {
    if (cfg.provider === 'gemini' && cfg.apiKey && !cfg.model) setCfg({ ...cfg, model: 'gemini-1.5-flash' });
    if (cfg.provider === 'openai' && !cfg.model) setCfg({ ...cfg, model: 'gpt-4o-mini' });
    await saveAiConfig({
      ...cfg,
      features: ['product_extract', 'campaigns'],
      whatsapp: { enabled: waEnabled, number: waNumber, template: waTemplate },
    });
    localStorage.setItem('abubashar-whatsapp', JSON.stringify({ enabled: waEnabled, number: waNumber, template: waTemplate }));
    notify('تم حفظ الإعدادات ✓');
  };

  const addMsg = (m: Msg) => setMessages((cur) => [...cur, m]);

  const sendText = async () => {
    if (!input.trim() || busy) return;
    if (!cfg.apiKey) { notify('أدخل مفتاح API أولاً من الإعدادات'); setTab('settings'); return; }
    const text = input.trim();
    addMsg({ role: 'user', text });
    setInput('');
    setBusy(true);
    addMsg({ role: 'ai', text: 'أعالج طلبك...', pending: true });
    try {
      const action = await runCommand(text, cfg);
      setMessages((cur) => cur.filter((m) => !m.pending));
      addMsg({ role: 'ai', text: action.message, campaign: action.campaign });
    } catch (e: any) {
      setMessages((cur) => cur.filter((m) => !m.pending));
      addMsg({ role: 'ai', text: `خطأ: ${e?.message ?? e}` });
    } finally {
      setBusy(false);
    }
  };

  const onUploadImage = async (file: File) => {
    if (!cfg.apiKey) { notify('أدخل مفتاح API أولاً'); setTab('settings'); return; }
    addMsg({ role: 'user', text: `رفع صورة: ${file.name}`, image: URL.createObjectURL(file) });
    setBusy(true);
    addMsg({ role: 'ai', text: 'يحلّل الذكاء الاصطناعي الصورة...', pending: true });
    try {
      const product = await extractProductFromImage(file, cfg, categories);
      setMessages((cur) => cur.filter((m) => !m.pending));
      addMsg({ role: 'ai', text: 'تم استخراج بيانات المنتج. راجعها وأضفها للمتجر:', product });
    } catch (e: any) {
      setMessages((cur) => cur.filter((m) => !m.pending));
      addMsg({ role: 'ai', text: `تعذّر التحليل: ${e?.message ?? e}` });
    } finally {
      setBusy(false);
    }
  };

  const addProductToStore = async (p: ExtractedProduct) => {
    await createProduct(p);
    notify('تمت إضافة المنتج للمتجر ✓');
  };

  const createCampaignNow = async (c: Partial<Campaign>) => {
    const now = new Date();
    const end = new Date(now.getTime() + 7 * 86400000);
    await createCampaign({
      id: 'cmp-' + Date.now(),
      name: c.name ?? 'حملة جديدة',
      type: c.type ?? 'percentage',
      value: c.value ?? 10,
      product_ids: c.product_ids ?? [],
      starts_at: c.starts_at ?? now.toISOString(),
      ends_at: c.ends_at ?? end.toISOString(),
      is_active: true,
      clicks: 0, views: 0, created_at: now.toISOString(),
    });
    notify('تم إنشاء الحملة ✓');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-black">
            <Sparkles size={22} className="text-gold-400" /> إدارة الذكاء الاصطناعي
          </h2>
          <p className="text-sm text-stone-400">مساعد ذكي لاستخراج المنتجات من الصور وإنشاء الحملات وأتمتة الواتساب</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('chat')} className={tab === 'chat' ? 'btn-gold !py-2 text-sm' : 'btn-ghost !py-2 text-sm'}>
            <MessageSquare size={16} /> المحادثة
          </button>
          <button onClick={() => setTab('settings')} className={tab === 'settings' ? 'btn-gold !py-2 text-sm' : 'btn-ghost !py-2 text-sm'}>
            <Settings size={16} /> الإعدادات
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm text-emerald-300 shadow-lg">
          {toast}
        </div>
      )}

      {tab === 'chat' ? (
        <div className="card flex h-[70vh] flex-col overflow-hidden p-0">
          <div className="flex items-center gap-2 border-b border-white/5 p-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300"><Bot size={18} /></span>
            <div>
              <p className="text-sm font-bold">المساعد الذكي للمتجر</p>
              <p className="text-xs text-stone-500">{cfg.apiKey ? 'متصل' : 'غير مهيأ — افتح الإعدادات'}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="mt-10 text-center text-stone-500">
                <Sparkles size={32} className="mx-auto mb-3 text-gold-400/60" />
                <p>ارفع صورة منتج لاستخراج بياناته تلقائياً،</p>
                <p className="text-sm">أو اكتب أمراً مثل: "أنشئ حملة خصم 20% على الأحذية لمدة أسبوع"</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${m.role === 'user' ? 'bg-blue-500/15 text-blue-300' : 'bg-gold-400/15 text-gold-300'}`}>
                  {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </span>
                <div className={`max-w-[80%] space-y-3 rounded-2xl p-3 ${m.role === 'user' ? 'bg-blue-500/10' : 'bg-ink-900'}`}>
                  {m.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.image} alt="" className="h-40 rounded-lg object-cover" />
                  )}
                  <p className="text-sm">{m.text}</p>

                  {m.product && (
                    <div className="rounded-xl border border-white/10 bg-ink-950/50 p-3 text-sm">
                      <p className="font-bold text-gold-300">{m.product.title_ar}</p>
                      <p className="text-xs text-stone-400">{m.product.description_ar}</p>
                      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-stone-300">
                        <span>السعر: {m.product.price} ر.ي</span>
                        <span>المخزون: {m.product.stock_quantity}</span>
                        <span>المقاسات: {m.product.sizes.join(', ')}</span>
                        {m.product.barcode && <span>الباركود: {m.product.barcode}</span>}
                      </div>
                      <button onClick={() => addProductToStore(m.product!)} className="btn-gold mt-3 !py-1.5 text-xs">
                        <Plus size={14} /> إضافة للمتجر فوراً
                      </button>
                    </div>
                  )}

                  {m.campaign && (
                    <div className="rounded-xl border border-gold-400/20 bg-gold-400/5 p-3 text-sm">
                      <p className="font-bold">{m.campaign.name}</p>
                      <p className="text-xs text-stone-400">{m.campaign.type} — {m.campaign.value}</p>
                      <button onClick={() => createCampaignNow(m.campaign!)} className="btn-gold mt-2 !py-1.5 text-xs">
                        <CheckCircle2 size={14} /> إنشاء الحملة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEnd} />
          </div>

          <div className="border-t border-white/5 p-3">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onUploadImage(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()} className="rounded-xl border border-gold-400/30 p-2.5 text-gold-300 hover:bg-gold-400/10" title="رفع صورة منتج">
                <ImageIcon size={18} />
              </button>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendText()}
                placeholder="اكتب أمراً أو اسأل المساعد..."
                className="input-field flex-1"
                disabled={busy}
              />
              <button onClick={sendText} disabled={busy} className="btn-gold !px-4 !py-2.5">
                {busy ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* API Keys */}
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold"><KeyRound size={18} className="text-gold-400" /> مفاتيح الـ API والنموذج</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">المزوّد</span>
                <select value={cfg.provider} onChange={(e) => setCfg({ ...cfg, provider: e.target.value as AiConfig['provider'], model: e.target.value === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash' })} className="input-field">
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">النموذج</span>
                <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="input-field" dir="ltr" />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-semibold">مفتاح API ({cfg.apiKey ? 'مخزّن ✓' : 'غير مضبوط'})</span>
                <input
                  type="password"
                  value={cfg.apiKey}
                  onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
                  placeholder={cfg.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="input-field"
                  dir="ltr"
                />
                <span className="mt-1 block text-xs text-stone-500">يُحفظ مشفّراً في قاعدة البيانات ولا يُعاد للواجهة بعد حفظه.</span>
              </label>
            </div>
          </div>

          {/* WhatsApp */}
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold">💬 إتمام الطلب عبر الواتساب</h3>
            <label className="mb-4 flex items-center gap-3 text-sm">
              <input type="checkbox" checked={waEnabled} onChange={(e) => setWaEnabled(e.target.checked)} className="h-4 w-4 accent-gold-400" />
              تفعيل إتمام الطلب عبر الواتساب
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">رقم الواتساب</span>
                <input value={waNumber} onChange={(e) => setWaNumber(e.target.value)} className="input-field" dir="ltr" placeholder="967776430697" />
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-semibold">قالب رسالة الطلب</span>
              <textarea value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)} rows={5} className="input-field resize-none font-mono text-xs" dir="ltr" />
              <span className="mt-1 block text-xs text-stone-500">المتغيرات المتاحة: {'{items} {total} {name} {address} {phone}'}</span>
            </label>
          </div>

          <div className="flex justify-end">
            <button onClick={saveSettings} className="btn-gold"><CheckCircle2 size={16} /> حفظ الإعدادات</button>
          </div>
        </div>
      )}
    </div>
  );
}
