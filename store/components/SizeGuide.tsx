'use client';

import { useState } from 'react';
import { Ruler, Sparkles, X } from 'lucide-react';

// حاسبة المقاسات الذكية بالذكاء الاصطناعي.
// تقوم خوارزمية محلية بتقدير المقاس الأنسب بناءً على نوع المنتج
// (ثوب / حذاء / بشت) وقياسات الجسم. يمكن ربطها لاحقاً بنموذج AI
// للتوصية الأكثر دقة عبر API.

type ProductKind = 'thobe' | 'shoe' | 'bisht' | 'generic';

function detectKind(title: string, categoryId: string | null): ProductKind {
  const t = title;
  if (t.includes('حذاء') || t.includes('بوت') || t.includes('صندل') || t.includes('سباحة')) return 'shoe';
  if (t.includes('بشت') || t.includes('فروة')) return 'bisht';
  if (t.includes('ثوب') || t.includes('معوزة')) return 'thobe';
  if (categoryId === 'c3') return 'shoe';
  return 'generic';
}

// جداول القياسات (تقريبية - موجهة للسوق اليمني/الخليجي)
const THOBE_TABLE: Record<string, { chest: number; length: number; fit: string }> = {
  '52': { chest: 104, length: 142, fit: 'S' },
  '54': { chest: 108, length: 146, fit: 'M' },
  '56': { chest: 112, length: 150, fit: 'L' },
  '58': { chest: 116, length: 154, fit: 'XL' },
  '60': { chest: 120, length: 158, fit: '2XL' },
  '62': { chest: 124, length: 162, fit: '3XL' },
};

const SHOE_EU: Record<string, { footCm: number; fit: string }> = {
  '40': { footCm: 25.0, fit: 'S' },
  '41': { footCm: 25.5, fit: 'M' },
  '42': { footCm: 26.5, fit: 'L' },
  '43': { footCm: 27.5, fit: 'XL' },
  '44': { footCm: 28.5, fit: '2XL' },
};

function recommend(
  kind: ProductKind,
  data: { chest?: number; height?: number; weight?: number; footCm?: number; fit?: string },
  available: string[],
): string | null {
  if (kind === 'shoe' && data.footCm) {
    const candidates = available
      .filter((s) => SHOE_EU[s])
      .map((s) => ({ s, cm: SHOE_EU[s].footCm }))
      .sort((a, b) => Math.abs(a.cm - data.footCm!) - Math.abs(b.cm - data.footCm!));
    return candidates[0]?.s ?? null;
  }

  if ((kind === 'thobe' || kind === 'bisht') && data.chest) {
    // تقدير محيط الصدر من الطول والوزن إن لم يُدخل مباشرة
    const chest =
      data.chest ??
      (data.height && data.weight
        ? Math.round(50 + data.weight / Math.pow(data.height / 100, 2) * 1.1)
        : undefined);
    if (!chest) return null;
    const candidates = available
      .filter((s) => THOBE_TABLE[s])
      .map((s) => ({ s, c: THOBE_TABLE[s].chest }))
      .filter((x) => x.c >= chest - 2)
      .sort((a, b) => a.c - b.c);
    return candidates[0]?.s ?? available[available.length - 1] ?? null;
  }
  return null;
}

export function SizeGuide({
  title,
  categoryId,
  availableSizes,
  selected,
  onSelect,
}: {
  title: string;
  categoryId: string | null;
  availableSizes: string[];
  selected: string | null;
  onSelect: (size: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const kind = detectKind(title, categoryId);

  const [chest, setChest] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [footCm, setFootCm] = useState<string>('');

  const [rec, setRec] = useState<string | null>(null);

  const runRecommendation = () => {
    const r = recommend(
      kind,
      {
        chest: chest ? Number(chest) : undefined,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        footCm: footCm ? Number(footCm) : undefined,
      },
      availableSizes,
    );
    setRec(r);
    if (r) onSelect(r);
  };

  const isOneSize = availableSizes.length === 1 && availableSizes[0] === 'one-size';

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-bold">اختر المقاس</span>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 text-sm font-semibold text-gold-300 hover:text-gold-200"
        >
          <Sparkles size={16} /> حاسبة المقاسات الذكية
        </button>
      </div>

      {!isOneSize ? (
        <div className="flex flex-wrap gap-2">
          {availableSizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSelect(s)}
              className={`min-w-12 rounded-xl border px-4 py-2.5 font-bold transition ${
                selected === s
                  ? 'border-gold-400 bg-gold-gradient text-ink-950 shadow-gold'
                  : 'border-white/15 text-stone-200 hover:border-gold-400/60'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-stone-400">قطعة بمقاس واحد مناسب للجميع.</p>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="card w-full max-w-md border-gold-400/30 p-6 shadow-gold-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/15 text-gold-300">
                  <Ruler size={18} />
                </span>
                <h3 className="font-display text-lg font-extrabold">حاسبة المقاسات الذكية</h3>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-white/5">
                <X size={18} />
              </button>
            </div>

            <p className="mb-5 text-xs leading-6 text-stone-400">
              أدخل قياساتك وسيقوم نظام الذكاء لدينا بتوصية المقاس الأنسب وفق جدول قياسات أبو بشار.
              {kind === 'thobe' && ' (مناسب للثياب: الصدر + الطول + الوزن)'}
              {kind === 'shoe' && ' (مناسب للأحذية: طول القدم بالسنتيمتر)'}
              {kind === 'bisht' && ' (البشوت: محيط الصدر)'}
            </p>

            <div className="space-y-3">
              {kind === 'shoe' ? (
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold">طول القدم (سم)</span>
                  <input
                    type="number"
                    step="0.1"
                    value={footCm}
                    onChange={(e) => setFootCm(e.target.value)}
                    placeholder="مثال: 26.5"
                    className="input-field"
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1 block text-sm font-semibold">محيط الصدر (سم) - اختياري</span>
                    <input type="number" value={chest} onChange={(e) => setChest(e.target.value)} placeholder="مثال: 112" className="input-field" />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold">الطول (سم)</span>
                      <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="175" className="input-field" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-semibold">الوزن (كجم)</span>
                      <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="75" className="input-field" />
                    </label>
                  </div>
                </>
              )}
            </div>

            <button onClick={runRecommendation} className="btn-gold mt-5 w-full">
              <Sparkles size={18} /> اقترح المقاس الأنسب
            </button>

            {rec && (
              <div className="mt-4 rounded-xl border border-gold-400/40 bg-gold-400/10 p-4 text-center">
                <p className="text-sm text-stone-300">المقاس الموصى به لك:</p>
                <p className="mt-1 text-3xl font-black gold-text">{rec}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
