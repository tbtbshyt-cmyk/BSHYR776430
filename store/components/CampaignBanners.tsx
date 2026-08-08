'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getActiveCampaigns, trackCampaignView, trackCampaignClick } from '@/lib/demo-store';
import type { Campaign } from '@/lib/types';
import { Megaphone, X } from 'lucide-react';

/**
 * شريط عرض الحملات النشطة حالياً في الصفحة الرئيسية.
 * يعرض بانرات الحملات (إن وُجدت) ويتتبّع المشاهدات والنقرات.
 */
export function CampaignBanners() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const active = getActiveCampaigns();
    setCampaigns(active);
    for (const c of active) trackCampaignView(c.id);
  }, []);

  if (campaigns.length === 0) return null;

  const visible = campaigns.filter((c) => !dismissed.has(c.id));
  if (visible.length === 0) return null;

  const discountText = (c: Campaign) =>
    c.type === 'percentage' ? `خصم ${c.value}%`
      : c.type === 'fixed' ? `وفّر ${c.value} ر.ي`
      : 'اشترِ 1 والثانية بنصف السعر';

  return (
    <section className="container-x py-8">
      <div className="grid gap-4 md:grid-cols-2">
        {visible.slice(0, 2).map((c) => (
          <div
            key={c.id}
            className="relative overflow-hidden rounded-2xl border border-gold-400/30 bg-gradient-to-l from-ink-900 to-ink-800 p-6 shadow-[0_0_40px_-12px_rgba(212,175,55,0.5)]"
          >
            <button
              onClick={() => setDismissed((s) => new Set(s).add(c.id))}
              className="absolute left-3 top-3 rounded-full bg-ink-950/50 p-1 text-stone-400 hover:text-white"
              aria-label="إغلاق"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
                <Megaphone size={24} />
              </span>
              <div>
                {c.banner_title && <p className="text-xs text-gold-300">{c.banner_title}</p>}
                <h3 className="font-display text-2xl font-black text-white">{c.name}</h3>
                {c.banner_subtitle && (
                  <p className="mt-1 text-sm text-stone-300">{c.banner_subtitle}</p>
                )}
                <p className="mt-2 inline-block rounded-full bg-gold-400 px-3 py-1 text-sm font-bold text-ink-950">
                  {discountText(c)}
                </p>
                <div>
                  <Link
                    href={c.product_ids.length ? `/products` : '/products'}
                    onClick={() => trackCampaignClick(c.id)}
                    className="mt-4 inline-block rounded-xl border border-gold-400/40 px-4 py-2 text-sm font-semibold text-gold-300 transition hover:bg-gold-400/10"
                  >
                    تسوّق العرض ←
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
