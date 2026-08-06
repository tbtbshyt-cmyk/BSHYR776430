'use client';

import { useEffect, useState } from 'react';
import {
  Clock, Package, Truck, CheckCircle2, XCircle, MapPin, CreditCard,
  Phone, User, Loader2, ReceiptText, RefreshCw,
} from 'lucide-react';
import type { Order } from '@/lib/types';
import { formatYER, ORDER_STATUS_LABEL, ORDER_STATUS_STEP, PAYMENT_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/utils';
import { getOrder } from '@/lib/store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

const STEPS = [
  { key: 'pending', label: 'بانتظار المراجعة', icon: Clock },
  { key: 'processing', label: 'قيد التجهيز', icon: Package },
  { key: 'shipped', label: 'في الطريق', icon: Truck },
  { key: 'delivered', label: 'تم التسليم', icon: CheckCircle2 },
];

export function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const loadOrder = async () => {
    try {
      const o = await getOrder(orderId);
      if (!o) {
        setError('لم يتم العثور على هذا الطلب. تأكد من الرقم.');
      } else {
        setOrder(o);
        setLastUpdate(new Date());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();

    // تحديث تلقائي كل 30 ثانية (للوضعين المحلي والمتصل)
    const interval = setInterval(loadOrder, 30000);

    // تحديث لحظي عبر Supabase Realtime عند الاتصال
    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`order-${orderId}`)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
          (payload) => {
            setOrder((prev) => (prev ? { ...prev, ...(payload.new as Order) } : prev));
            setLastUpdate(new Date());
          },
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && isSupabaseConfigured && supabase) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-3 p-12">
        <Loader2 className="animate-spin text-gold-400" />
        جاري تحميل تفاصيل الطلب...
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="card border-red-500/30 p-8 text-center text-red-300">
        {error ?? 'تعذّر تحميل الطلب'}
      </div>
    );
  }

  const step = ORDER_STATUS_STEP[order.status];
  const cancelled = order.status === 'cancelled';

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-stone-400">رقم الطلب</p>
              <p className="font-display text-2xl font-black gold-text">#{order.order_number}</p>
            </div>
            <span
              className={`badge ${
                cancelled
                  ? 'bg-red-600/20 text-red-300'
                  : order.status === 'delivered'
                    ? 'bg-emerald-600/20 text-emerald-300'
                    : 'bg-gold-400/15 text-gold-300'
              }`}
            >
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>

          {/* آخر تحديث + زر التحديث اليدوي */}
          <div className="mt-3 flex items-center justify-end gap-2 text-xs text-stone-500">
            <span>آخر تحديث: {lastUpdate.toLocaleTimeString('ar-YE')}</span>
            <button onClick={loadOrder} className="rounded-lg p-1 hover:bg-white/5 hover:text-gold-300" aria-label="تحديث">
              <RefreshCw size={14} />
            </button>
          </div>

          {cancelled ? (
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              <XCircle /> تم إلغاء هذا الطلب.
            </div>
          ) : (
            <div className="mt-8">
              <div className="relative flex justify-between">
                <div className="absolute top-5 right-0 left-0 h-1 bg-white/10" />
                <div
                  className="absolute top-5 right-0 h-1 bg-gold-gradient transition-all duration-500"
                  style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
                />
                {STEPS.map((s, i) => {
                  const done = i <= step;
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="relative z-10 flex flex-col items-center gap-2 text-center">
                      <span
                        className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition ${
                          done
                            ? 'border-gold-400 bg-gold-gradient text-ink-950 shadow-gold'
                            : 'border-white/15 bg-ink-900 text-stone-500'
                        }`}
                      >
                        <Icon size={20} />
                      </span>
                      <span className={`w-20 text-xs font-semibold ${done ? 'text-gold-300' : 'text-stone-500'}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
            <ReceiptText size={20} className="text-gold-400" /> المنتجات
          </h3>
          <div className="space-y-4">
            {(order.items ?? []).map((it) => (
              <div key={it.id ?? it.product_id} className="flex items-center justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">
                <div>
                  <p className="font-bold">{it.title_ar}</p>
                  <p className="text-xs text-stone-400">
                    المقاس: {it.size ?? 'عام'} × الكمية: {it.quantity}
                  </p>
                </div>
                <p className="font-bold text-gold-300">{formatYER(it.unit_price * it.quantity)}</p>
              </div>
            ))}
            {(!order.items || order.items.length === 0) && (
              <p className="text-sm text-stone-500">لا توجد تفاصيل عناصر لهذا الطلب.</p>
            )}
          </div>
        </div>
      </div>

      <aside className="space-y-6">
        <div className="card p-6">
          <h3 className="mb-4 font-display text-lg font-extrabold">عنوان التوصيل</h3>
          <p className="flex items-start gap-2 text-sm leading-7 text-stone-300">
            <MapPin size={16} className="mt-1 flex-shrink-0 text-gold-400" />
            {order.shipping_address}
          </p>
          {order.gps_coordinates && (
            <p className="mt-2 text-xs text-stone-500" dir="ltr">
              {order.gps_coordinates.y}, {order.gps_coordinates.x}
            </p>
          )}
        </div>

        {order.assigned_to && (
          <div className="card border-gold-400/30 p-6">
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-gold-300">
              <Truck size={20} /> المندوب المسند
            </h3>
            <p className="flex items-center gap-2 text-sm text-stone-300">
              <User size={16} className="text-gold-400" /> عامل التوصيل
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-stone-300">
              <Phone size={16} className="text-gold-400" /> سيتم التواصل قرب الوصول
            </p>
          </div>
        )}

        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
            <CreditCard size={20} className="text-gold-400" /> الدفع
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-stone-400">العربون</span>
            <span className={order.deposit_paid ? 'text-emerald-400' : 'text-amber-400'}>
              {order.deposit_paid ? 'مدفوع ✓' : 'لم يُدفع بعد'}
            </span>
          </div>
          <div className="my-3 border-t border-white/10" />
          {(order.payments ?? []).length > 0 ? (
            <div className="space-y-3">
              {order.payments!.map((p) => (
                <div key={p.id} className="rounded-xl bg-ink-900/60 p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-semibold">{PAYMENT_LABEL[p.method]}</span>
                    <span className="font-bold text-gold-300">{formatYER(p.amount)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-stone-400">
                    <span>{PAYMENT_STATUS_LABEL[p.status]}</span>
                    {p.reference && <span dir="ltr">#{p.reference}</span>}
                  </div>
                  {p.proof_url && (
                    <a
                      href={p.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-gold-300 underline"
                    >
                      عرض إثبات الدفع
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-500">الدفع عند الاستلام</p>
          )}

          <div className="my-4 border-t border-white/10" />
          <div className="flex justify-between font-extrabold">
            <span>الإجمالي</span>
            <span className="gold-text">{formatYER(Number(order.total_amount))}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
