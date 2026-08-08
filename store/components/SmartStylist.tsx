'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, Bot, ShoppingCart } from 'lucide-react';
import { getAiConfig, runCommand, type AiConfig } from '@/lib/ai';
import { getProducts } from '@/lib/store';
import type { Product } from '@/lib/types';
import { useCart } from '@/lib/cart-store';
import Link from 'next/link';

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
  products?: Product[];
}

/**
 * مساعد الأناقة الذكي (Abu Bashar Smart Stylist).
 * يقرأ المنتجات المتوفرة في المخزون ويقترح تنسيقات/بدائل، ويضيف للسلة مباشرة.
 * يعمل عبر نفس مسار الخادم /api/ai المحمي.
 */
export function SmartStylist() {
  const [open, setOpen] = useState(false);
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: 'ai',
      text: 'مرحباً 👋 أنا مساعد الأناقة. أخبرني بالمناسبة وميزانيتك وسأقترح لك طقماً متكاملاً من متجرنا.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { add } = useCart();

  useEffect(() => {
    if (open) {
      getAiConfig().then(setCfg);
      getProducts().then(setProducts);
    }
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, busy]);

  const ask = async () => {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput('');
    setMsgs((m) => [...m, { role: 'user', text: userText }]);
    setBusy(true);

    try {
      const catalog = products
        .filter((p) => p.stock_quantity > 0)
        .map((p) => ({ id: p.id, title: p.title_ar, price: p.price, category: p.category_id, sizes: p.sizes }))
        .slice(0, 60);

      const prompt = `أنت مساعد أناقة في متجر ملابس وأحذية يمني. الكتالوج المتاح حالياً (JSON):
${JSON.stringify(catalog)}

طلب العميل: "${userText}"

اقترح طقماً متكاملاً (2-4 منتجات) ضمن الميزانية، ولا تقترح منتجات غير موجودة في الكتالوج.
أخرج JSON فقط بالشكل:
{"message":"نص ودود يصف التنسيق", "product_ids":["id1","id2"]}`;

      if (cfg) {
        const action = await runCommand(prompt, cfg);
        const aiText = action.message;
        const ids: string[] = (action as any).product_ids ?? [];
        const suggested = ids
          .map((id) => products.find((p) => p.id === id))
          .filter((p): p is Product => Boolean(p));
        setMsgs((m) => [...m, { role: 'ai', text: aiText, products: suggested }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: 'ai', text: 'تعذّر الاتصال بالمساعد حالياً. حاول لاحقاً.' }]);
    } finally {
      setBusy(false);
    }
  };

  if (!cfg?.apiKey && open) {
    // في الوضع غير المهيّأ، نعرض اقتراحات سريعة من الكتالوج المحلي.
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="المساعد الذكي"
        className="fixed bottom-5 left-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold-gradient text-ink-950 shadow-[0_0_30px_-5px_rgba(212,175,55,0.6)] transition hover:scale-105"
      >
        <Sparkles size={24} />
      </button>

      {open && (
        <div className="fixed bottom-5 left-5 z-50 flex h-[70vh] max-h-[600px] w-[92vw] max-w-md flex-col overflow-hidden rounded-2xl border border-gold-400/30 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-ink-950/60 p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                <Bot size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">مساعد الأناقة الذكي</p>
                <p className="text-[10px] text-stone-500">يقترح من منتجات المتجر المتوفرة</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-lg p-1 text-stone-400 hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-gold-400/15 text-stone-100' : 'bg-ink-800 text-stone-300'}`}>
                  {m.text}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {m.products.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-lg bg-ink-950/50 p-2">
                          <div className="h-12 w-10 flex-shrink-0 rounded bg-cover bg-center" style={{ backgroundImage: `url(${p.images[0]})` }} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold">{p.title_ar}</p>
                            <p className="text-xs text-gold-300">{p.price.toLocaleString()} ر.ي</p>
                          </div>
                          <button
                            onClick={() => add(p, p.sizes[0] ?? 'one-size', 1)}
                            className="flex items-center gap-1 rounded-lg bg-gold-400 px-2 py-1 text-[10px] font-bold text-ink-950"
                          >
                            <ShoppingCart size={12} /> أضف
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-stone-500">جاري التفكير...</p>}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/10 p-3">
            {!cfg?.apiKey && (
              <p className="mb-2 rounded-lg bg-amber-500/10 p-2 text-[10px] text-amber-300">
                اضبط مفتاح AI من <Link href="/admin/ai" className="underline">لوحة الإدارة</Link> لتفعيل الاقتراحات الذكية.
              </p>
            )}
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
                placeholder="مثال: أريد طقم جمعة بميزانية 20 ألف"
                className="input-field flex-1 !py-2 text-sm"
              />
              <button onClick={ask} disabled={busy} className="btn-gold !px-3 !py-2">
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
