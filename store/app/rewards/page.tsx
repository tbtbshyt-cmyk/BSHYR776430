'use client';

import { useEffect, useRef, useState } from 'react';
import { Gift, Sparkles, CheckCircle2 } from 'lucide-react';
import { useWallet, type Coupon } from '@/lib/wallet';

const WHEEL_PRIZES = [
  { label: '5% خصم', value: 5, type: 'percentage' as const, color: '#d4af37' },
  { label: '10% خصم', value: 10, type: 'percentage' as const, color: '#1a1a1a' },
  { label: 'شحن مجاني', value: 0, type: 'free_shipping' as const, color: '#0f766e' },
  { label: '15% خصم', value: 15, type: 'percentage' as const, color: '#d4af37' },
  { label: 'حظ أوفر', value: 0, type: 'none' as const, color: '#1a1a1a' },
  { label: '20% خصم', value: 20, type: 'percentage' as const, color: '#0f766e' },
  { label: '500 نقطة', value: 500, type: 'points' as const, color: '#d4af37' },
  { label: '25% خصم', value: 25, type: 'percentage' as const, color: '#1a1a1a' },
];

const LS_SPIN = 'abubashar-spin-last';
const LS_BOX = 'abubashar-box-last';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default function RewardsPage() {
  const { points, addPoints, addCoupon } = useWallet();
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<typeof WHEEL_PRIZES[number] | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [boxOpen, setBoxOpen] = useState(false);
  const [boxPrize, setBoxPrize] = useState<{ label: string } | null>(null);
  const [canBox, setCanBox] = useState(true);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCanSpin(localStorage.getItem(LS_SPIN) !== todayKey());
    setCanBox(localStorage.getItem(LS_BOX) !== todayKey());
  }, []);

  const spin = () => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);
    const idx = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const slice = 360 / WHEEL_PRIZES.length;
    // استهدف منتصف الشريحة (ندور عكس اتجاه عقارب الساعة لتتوافق مع الرسم)
    const target = 360 * 6 - (idx * slice + slice / 2);
    setRotation(target);
    setTimeout(() => {
      const prize = WHEEL_PRIZES[idx];
      setResult(prize);
      grantPrize(prize);
      setSpinning(false);
      setCanSpin(false);
      localStorage.setItem(LS_SPIN, todayKey());
    }, 4200);
  };

  const grantPrize = (prize: typeof WHEEL_PRIZES[number]) => {
    if (prize.type === 'percentage') {
      const c: Coupon = {
        code: `WHEEL${prize.value}`,
        type: 'percentage',
        value: prize.value,
        used_count: 0,
        active: true,
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      addCoupon(c);
    } else if (prize.type === 'points') {
      addPoints(prize.value);
    } else if (prize.type === 'free_shipping') {
      addCoupon({ code: 'FREESHIP', type: 'fixed', value: 3000, used_count: 0, active: true, expires_at: new Date(Date.now() + 3 * 86400000).toISOString() });
    }
  };

  const openBox = () => {
    if (!canBox || boxOpen) return;
    setBoxOpen(true);
    const rewards = [
      { label: 'كوبون خصم 15%' },
      { label: '200 نقطة ولاء' },
      { label: 'شحن مجاني' },
      { label: 'كوبون خصم 10%' },
      { label: '500 نقطة' },
    ];
    const prize = rewards[Math.floor(Math.random() * rewards.length)];
    setBoxPrize(prize);
    localStorage.setItem(LS_BOX, todayKey());
    setCanBox(false);

    if (prize.label.includes('15')) addCoupon({ code: 'BOX15', type: 'percentage', value: 15, used_count: 0, active: true, expires_at: new Date(Date.now() + 3 * 86400000).toISOString() });
    else if (prize.label.includes('10')) addCoupon({ code: 'BOX10', type: 'percentage', value: 10, used_count: 0, active: true, expires_at: new Date(Date.now() + 3 * 86400000).toISOString() });
    else if (prize.label.includes('200')) addPoints(200);
    else if (prize.label.includes('500')) addPoints(500);
    else if (prize.label.includes('مجاني')) addCoupon({ code: 'BOXSHIP', type: 'fixed', value: 3000, used_count: 0, active: true, expires_at: new Date(Date.now() + 2 * 86400000).toISOString() });
  };

  const slice = 360 / WHEEL_PRIZES.length;

  return (
    <div className="container-x py-12">
      <h1 className="text-center font-display text-3xl font-black">المكافآت والهدايا</h1>
      <p className="mt-2 text-center text-stone-400">اربح خصومات ونقاط كل يوم — فرصة واحدة لكل ميزة يومياً</p>

      <div className="mt-4 flex justify-center gap-6 text-sm">
        <span className="flex items-center gap-2 rounded-xl bg-ink-900 px-4 py-2">
          <Sparkles size={16} className="text-gold-400" />
          نقاطك: <strong className="text-gold-300">{points}</strong>
        </span>
      </div>

      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {/* عجلة الحظ */}
        <div className="card flex flex-col items-center p-8">
          <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-bold">
            <Sparkles size={20} className="text-gold-400" /> عجلة الحظ
          </h2>
          <div className="relative h-72 w-72">
            <div
              ref={wheelRef}
              className="absolute inset-0 rounded-full border-8 border-gold-400 shadow-[0_0_40px_-10px_rgba(212,175,55,0.5)] transition-transform duration-[4000ms] ease-[cubic-bezier(0.17,0.67,0.16,0.99)]"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              {WHEEL_PRIZES.map((p, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left"
                  style={{
                    transform: `rotate(${i * slice}deg) skewY(${slice - 90}deg)`,
                    backgroundColor: p.color,
                  }}
                >
                  <span
                    className="absolute left-[35%] top-[18%] origin-center -rotate-45 text-[10px] font-bold text-white"
                    style={{ transform: 'rotate(45deg)' }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-2">
              <div className="h-0 w-0 border-x-[14px] border-t-[24px] border-x-transparent border-t-gold-400" />
            </div>
            <div className="absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gold-gradient text-ink-950 shadow-lg">
              <Gift size={22} />
            </div>
          </div>
          <button
            onClick={spin}
            disabled={!canSpin || spinning}
            className="btn-gold mt-8 w-full"
          >
            {spinning ? 'تدور العجلة...' : canSpin ? 'دوّر العجلة 🎁' : 'جرّب غداً'}
          </button>
          {result && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              <CheckCircle2 size={16} />
              {result.type === 'none' ? 'حظ أوفر المرة القادمة!' : `مبروك! ربحت: ${result.label}`}
            </div>
          )}
        </div>

        {/* صندوق المفاجآت */}
        <div className="card flex flex-col items-center p-8">
          <h2 className="mb-6 flex items-center gap-2 font-display text-xl font-bold">
            <Gift size={20} className="text-gold-400" /> صندوق المفاجآت اليومي
          </h2>
          <button
            onClick={openBox}
            disabled={!canBox}
            className={`group relative flex h-64 w-64 items-center justify-center transition-transform ${
              boxOpen ? 'scale-110' : canBox ? 'hover:scale-105' : 'opacity-50'
            }`}
          >
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gold-500/30 to-ink-800" />
            <div className="relative text-center">
              <Gift size={72} className="mx-auto text-gold-400" />
              <p className="mt-4 font-bold">
                {boxOpen ? '🎊 تم الفتح!' : canBox ? 'اضغط لفتح الصندوق' : 'عُد غداً'}
              </p>
            </div>
          </button>
          <button onClick={openBox} disabled={!canBox} className="btn-gold mt-8 w-full">
            {canBox ? 'افتح صندوق اليوم' : 'فتحت صندوق اليوم'}
          </button>
          {boxPrize && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 p-3 text-sm text-gold-300">
              <Gift size={16} /> جائزتك: {boxPrize.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
