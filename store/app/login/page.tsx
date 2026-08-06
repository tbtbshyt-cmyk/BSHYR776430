'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Phone, Loader2, Crown, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';
  const denied = params.get('denied') === '1';

  const { user, login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'delivery') router.replace('/delivery');
      else if (['admin', 'manager'].includes(user.role)) router.replace(next);
    }
  }, [user, router, next]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err: any) {
      setError(err?.message ?? 'تعذّر تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const quickFill = (p: string) => {
    setPhone(p);
    setPassword('Abubashar@2026');
  };

  return (
    <div className="container-x flex min-h-[70vh] items-center justify-center py-10">
      <div className="card w-full max-w-md border-gold-400/20 p-8 shadow-gold">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-gradient text-ink-950 shadow-gold">
            <Crown size={28} strokeWidth={2.5} />
          </span>
          <h1 className="mt-4 font-display text-2xl font-black">لوحة الموظفين</h1>
          <p className="mt-1 text-sm text-stone-400">سجّل دخولك للوصول إلى لوحة التحكم أو تطبيق التوصيل</p>
        </div>

        {denied && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            <AlertTriangle size={16} /> ليس لديك صلاحية للوصول إلى هذه الصفحة.
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">رقم الهاتف</span>
            <div className="relative">
              <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                dir="ltr"
                required
                placeholder="967777000001"
                className="input-field pr-10 text-right"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold">كلمة المرور</span>
            <div className="relative">
              <Lock size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-field pr-10"
              />
            </div>
          </label>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-gold w-full">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
            تسجيل الدخول
          </button>
        </form>

        <div className="mt-6 rounded-xl border border-white/5 bg-ink-900/60 p-4">
          <p className="mb-2 text-xs font-bold text-gold-300">حسابات تجريبية (اضغط للملء):</p>
          <div className="space-y-1.5 text-xs text-stone-400">
            <button type="button" onClick={() => quickFill('967777000001')} className="block w-full text-right hover:text-gold-300">
              👑 مسؤول: 967777000001
            </button>
            <button type="button" onClick={() => quickFill('967777000002')} className="block w-full text-right hover:text-gold-300">
              🛡️ مدير: 967777000002
            </button>
            <button type="button" onClick={() => quickFill('967777000003')} className="block w-full text-right hover:text-gold-300">
              🚚 توصيل: 967777000003
            </button>
          </div>
        </div>

        <Link href="/" className="mt-4 block text-center text-sm text-stone-500 hover:text-gold-300">
          العودة للمتجر
        </Link>
      </div>
    </div>
  );
}

import { Suspense } from 'react';
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="container-x py-20 text-center text-stone-400">جاري التحميل...</div>}>
      <LoginForm />
    </Suspense>
  );
}
