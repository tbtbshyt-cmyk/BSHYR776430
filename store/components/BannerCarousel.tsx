'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '@/lib/types';

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const count = banners.length;

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);
  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(next, 5500);
    return () => clearInterval(t);
  }, [next, count]);

  if (count === 0) return null;

  return (
    <section className="container-x pt-6">
      <div className="relative aspect-[21/9] w-full overflow-hidden rounded-3xl border border-gold-400/20 shadow-gold">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <Image
              src={b.image_url}
              alt={b.title_ar}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-l from-ink-950/85 via-ink-950/40 to-transparent" />
            <div className="relative flex h-full max-w-xl flex-col justify-center p-8 sm:p-12">
              <h2 className="font-display text-2xl font-black leading-tight sm:text-4xl">
                {b.title_ar}
              </h2>
              {b.subtitle_ar && (
                <p className="mt-3 text-sm leading-7 text-stone-200 sm:text-base">
                  {b.subtitle_ar}
                </p>
              )}
              {b.cta_link && (
                <Link
                  href={b.cta_link}
                  className="btn-gold mt-6 w-fit"
                >
                  {b.cta_label ?? 'تسوّق الآن'}
                </Link>
              )}
            </div>
          </div>
        ))}

        {count > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-gold-300 backdrop-blur hover:bg-ink-950"
              aria-label="السابق"
            >
              <ChevronRight />
            </button>
            <button
              onClick={next}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-ink-950/60 p-2 text-gold-300 backdrop-blur hover:bg-ink-950"
              aria-label="التالي"
            >
              <ChevronLeft />
            </button>
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  className={`h-2 rounded-full transition-all ${
                    i === index ? 'w-8 bg-gold-gradient' : 'w-2 bg-white/40'
                  }`}
                  aria-label={`بانر ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
