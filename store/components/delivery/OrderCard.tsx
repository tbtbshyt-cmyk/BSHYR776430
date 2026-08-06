'use client';

import type { Order } from '@/lib/types';
import { formatYER, ORDER_STATUS_LABEL } from '@/lib/utils';
import { MapPin, CreditCard, Clock, User } from 'lucide-react';

export function OrderCard({
  order,
  action,
}: {
  order: Order;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-xl font-black gold-text">#{order.order_number}</p>
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <Clock size={13} />
            {new Date(order.created_at).toLocaleString('ar-YE')}
          </p>
        </div>
        <span className="badge bg-gold-400/15 text-gold-300">
          {ORDER_STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <p className="flex items-start gap-2 text-stone-300">
          <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gold-400" />
          {order.shipping_address}
        </p>
        {order.note && (
          <p className="rounded-lg bg-ink-900 p-2 text-xs text-stone-400">
            <strong className="text-stone-300">ملاحظة:</strong> {order.note}
          </p>
        )}
        <div className="flex items-center justify-between border-t border-white/5 pt-3">
          <span className="flex items-center gap-1.5 text-stone-400">
            <CreditCard size={15} className="text-gold-400" />
            {order.deposit_paid ? 'العربون مدفوع' : 'الدفع عند الاستلام'}
          </span>
          <span className="text-lg font-black text-gold-300">{formatYER(Number(order.total_amount))}</span>
        </div>
        {order.assigned_to && (
          <p className="flex items-center gap-1.5 text-xs text-stone-500">
            <User size={13} /> مسند إليك
          </p>
        )}
      </div>

      {action && <div className="mt-4 border-t border-white/5 pt-4">{action}</div>}
    </div>
  );
}
