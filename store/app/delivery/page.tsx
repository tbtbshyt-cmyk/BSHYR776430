'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchAvailableOrders, assignToMe } from '@/lib/delivery';
import type { Order } from '@/lib/types';
import { OrderCard } from '@/components/delivery/OrderCard';
import { Loader2, PackageCheck, MapPin } from 'lucide-react';

export default function DeliveryAvailablePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    fetchAvailableOrders().then(setOrders).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const accept = async (id: string) => {
    if (!user) return;
    setBusyId(id);
    await assignToMe(id, user.id);
    load();
    setBusyId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-black">
            <MapPin className="text-gold-400" /> الطلبات المتاحة
          </h2>
          <p className="text-sm text-stone-400">الطلبات بانتظار إسنادها إلى مندوب توصيل</p>
        </div>
        <button onClick={load} className="btn-ghost !py-2 !text-sm">تحديث</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gold-400" size={28} />
        </div>
      ) : orders.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-12 text-center text-stone-500">
          <PackageCheck size={40} className="text-gold-400/60" />
          <p>لا توجد طلبات متاحة حالياً. تحقق لاحقاً.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              action={
                <button
                  disabled={busyId === o.id}
                  onClick={() => accept(o.id)}
                  className="btn-gold w-full !py-2.5"
                >
                  {busyId === o.id ? <Loader2 size={18} className="animate-spin" /> : <PackageCheck size={18} />}
                  قبول الطلب وإسناده إليّ
                </button>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
