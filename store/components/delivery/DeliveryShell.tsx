'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Truck, ListChecks, MapPin, LogOut, Crown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { RequireAuth } from '@/components/RequireAuth';
import clsx from 'clsx';

const NAV = [
  { href: '/delivery', label: 'الطلبات المتاحة', icon: MapPin, exact: true },
  { href: '/delivery/mine', label: 'طلباتي المسندة', icon: ListChecks },
];

export function DeliveryShell({ children }: { children: React.ReactNode }) {
  const { user, logout, init } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    init();
  }, [init]);

  const doLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <RequireAuth allowed={['delivery', 'admin', 'manager']}>
      <div className="min-h-screen bg-ink-950">
        <header className="sticky top-0 z-30 border-b border-gold-400/15 bg-ink-950/90 backdrop-blur">
          <div className="container-x flex items-center justify-between py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950">
                <Truck size={22} strokeWidth={2.5} />
              </span>
              <div>
                <p className="font-display font-extrabold gold-text">تطبيق التوصيل</p>
                <p className="text-[10px] tracking-widest text-stone-500">DELIVERY APP</p>
              </div>
            </div>

            <nav className="flex items-center gap-2">
              {NAV.map((n) => {
                const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={clsx(
                      'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition',
                      active
                        ? 'bg-gold-gradient text-ink-950'
                        : 'text-stone-300 hover:bg-gold-400/10 hover:text-gold-300',
                    )}
                  >
                    <n.icon size={16} />
                    <span className="hidden sm:inline">{n.label}</span>
                  </Link>
                );
              })}
              {user && ['admin', 'manager'].includes(user.role) && (
                <Link href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-stone-400 hover:text-gold-300">
                  <Crown size={16} /> <span className="hidden sm:inline">الإدارة</span>
                </Link>
              )}
              <button
                onClick={doLogout}
                className="rounded-xl border border-red-500/30 p-2 text-red-400 hover:bg-red-500/10"
                aria-label="خروج"
              >
                <LogOut size={16} />
              </button>
            </nav>
          </div>
        </header>

        <main className="container-x py-8">{children}</main>
      </div>
    </RequireAuth>
  );
}
