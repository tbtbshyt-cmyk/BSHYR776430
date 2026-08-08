'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { getMyOrders } from '@/lib/store';
import { formatYER, ORDER_STATUS_LABEL } from '@/lib/utils';
import type { Order } from '@/lib/types';
import { useWallet, pointsToCurrency } from '@/lib/wallet';
import { User, Phone, Package, LogOut, ChevronLeft, Crown, TrendingUp, Gift, Flame } from 'lucide-react';

export default function AccountPage() {
  const { user, logout, init } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { points, streak, last_checkin, dailyCheckIn, coupons } = useWallet();
  const [checkinResult, setCheckinResult] = useState<{ earned: number; streak: number } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.replace('/otp?next=/account');
      return;
    }
    getMyOrders()
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [user, router]);

  if (!user) return null;

  const totalSpent = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total_amount), 0);

  return (
    <div className="container-x py-10">
      <h1 className="font-display text-3xl font-black">حسابي</h1>
      <div className="divider-gold mt-3" />

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* بطاقة الملف الشخصي */}
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-gradient text-ink-950">
              <User size={28} strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-display text-xl font-extrabold">{user.full_name}</p>
              <p className="flex items-center gap-1 text-sm text-stone-400" dir="ltr">
                <Phone size={14} /> {user.phone}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-ink-900/60 p-3 text-center">
              <p className="text-2xl font-black text-gold-300">{orders.length}</p>
              <p className="text-xs text-stone-400">إجمالي الطلبات</p>
            </div>
            <div className="rounded-xl bg-ink-900/60 p-3 text-center">
              <p className="text-2xl font-black text-emerald-400">{formatYER(totalSpent)}</p>
              <p className="text-xs text-stone-400">أنفقت</p>
            </div>
            <div className="rounded-xl bg-ink-900/60 p-3 text-center">
              <p className="text-2xl font-black text-amber-400">{points}</p>
              <p className="text-xs text-stone-400">نقاط الولاء</p>
            </div>
            <div className="rounded-xl bg-ink-900/60 p-3 text-center">
              <p className="text-2xl font-black text-emerald-400">{formatYER(pointsToCurrency(points))}</p>
              <p className="text-xs text-stone-400">قيمة النقاط</p>
            </div>
          </div>

          {/* تسجيل الدخول اليومي */}
          <button
            onClick={() => setCheckinResult(dailyCheckIn())}
            disabled={last_checkin === today}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-500/20 to-gold-400/10 px-4 py-3 text-sm font-bold text-amber-300 transition hover:from-amber-500/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Flame size={16} />
            {last_checkin === today ? `حصلت على مكافأة اليوم (سلسلة ${streak} 🔥)` : 'استلام مكافأة اليوم'}
          </button>
          {checkinResult && (
            <p className="mt-2 text-center text-xs text-emerald-400">
              +{checkinResult.earned} نقطة · السلسلة: {checkinResult.streak} يوم
            </p>
          )}

          {/* الكوبونات */}
          {coupons.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold text-stone-400">
                <Gift size={12} /> كوبوناتك
              </p>
              <div className="space-y-1.5">
                {coupons.filter((c) => c.active).map((c) => (
                  <div key={c.code} className="flex items-center justify-between rounded-lg border border-dashed border-gold-400/40 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-gold-300">{c.code}</span>
                    <span className="text-stone-400">{c.type === 'percentage' ? `خصم ${c.value}%` : `خصم ${c.value} ر.ي`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            {user.role !== 'customer' && (
              <Link
                href={user.role === 'delivery' ? '/delivery' : '/admin'}
                className="btn-ghost w-full !py-2.5 text-sm"
              >
                <Crown size={16} /> لوحة {user.role === 'delivery' ? 'التوصيل' : 'الإدارة'}
              </Link>
            )}
            <button
              onClick={async () => {
                await logout();
                router.push('/');
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </div>

        {/* الطلبات */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
              <Package size={20} className="text-gold-400" /> طلباتي
            </h2>

            {loading ? (
              <p className="py-10 text-center text-stone-400">جاري تحميل الطلبات...</p>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-stone-400">
                <TrendingUp size={32} className="text-gold-400/60" />
                <p>لا توجد طلبات بعد</p>
                <Link href="/products" className="btn-gold mt-2 !py-2 text-sm">
                  ابدأ التسوق
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-ink-900/40 p-4 transition hover:border-gold-400/30"
                  >
                    <div>
                      <p className="font-bold text-gold-300">#{o.order_number}</p>
                      <p className="text-xs text-stone-500">
                        {new Date(o.created_at).toLocaleDateString('ar-YE')} · {o.items?.length ?? 0} منتج
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="badge bg-gold-400/15 text-gold-300">
                        {ORDER_STATUS_LABEL[o.status]}
                      </span>
                      <span className="font-extrabold">{formatYER(Number(o.total_amount))}</span>
                      <ChevronLeft size={18} className="text-stone-500" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
