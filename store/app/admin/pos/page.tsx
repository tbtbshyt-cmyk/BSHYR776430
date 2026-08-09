'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Trash2, Printer } from 'lucide-react';
import { getDemoProducts } from '@/lib/demo-store';
import { formatYER } from '@/lib/utils';
import type { Product } from '@/lib/types';

interface Line {
  product: Product;
  qty: number;
}

/**
 * نقطة بيع (POS) للكاش في المحل: بحث سريع، إضافة بالضغط، حساب الإجمالي،
 * وطباعة فاتورة بسيطة.
 */
export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [paid, setPaid] = useState(0);

  useEffect(() => {
    setProducts(getDemoProducts().filter((p) => p.is_active && p.stock_quantity > 0));
  }, []);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) => p.title_ar.includes(q) || p.barcode?.includes(q),
      ),
    [products, q],
  );

  const add = (p: Product) =>
    setLines((cur) => {
      const ex = cur.find((l) => l.product.id === p.id);
      if (ex) return cur.map((l) => (l.product.id === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...cur, { product: p, qty: 1 }];
    });

  const changeQty = (id: string, delta: number) =>
    setLines((cur) =>
      cur
        .map((l) => (l.product.id === id ? { ...l, qty: Math.max(0, l.qty + delta) } : l))
        .filter((l) => l.qty > 0),
    );

  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const change = Math.max(0, paid - total);

  const printReceipt = () => {
    const w = window.open('', '_blank', 'width=400,height=600');
    if (!w) return;
    const rows = lines
      .map(
        (l) =>
          `<tr><td>${l.product.title_ar}</td><td>${l.qty}</td><td>${formatYER(l.product.price * l.qty)}</td></tr>`,
      )
      .join('');
    w.document.write(`
      <html dir="rtl"><head><title>فاتورة</title>
      <style>body{font-family:Arial;padding:16px}table{width:100%;border-collapse:collapse}td{padding:6px;border-bottom:1px solid #ddd}</style>
      </head><body>
      <h2>محلات أبو بشار للملابس والأحذية</h2>
      <p>عتق - شبوة</p><hr/>
      <table><tr><th>الصنف</th><th>الكمية</th><th>المبلغ</th></tr>${rows}</table>
      <h3>الإجمالي: ${formatYER(total)}</h3>
      <p>شكراً لتسوقكم!</p></body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* المنتجات */}
      <div className="lg:col-span-2">
        <div className="card p-4">
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث بالاسم أو امسح الباركود..."
              className="input-field pr-10"
              autoFocus
            />
          </div>
          <div className="grid max-h-[65vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="card group overflow-hidden text-right transition hover:border-gold-400/40"
              >
                <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: `url(${p.images[0]})` }} />
                <div className="p-2">
                  <p className="line-clamp-2 text-xs font-semibold leading-tight">{p.title_ar}</p>
                  <p className="mt-1 text-sm font-bold text-gold-300">{formatYER(p.price)}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* الفاتورة */}
      <div className="card sticky top-24 flex h-fit flex-col p-5">
        <h2 className="mb-4 font-display text-lg font-extrabold">الفاتورة</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {lines.length === 0 && <p className="py-8 text-center text-sm text-stone-500">اختر منتجاً للبدء</p>}
          {lines.map((l) => (
            <div key={l.product.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 line-clamp-1">{l.product.title_ar}</span>
              <button onClick={() => changeQty(l.product.id, -1)} className="h-7 w-7 rounded bg-ink-900">-</button>
              <span className="w-6 text-center">{l.qty}</span>
              <button onClick={() => changeQty(l.product.id, 1)} className="h-7 w-7 rounded bg-ink-900">+</button>
              <span className="w-20 text-left text-xs text-gold-300">{formatYER(l.product.price * l.qty)}</span>
              <button onClick={() => changeQty(l.product.id, -999)} className="text-red-400"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>

        <div className="my-4 border-t border-white/10" />
        <div className="mb-3 flex justify-between text-base font-extrabold">
          <span>الإجمالي</span>
          <span className="gold-text">{formatYER(total)}</span>
        </div>
        <label className="mb-1 block text-xs text-stone-400">المبلغ المدفوع</label>
        <input
          type="number"
          value={paid || ''}
          onChange={(e) => setPaid(Number(e.target.value))}
          className="input-field mb-3"
        />
        {paid > 0 && (
          <p className="mb-3 text-sm text-emerald-400">الباقي: {formatYER(change)}</p>
        )}
        <button
          disabled={lines.length === 0}
          onClick={printReceipt}
          className="btn-gold w-full disabled:opacity-50"
        >
          <Printer size={16} /> طباعة الفاتورة
        </button>
      </div>
    </div>
  );
}
