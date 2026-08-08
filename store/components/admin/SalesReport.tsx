'use client';

import { useMemo } from 'react';
import type { SalesReport } from '@/lib/demo-store';
import { formatYER } from '@/lib/utils';
import { TrendingUp, BarChart3, ShoppingCart, Award } from 'lucide-react';

export function SalesReport({ report }: { report: SalesReport }) {
  const max = useMemo(
    () => Math.max(1, ...report.last_7_days.map((d) => d.revenue)),
    [report],
  );

  const cards = [
    { label: 'إجمالي الإيرادات (مكتملة)', value: formatYER(report.total_revenue), icon: TrendingUp, color: 'text-emerald-300' },
    { label: 'عدد الطلبات المكتملة', value: report.orders_count, icon: ShoppingCart, color: 'text-blue-300' },
    { label: 'متوسط قيمة الطلب', value: formatYER(report.avg_order), icon: BarChart3, color: 'text-gold-300' },
    { label: 'أعلى منتج مبيعاً', value: report.top_products[0]?.title ?? '—', icon: Award, color: 'text-amber-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-ink-900 ${c.color}`}>
              <c.icon size={18} />
            </span>
            <p className="mt-3 text-lg font-black leading-tight">{c.value}</p>
            <p className="text-xs text-stone-400">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="mb-5 flex items-center gap-2 font-display text-lg font-extrabold">
          <BarChart3 size={18} className="text-gold-400" /> الإيرادات آخر 7 أيام
        </h3>
        <div className="flex h-48 items-end gap-2">
          {report.last_7_days.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-gradient-to-t from-gold-400/60 to-gold-400 transition-all"
                  style={{ height: `${(d.revenue / max) * 100}%` }}
                  title={`${formatYER(d.revenue)} · ${d.orders} طلبات`}
                />
              </div>
              <span className="text-[10px] text-stone-500">{d.label}</span>
              <span className="text-[10px] font-semibold text-gold-300">{d.orders}</span>
            </div>
          ))}
        </div>
      </div>

      {report.top_products.length > 0 && (
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
            <Award size={18} className="text-gold-400" /> أكثر المنتجات مبيعاً
          </h3>
          <div className="space-y-3">
            {report.top_products.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-ink-900/60 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-400/15 text-xs font-bold text-gold-300">{i + 1}</span>
                  <span className="text-sm">{p.title}</span>
                </div>
                <div className="flex gap-6 text-sm text-stone-400">
                  <span>{p.qty} قطعة</span>
                  <span className="font-semibold text-gold-300">{formatYER(p.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
