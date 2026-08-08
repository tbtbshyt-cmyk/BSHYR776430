'use client';

import { useState } from 'react';
import { Ruler, X, Sparkles } from 'lucide-react';

interface Result {
  size: string;
  confidence: number;
  note: string;
}

/**
 * حاسبة مقاسات ذكية للملابس والأحذية.
 * تستخدم معادلات معيارية لإعطاء مقاس مقترح ومستوى ثقة.
 */
export function SizeCalculator({
  sizes,
  isShoes,
  onClose,
}: {
  sizes: string[];
  isShoes: boolean;
  onClose: () => void;
}) {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [foot, setFoot] = useState('');
  const [result, setResult] = useState<Result | null>(null);

  const calc = () => {
    if (isShoes) {
      const cm = Number(foot);
      if (!cm || cm < 20 || cm > 35) {
        setResult({ size: sizes[0] ?? '42', confidence: 40, note: 'أدخل طول قدم صحيح بين 20 و 35 سم.' });
        return;
      }
      // تحويل سم إلى مقاس أوروبي تقريبي
      const eu = Math.round((cm * 1.5) * 2) / 2 + 2;
      const match =
        sizes.find((s) => Number(s) && Math.abs(Number(s) - eu) <= 1) ??
        sizes[0] ??
        String(eu);
      setResult({
        size: match,
        confidence: 85,
        note: 'مقاس مقترح بناءً على طول القدم. يُفضّل التجربة إن أمكن.',
      });
      return;
    }

    const h = Number(height);
    const w = Number(weight);
    if (!h || !w) return;
    const bmi = w / Math.pow(h / 100, 2);
    let suggested: string;
    if (bmi < 18.5) suggested = 'S';
    else if (bmi < 25) suggested = 'M';
    else if (bmi < 30) suggested = 'L';
    else if (bmi < 35) suggested = 'XL';
    else suggested = 'XXL';

    // مطابقة للمقاسات المتاحة
    const match =
      sizes.find((s) => s.toUpperCase() === suggested) ??
      (sizes.length === 1 ? sizes[0] : suggested);
    const confidence = bmi >= 15 && bmi <= 40 ? 78 : 55;
    setResult({
      size: match,
      confidence,
      note: 'مقاس مقترح وفق الطول والوزن. القصّات تختلف حسب الموديل.',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
      <div className="card relative w-full max-w-md p-6">
        <button onClick={onClose} className="absolute left-4 top-4 text-stone-400 hover:text-white">
          <X size={20} />
        </button>
        <h3 className="flex items-center gap-2 font-display text-lg font-bold">
          <Ruler size={20} className="text-gold-400" />
          {isShoes ? 'حاسبة مقاس الحذاء' : 'حاسبة المقاس الذكية'}
        </h3>
        <p className="mt-1 text-xs text-stone-400">أدخل قياساتك للحصول على المقاس الأنسب.</p>

        <div className="mt-5 space-y-4">
          {!isShoes ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">الطول (سم)</span>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="input-field" placeholder="170" />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold">الوزن (كجم)</span>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="input-field" placeholder="70" />
              </label>
            </div>
          ) : (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">طول القدم (سم)</span>
              <input type="number" value={foot} onChange={(e) => setFoot(e.target.value)} className="input-field" placeholder="26" />
            </label>
          )}

          <button onClick={calc} className="btn-gold w-full">
            <Sparkles size={16} /> احسب مقاسي
          </button>

          {result && (
            <div className="rounded-xl border border-gold-400/30 bg-gold-400/5 p-4 text-center">
              <p className="text-xs text-stone-400">المقاس المقترح</p>
              <p className="mt-1 font-display text-4xl font-black text-gold-300">{result.size}</p>
              <div className="mx-auto mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-900">
                <div className="h-full bg-gold-gradient" style={{ width: `${result.confidence}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-stone-500">ثقة {result.confidence}% · {result.note}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
