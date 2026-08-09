'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, ShoppingBag, Users, Package, CreditCard,
  LogOut, Crown, Menu, X, Truck, Image as ImageIcon, Tags, Settings, Megaphone, Sparkles, Calculator, Bell,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { RequireAuth } from '@/components/RequireAuth';
import clsx from 'clsx';

const NAV = [
  { href: '/admin', label: 'اللوحة الرئيسية', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { href: '/admin/pos', label: 'نقطة البيع POS', icon: Calculator, roles: ['admin', 'manager'] },
  { href: '/admin/orders', label: 'الطلبات', icon: ShoppingBag, roles: ['admin', 'manager'] },
  { href: '/admin/payments', label: 'الدفعات', icon: CreditCard, roles: ['admin', 'manager'] },
  { href: '/admin/push', label: 'مركز الإشعارات', icon: Bell, roles: ['admin', 'manager'] },
  { href: '/admin/products', label: 'المنتجات', icon: Package, roles: ['admin', 'manager'] },
  { href: '/admin/ai', label: 'الذكاء الاصطناعي', icon: Sparkles, roles: ['admin', 'manager'] },
  { href: '/admin/campaigns', label: 'الحملات الإعلانية', icon: Megaphone, roles: ['admin', 'manager'] },
  { href: '/admin/banners', label: 'الإعلانات/البانرات', icon: ImageIcon, roles: ['admin', 'manager'] },
  { href: '/admin/categories', label: 'الأصناف', icon: Tags, roles: ['admin', 'manager'] },
  { href: '/admin/customers', label: 'العملاء', icon: Users, roles: ['admin'] },
  { href: '/admin/settings', label: 'الإعدادات', icon: Settings, roles: ['admin', 'manager'] },
  { href: '/delivery', label: 'تطبيق التوصيل', icon: Truck, roles: ['admin', 'manager', 'delivery'] },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    useAuth.getState().init();
  }, []);

  const doLogout = async () => {
    await logout();
    router.push('/login');
  };

  const links = NAV.filter((n) => user && n.roles.includes(user.role));

  return (
    <RequireAuth allowed={['admin', 'manager']}>
      <div className="min-h-screen bg-ink-950">
        {/* الشريط الجانبي */}
        <aside
          className={clsx(
            'fixed inset-y-0 right-0 z-40 w-72 transform border-l border-gold-400/15 bg-ink-900 transition-transform lg:translate-x-0',
            open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0',
          )}
        >
          <div className="flex items-center justify-between p-5">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950">
                <Crown size={22} strokeWidth={2.5} />
              </span>
              <div>
                <p className="font-display font-extrabold gold-text">أبو بشار</p>
                <p className="text-[10px] tracking-widest text-stone-500">CONTROL PANEL</p>
              </div>
            </Link>
            <button className="lg:hidden" onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>

          <nav className="mt-4 space-y-1 px-3">
            {links.map((l) => {
              const active = l.href === '/admin' ? pathname === '/admin' : pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={clsx(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition',
                    active
                      ? 'bg-gold-gradient text-ink-950 shadow-gold'
                      : 'text-stone-300 hover:bg-gold-400/10 hover:text-gold-300',
                  )}
                >
                  <l.icon size={18} />
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="absolute inset-x-0 bottom-0 border-t border-white/5 p-4">
            <div className="mb-3 rounded-xl bg-ink-800 p-3">
              <p className="text-sm font-bold">{user?.full_name}</p>
              <p className="text-xs text-stone-400" dir="ltr">{user?.phone}</p>
              <span className="mt-1 inline-block rounded-full bg-gold-400/15 px-2 py-0.5 text-[10px] font-bold text-gold-300">
                {user?.role === 'admin' ? 'مسؤول' : user?.role === 'manager' ? 'مدير' : 'توصيل'}
              </span>
            </div>
            <button
              onClick={doLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/10"
            >
              <LogOut size={16} /> تسجيل الخروج
            </button>
          </div>
        </aside>

        {open && <div className="fixed inset-0 z-30 bg-ink-950/60 lg:hidden" onClick={() => setOpen(false)} />}

        <div className="lg:pr-72">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gold-400/10 bg-ink-950/80 px-4 py-3 backdrop-blur lg:px-8">
            <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)}>
              <Menu />
            </button>
            <h1 className="font-display text-lg font-extrabold">
              <span className="gold-text">لوحة التحكم الخفية</span>
            </h1>
            <Link href="/" className="text-sm text-stone-400 hover:text-gold-300">
              عرض المتجر ←
            </Link>
          </header>
          <main className="p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}
