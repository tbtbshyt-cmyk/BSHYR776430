'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Phone, CreditCard, User, Loader2, CheckCircle2, XCircle,
  Truck, Package, Clock,
} from 'lucide-react';
import { fetchOrderFull, updateOrderStatus, confirmPayment } from '@/lib/admin';
import type { OrderStatus, Transaction } from '@/lib/types';
import { formatYER, ORDER_STATUS_LABEL, PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/utils';

const STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => {
    fetchOrderFull(id).then((o) => {
      setOrder(o);
      setLoading(false);
    });
  };
  useEffect(load, [id]);

  const changeStatus = async (s: OrderStatus) => {
    setBusy(true);
    await updateOrderStatus(id, s);
    load();
    setBusy(false);
  };

  const onConfirmPayment = async (txId: string, status: 'paid' | 'failed') => {
    setBusy(true);
    await confirmPayment(txId, status);
    load();
    setBusy(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-gold-400" size={28} />
      </div>
    );
  }
  if (!order) {
    return <p className="text-stone-400">لم يُعثر على الطلب.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/orders" className="text-sm text-stone-400 hover:text-gold-300">
            ← العودة للطلبات
          </Link>
          <h2 className="mt-1 font-display text-2xl font-black">
            طلب <span className="gold-text">#{order.order_number}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {order.status === 'cancelled' ? (
            <span className="badge bg-red-600/20 text-red-300">
              <XCircle size={14} /> ملغي
            </span>
          ) : order.status === 'delivered' ? (
            <span className="badge bg-emerald-600/20 text-emerald-300">
              <CheckCircle2 size={14} /> تم التسليم
            </span>
          ) : (
            <span className="badge bg-gold-400/15 text-gold-300">
              <Clock size={14} /> {ORDER_STATUS_LABEL[order.status]}
            </span>
          )}
        </div>
      </div>

      {/* تحديث الحالة */}
      <div className="card p-6">
        <h3 className="mb-4 font-bold">تحديث حالة الطلب</h3>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              disabled={busy || order.status === s}
              onClick={() => changeStatus(s)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                order.status === s
                  ? 'border-gold-400 bg-gold-gradient text-ink-950'
                  : s === 'cancelled'
                    ? 'border-red-500/30 text-red-300 hover:bg-red-500/10'
                    : 'border-white/10 text-stone-300 hover:border-gold-400/50'
              }`}
            >
              {ORDER_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* العناصر */}
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <Package size={18} className="text-gold-400" /> العناصر
            </h3>
            <div className="space-y-3">
              {(order.items ?? []).map((it: any) => (
                <div key={it.id ?? it.product_id} className="flex justify-between border-b border-white/5 pb-3 last:border-0">
                  <div>
                    <p className="font-semibold">{it.title_ar}</p>
                    <p className="text-xs text-stone-400">المقاس: {it.size ?? 'عام'} × {it.quantity}</p>
                  </div>
                  <p className="font-bold text-gold-300">{formatYER(it.unit_price * it.quantity)}</p>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-extrabold">
                <span>الإجمالي</span>
                <span className="gold-text">{formatYER(Number(order.total_amount))}</span>
              </div>
            </div>
          </div>

          {/* الدفعات */}
          <div className="card p-6">
            <h3 className="mb-4 flex items-center gap-2 font-bold">
              <CreditCard size={18} className="text-gold-400" /> الدفعات
            </h3>
            {(order.payments ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">لا توجد دفعات مسجلة (الدفع عند الاستلام).</p>
            ) : (
              <div className="space-y-3">
                {order.payments.map((p: Transaction) => (
                  <div key={p.id} className="rounded-xl bg-ink-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-bold">{PAYMENT_LABEL[p.method]}</p>
                        <p className="text-xs text-stone-400">
                          {PAYMENT_STATUS_LABEL[p.status]} {p.reference && `· #${p.reference}`}
                        </p>
                      </div>
                      <p className="font-black text-gold-300">{formatYER(Number(p.amount))}</p>
                    </div>
                    {p.status === 'pending' && (
                      <div className="mt-3 flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => onConfirmPayment(p.id, 'paid')}
                          className="btn-gold !py-2 !text-sm"
                        >
                          <CheckCircle2 size={16} /> تأكيد الدفع
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => onConfirmPayment(p.id, 'failed')}
                          className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                        >
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* الشريط الجانبي */}
        <aside className="space-y-6">
          <div className="card p-6">
            <h3 className="mb-3 flex items-center gap-2 font-bold">
              <MapPin size={18} className="text-gold-400" /> عنوان التوصيل
            </h3>
            <p className="text-sm leading-7 text-stone-300">{order.shipping_address}</p>
            {order.gps_coordinates && (
              <p className="mt-2 text-xs text-stone-500" dir="ltr">
                {order.gps_coordinates.y}, {order.gps_coordinates.x}
              </p>
            )}
            {order.note && (
              <p className="mt-3 rounded-lg bg-ink-900 p-3 text-xs text-stone-400">
                <strong className="text-stone-300">ملاحظة:</strong> {order.note}
              </p>
            )}
          </div>

          {order.assigned_to && (
            <div className="card border-gold-400/30 p-6">
              <h3 className="mb-3 flex items-center gap-2 font-bold text-gold-300">
                <Truck size={18} /> المندوب المسند
              </h3>
              <p className="flex items-center gap-2 text-sm text-stone-300">
                <User size={16} className="text-gold-400" /> عامل توصيل
              </p>
              <p className="mt-2 flex items-center gap-2 text-sm text-stone-300">
                <Phone size={16} className="text-gold-400" /> تم الإسناد
              </p>
            </div>
          )}

          <div className="card p-6">
            <h3 className="mb-3 font-bold">معلومات إضافية</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-stone-400">
                <span>العربون</span>
                <span className={order.deposit_paid ? 'text-emerald-400' : 'text-amber-400'}>
                  {order.deposit_paid ? 'مدفوع' : 'لم يُدفع'}
                </span>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>تاريخ الطلب</span>
                <span>{new Date(order.created_at).toLocaleString('ar-YE')}</span>
              </div>
              {order.delivered_at && (
                <div className="flex justify-between text-stone-400">
                  <span>تاريخ التسليم</span>
                  <span>{new Date(order.delivered_at).toLocaleString('ar-YE')}</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
