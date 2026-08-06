'use client';

import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { Crown } from 'lucide-react';

/**
 * شعار العلامة التجارية مع وصول خفي للوحة الإدارة:
 * النقر السريع 5 مرات متتالية خلال 1.2 ثانية يوجّه المستخدم إلى /login.
 * يوفر تجربة "الكنترول المخفي" بدون رابط ظاهر للعملاء العاديين.
 */
export function HiddenLogo() {
  const router = useRouter();
  const taps = useRef<number[]>([]);

  const onClick = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1200), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      router.push('/login');
    }
  };

  return (
    <button
      onClick={onClick}
      aria-label="أبو بشار ستورز"
      className="flex items-center gap-2 select-none"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950 shadow-gold">
        <Crown size={22} strokeWidth={2.5} />
      </span>
      <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
        <span className="gold-text">أبو بشار</span>
        <span className="block text-[11px] font-medium tracking-widest text-stone-400">
          STORES
        </span>
      </span>
    </button>
  );
}
