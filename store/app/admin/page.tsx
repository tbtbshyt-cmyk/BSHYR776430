'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ShoppingBag, DollarSign, Package, Users, TrendingUp,
  AlertTriangle, Clock, CreditCard,
} from 'lucide-react';
import { fetchDashboardStats, fetchOrders } from '@/lib/admin';
import { formatYER, ORDER_STATUS_LABEL } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchOrders('all')])
      .then(([s, o]) => {
        setStats(s);
        setRecent(o.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-stone-400">جاري تحميل الإحصائيات...</p>;
  }

  const cards = [
    { label: 'إجمالي الطلبات', value: stats?.orders_total ?? 0, icon: ShoppingBag, color: 'text-blue-300' },
    { label: 'إيرادات مكتملة', value: formatYER(stats?.revenue_delivered ?? 0), icon: DollarSign, color: 'text-emerald-300' },
    { label: 'إيرادات معلّقة', value: formatYER(stats?.revenue_pending ?? 0), icon: TrendingUp, color: 'text-gold-300' },
    { label: 'العملاء', value: stats?.customers_total ?? 0, icon: Users, color: 'text-purple-300' },
    { label: 'المنتجات', value: stats?.products_total ?? 0, icon: Package, color: 'text-cyan-300' },
    { label: 'عربونات معلّقة', value: stats?.pending_deposits ?? 0, icon: CreditCard, color: 'text-amber-300' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-black">نظرة عامة</h2>
        <p className="text-sm text-stone-400">ملخص أداء المتجر وآخر الطلبات</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card p-5">
            <div className="flex items-center justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-ink-900 ${c.color}`}>
                <c.icon size={20} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-black">{c.value}</p>
            <p className="text-sm text-stone-400">{c.label}</p>
          </div>
        ))}
      </div>

      {stats?.low_stock_count > 0 && (
        <div className="card flex items-center gap-3 border-amber-500/30 bg-amber-500/5 p-4 text-amber-300">
          <AlertTriangle size={20} />
          <span>
            <strong>{stats.low_stock_count}</strong> منتج بمخزون منخفض (أقل من 5 قطع) —{' '}
            <Link href="/admin/products" className="underline">راجعها الآن</Link>
          </span>
        </div>
      )}

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
            <Clock size={18} className="text-gold-400" /> أحدث الطلبات
          </h3>
          <Link href="/admin/orders" className="text-sm text-gold-300 hover:text-gold-200">
            عرض الكل
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-stone-500">
              <tr className="border-b border-white/5">
                <th className="py-3 pl-4">رقم الطلب</th>
                <th className="py-3 pl-4">الحالة</th>
                <th className="py-3 pl-4">المبلغ</th>
                <th className="py-3 pl-4">العربون</th>
                <th className="py-3">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-500">
                    لا توجد طلبات بعد. أنشئ طلباً تجريبياً من المتجر ليظهر هنا.
                  </td>
                </tr>
              )}
              {recent.map((o) => (
                <tr key={o.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-gold-300 hover:underline">
                      #{o.order_number}
                    </Link>
                  </td>
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
        </div>
      </div>
    </div>
  );
}
