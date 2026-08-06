'use client';

import { useEffect, useRef, useState } from 'react';

export function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('jsbarcode').then((mod) => {
      if (cancelled || !ref.current) return;
      try {
        (mod.default || (mod as any))(ref.current, value, {
          format: 'CODE128',
          width: 1.4,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 4,
          background: '#ffffff',
          lineColor: '#0a0a0b',
        });
        setReady(true);
      } catch {
        /* قيمة غير صالحة للباركود */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return (
    <svg
      ref={ref}
      className={`rounded-md bg-white p-1 transition-opacity ${ready ? 'opacity-100' : 'opacity-0'}`}
    />
  );
}
