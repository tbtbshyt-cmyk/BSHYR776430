'use client';

import { useEffect, useState } from 'react';
import { Share2, Copy, Check, Gift } from 'lucide-react';
import { useWallet } from '@/lib/wallet';

/**
 * زر "شارك واكسب": ينشئ رابط إحالة فريد ويمنح نقاطاً عند عودة زائر منه.
 */
export function ShareEarn() {
  const { addPoints } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // معرف بسيط للعميل (يُنشأ عند أول زيارة)
  const refId =
    typeof window !== 'undefined'
      ? localStorage.getItem('ab_ref_id') ||
        (() => {
          const id = 'REF' + Math.random().toString(36).slice(2, 8).toUpperCase();
          localStorage.setItem('ab_ref_id', id);
          return id;
        })()
      : 'REF';

  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/?ref=${refId}`
      : '';

  // احتساب الإحالة عند قدوم زائر برابط إحالة (مرة واحدة)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref && !localStorage.getItem('ab_ref_used')) {
      localStorage.setItem('ab_ref_used', ref);
      addPoints(50);
    }
  }, [addPoints]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      addPoints(10);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* تجاهل */
    }
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({
        title: 'محلات أبو بشار للملابس والأحذية',
        text: 'تسوّق أحلى الملابس والأحذية واحصل على خصم عبر رابطي!',
        url: link,
      });
      addPoints(10);
    } else {
      setOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={share}
        className="flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-400/5 px-4 py-2 text-sm font-semibold text-gold-300 transition hover:bg-gold-400/10"
      >
        <Share2 size={16} /> شارك واكسب
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-2">
              <Gift size={20} className="text-gold-400" />
              <h3 className="font-bold">شارك واكسب نقاط</h3>
            </div>
            <p className="text-sm text-stone-400">
              أرسل رابطك لأصدقائك. عند تسجيلهم وتسوقهم تحصل على نقاط ولاء يمكن استبدالها بخصومات.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-ink-900 p-2">
              <input readOnly value={link} className="flex-1 bg-transparent px-2 text-xs" dir="ltr" />
              <button onClick={copy} className="btn-gold !px-3 !py-2 text-xs">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <p className="mt-2 text-[10px] text-stone-500">رمز الإحالة: {refId}</p>
          </div>
        </div>
      )}
    </>
  );
}
