'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package } from 'lucide-react';

export default function TrackPage() {
  const [id, setId] = useState('');
  const router = useRouter();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id.trim()) router.push(`/orders/${id.trim()}`);
  };

  return (
    <div className="container-x py-16">
      <div className="card mx-auto max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-400/10 text-gold-300">
          <Package size={30} />
        </span>
        <h1 className="mt-4 font-display text-2xl font-black">تتبّع طلبك</h1>
        <p className="mt-2 text-sm text-stone-400">
          أدخل رقم الطلب (المعرّف) الذي حصلت عليه بعد تأكيد الطلب لعرض حالته وتفاصيل التوصيل.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="معرّف الطلب"
            className="input-field text-center"
            dir="ltr"
          />
          <button type="submit" className="btn-gold w-full">
            <Search size={18} /> تتبّع الطلب
          </button>
        </form>

        <p className="mt-6 text-xs leading-6 text-stone-500">
          في النسخة المتصلة بـ Supabase، يمكن للعملاء المسجّلين رؤية جميع طلباتهم تلقائياً.
          في وضع العرض التجريبي، أدخل معرّف الطلب الذي ظهر لك بعد إتمام الطلب.
        </p>
      </div>
    </div>
  );
}
