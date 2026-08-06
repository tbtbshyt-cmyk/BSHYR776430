'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, KeyRound, Loader2, ShieldCheck, Crown, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';

function OtpForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';

  const { requestOtp, verifyOtp, user } = useAuth();
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (user) router.replace(user.role === 'customer' ? next : '/login');
  }, [user, router, next]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[0-9]{9,13}$/.test(phone.replace(/\D/g, ''))) {
      setError('أدخل رقم هاتف صحيح (مثال: 967777000001)');
      return;
    }
    setLoading(true);
    try {
      const res = await requestOtp(phone, fullName);
      setDevCode(res.devCode ?? null);
      setStep('code');
      setCountdown(60);
    } catch (err: any) {
      setError(err?.message ?? 'تعذّر إرسال الرمز');
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (code.length < 4) {
      setError('أدخل رمز التحقق كاملاً');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, code, fullName);
      router.push(next);
    } catch (err: any) {
      setError(err?.message ?? 'رمز التحقق غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-x flex min-h-[75vh] items-center justify-center py-10">
      <div className="card w-full max-w-md border-gold-400/20 p-8 shadow-gold">
        <div className="mb-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-gradient text-ink-950 shadow-gold">
            {step === 'phone' ? <Phone size={26} /> : <KeyRound size={26} />}
          </span>
          <h1 className="mt-4 font-display text-2xl font-black">
            {step === 'phone' ? 'تسجيل الدخول' : 'تأكيد الرمز'}
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            {step === 'phone'
              ? 'أدخل رقم هاتفك وسنرسل لك رمز تحقق عبر رسالة نصية'
              : `أرسلنا رمزاً إلى ${phone}`}
          </p>
        </div>

        {step === 'phone' ? (
          <form onSubmit={sendCode} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">الاسم الكامل (اختياري)</span>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: أحمد العمري"
                className="input-field"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">رقم الهاتف</span>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  required
                  inputMode="numeric"
                  placeholder="967777000001"
                  className="input-field pr-10 text-right"
                />
              </div>
            </label>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
              إرسال رمز التحقق
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">رمز التحقق</span>
              <div className="relative">
                <ShieldCheck size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  placeholder="••••••"
                  className="input-field pr-10 text-center text-2xl tracking-[0.5em]"
                />
              </div>
            </label>

            {devCode && (
              <div className="rounded-xl border border-gold-400/30 bg-gold-400/10 p-3 text-center text-sm text-gold-300">
                <strong>وضع تجريبي:</strong> استخدم الرمز{' '}
                <span className="font-mono text-lg font-black">{devCode}</span>
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-gold w-full">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              تأكيد وتسجيل الدخول
            </button>

            <div className="flex items-center justify-between pt-2 text-sm">
              <button
                type="button"
                onClick={() => setStep('phone')}
                className="text-stone-400 hover:text-gold-300"
              >
                تغيير الرقم
              </button>
              {countdown > 0 ? (
                <span className="text-stone-500">إعادة الإرسال بعد {countdown}s</span>
              ) : (
                <button type="button" onClick={sendCode} className="font-semibold text-gold-300 hover:text-gold-200">
                  إعادة إرسال الرمز
                </button>
              )}
            </div>
          </form>
        )}

        <div className="mt-6 rounded-xl border border-white/5 bg-ink-900/60 p-3 text-center text-xs text-stone-400">
          للموظفين؟{' '}
          <Link href="/login" className="font-semibold text-gold-300 hover:underline">
            دخول الموظفين
          </Link>
        </div>

        <Link href="/" className="mt-4 flex items-center justify-center gap-1 text-xs text-stone-500">
          <Crown size={12} /> العودة للمتجر
        </Link>
      </div>
    </div>
  );
}

export default function OtpPage() {
  return (
    <Suspense fallback={<div className="container-x py-20 text-center text-stone-400">جاري التحميل...</div>}>
      <OtpForm />
    </Suspense>
  );
}
