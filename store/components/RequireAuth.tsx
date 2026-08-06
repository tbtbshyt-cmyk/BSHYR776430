'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/types';
import { Loader2, ShieldAlert } from 'lucide-react';

export function RequireAuth({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: Role[];
}) {
  const { user, init } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!user) init();
  }, [user, init]);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    } else if (!allowed.includes(user.role)) {
      router.replace('/login?denied=1');
    }
  }, [user, allowed, router, pathname]);

  if (!user) {
    return (
      <div className="container-x flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-gold-400" size={28} />
      </div>
    );
  }

  if (!allowed.includes(user.role)) {
    return (
      <div className="container-x flex flex-col items-center justify-center gap-3 py-32 text-center">
        <ShieldAlert className="text-red-400" size={40} />
        <p className="text-xl font-bold">لا تملك صلاحية الوصول إلى هذه الصفحة</p>
      </div>
    );
  }

  return <>{children}</>;
}
