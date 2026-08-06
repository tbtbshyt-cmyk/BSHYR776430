'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchOrders } from '@/lib/admin';
import type { Order, OrderStatus } from '@/lib/types';
import { formatYER, ORDER_STATUS_LABEL } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const FILTERS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'بانتظار المراجعة' },
  { key: 'processing', label: 'قيد التجهيز' },
  { key: 'shipped', label: 'في الطريق' },
  { key: 'delivered', label: 'تم التسليم' },
  { key: 'cancelled', label: 'ملغي' },
];

export default function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | 'all'>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOrders(status).then(setOrders).finally(() => setLoading(false));
  }, [status]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-black">إدارة الطلبات</h2>
        <p className="text-sm text-stone-400">راجع الطلبات وحدّث حالاتها وأسندها لعمال التوصيل</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              status === f.key
                ? 'border-gold-400 bg-gold-gradient text-ink-950'
                : 'border-white/10 text-stone-300 hover:border-gold-400/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="animate-spin text-gold-400" />
          </div>
        ) : orders.length === 0 ? (
          <p className="p-12 text-center text-stone-500">لا توجد طلبات في هذه الحالة.</p>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-stone-500">
              <tr className="border-b border-white/5">
                <th className="py-3 pl-4 pr-4">رقم الطلب</th>
                <th className="py-3 pl-4">العنوان</th>
                <th className="py-3 pl-4">الحالة</th>
                <th className="py-3 pl-4">المبلغ</th>
                <th className="py-3 pl-4">العربون</th>
                <th className="py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4 pr-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-gold-300 hover:underline">
                      #{o.order_number}
                    </Link>
                  </td>
                  <td className="max-w-[200px] truncate py-3 pl-4 text-stone-400">{o.shipping_address}</td>
                  <td className="py-3 pl-4">
                    <span className="badge bg-gold-400/15 text-gold-300">{ORDER_STATUS_LABEL[o.status]}</span>
                  </td>
                  <td className="py-3 pl-4 font-semibold">{formatYER(Number(o.total_amount))}</td>
                  <td className="py-3 pl-4">
                    {o.deposit_paid ? (
                      <span className="text-emerald-400">مدفوع</span>
                    ) : (
                      <span className="text-amber-400">معلّق</span>
                    )}
                  </td>
                  <td className="py-3 text-xs text-stone-500">
                    {new Date(o.created_at).toLocaleDateString('ar-YE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
