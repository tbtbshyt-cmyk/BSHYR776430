import Link from 'next/link';
import { Suspense } from 'react';
import { OrderTracker } from '@/components/OrderTracker';
import { CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  return (
    <div className="container-x py-10">
      {sp.new === '1' && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <CheckCircle2 />
          <div>
            <p className="font-bold">تم استلام طلبك بنجاح!</p>
            <p className="text-sm">سنتواصل معك قريباً لتأكيد التوصيل. احفظ رقم الطلب للمتابعة.</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link href="/track" className="text-sm text-stone-400 hover:text-gold-300">
          ← العودة لتتبع طلب آخر
        </Link>
      </div>

      <Suspense fallback={<div className="card p-12 text-center">جاري التحميل...</div>}>
        <OrderTracker orderId={id} />
      </Suspense>
    </div>
  );
}
