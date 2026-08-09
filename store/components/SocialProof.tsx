'use client';

import { useEffect, useState } from 'react';
import { getDemoProducts } from '@/lib/demo-store';
import type { Product } from '@/lib/types';
import { CheckCircle2, X } from 'lucide-react';

const CITIES = ['عتق', 'نصاب', 'عتق القديمة', 'الجول', 'حبان', 'الروضة', 'ميفعة'];
const NAMES = [
  'أحمد', 'محمد', 'سالم', 'عبدالله', 'فاطمة', 'أم محمد', 'خالد', 'سعيد', 'مريم', 'علي',
];

interface Notice {
  id: number;
  name: string;
  city: string;
  product: Product;
  time: string;
}

/**
 * إشعارات شراء اجتماعية وهمية لكن قابلة للتحكم،
 * تظهر مؤقتاً في الزاوية لإضفاء حيوية وثقة (FOMO).
 */
export function SocialProof() {
  const [products, setProducts] = useState<Product[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    setProducts(getDemoProducts().filter((p) => p.stock_quantity > 0));
    // إيقاف لو ضبطه الإدارة محلياً
    const off = localStorage.getItem('ab_social_off');
    if (off) setEnabled(false);
  }, []);

  useEffect(() => {
    if (!enabled || products.length === 0) return;
    let timeout: ReturnType<typeof setTimeout>;

    const show = () => {
      const p = products[Math.floor(Math.random() * products.length)];
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const city = CITIES[Math.floor(Math.random() * CITIES.length)];
      setNotice({
        id: Date.now(),
        name,
        city,
        product: p,
        time: 'منذ دقيقتين',
      });
      timeout = setTimeout(() => setNotice(null), 5000);
    };

    // أول إشعار بعد 8 ثوانٍ، ثم كل 20 ثانية
    const first = setTimeout(show, 8000);
    const interval = setInterval(show, 20000);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [enabled, products]);

  if (!enabled || !notice) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 w-[92vw] max-w-sm animate-[fadeIn_.3s_ease]">
      <div className="card flex items-center gap-3 p-3 shadow-2xl">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-cover bg-center"
          style={{ backgroundImage: `url(${notice.product.images[0]})` }} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-xs font-bold text-emerald-400">
            <CheckCircle2 size={14} /> تم الشراء
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-stone-300">
            <strong>{notice.name}</strong> من {notice.city} اشترى{' '}
            <span className="text-gold-300">{notice.product.title_ar}</span>
          </p>
          <p className="text-[10px] text-stone-500">{notice.time}</p>
        </div>
        <button
          onClick={() => { setNotice(null); localStorage.setItem('ab_social_off', '1'); setEnabled(false); }}
          className="text-stone-500 hover:text-white"
          aria-label="إغلاق"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
