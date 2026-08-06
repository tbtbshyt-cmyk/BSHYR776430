'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchMyOrders, markShipped, markDelivered } from '@/lib/delivery';
import type { Order } from '@/lib/types';
import { OrderCard } from '@/components/delivery/OrderCard';
import { Loader2, Truck, CheckCircle2, ListChecks } from 'lucide-react';

export default function DeliveryMinePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    if (!user) return;
    fetchMyOrders(user.id).then(setOrders).finally(() => setLoading(false));
  };
  useEffect(load, [user]);

  const act = async (id: string, fn: typeof markShipped) => {
    setBusyId(id);
    await fn(id);
    load();
    setBusyId(null);
  };

  const active = orders.filter((o) => ['processing', 'shipped'].includes(o.status));
  const history = orders.filter((o) => ['delivered', 'cancelled'].includes(o.status));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-black">
          <ListChecks className="text-gold-400" /> طلباتي المسندة
        </h2>
        <p className="text-sm text-stone-400">إدارة الطلبات المسندة إليك وتحديث حالات التوصيل</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gold-400" size={28} />
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center text-stone-500">
          لم تُسند إليك أي طلبات بعد. توجّه إلى "الطلبات المتاحة" لقبول طلب.
        </div>
      ) : (
        <>
          <section>
            <h3 className="mb-4 font-bold text-gold-300">قيد التوصيل ({active.length})</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((o) => (
                <OrderCard
                  key={o.id}
                  order={o}
                  action={
                    <div className="flex gap-2">
                      {o.status === 'processing' && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => act(o.id, markShipped)}
                          className="btn-ghost flex-1 !py-2.5"
                        >
                          <Truck size={16} /> بدء التوصيل
                        </button>
                      )}
                      {o.status === 'shipped' && (
                        <button
                          disabled={busyId === o.id}
                          onClick={() => act(o.id, markDelivered)}
                          className="btn-gold flex-1 !py-2.5"
                        >
                          {busyId === o.id ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                          تأكيد التسليم
                        </button>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          </section>

          {history.length > 0 && (
            <section>
              <h3 className="mb-4 font-bold text-stone-400">السجل ({history.length})</h3>
              <div className="grid gap-4 md:grid-cols-2 opacity-70">
                {history.map((o) => (
                  <OrderCard key={o.id} order={o} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
