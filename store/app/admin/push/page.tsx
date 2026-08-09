'use client';

import { useEffect, useState } from 'react';
import { Send, Bell, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { isPushSupported, getPublicKey, subscribePush } from '@/lib/push';

export default function PushCenterPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [link, setLink] = useState('/');
  const [sent, setSent] = useState<{ count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [subscribers, setSubscribers] = useState<number | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(Boolean(sub));
    });
  }, []);

  const enable = async () => {
    if (!getPublicKey()) {
      setError('لم يتم ضبط مفتاح VAPID العام (NEXT_PUBLIC_VAPID_PUBLIC_KEY)');
      return;
    }
    await Notification.requestPermission();
    const sub = await subscribePush();
    setSubscribed(Boolean(sub));
  };

  const send = async () => {
    setError(null);
    if (!title.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', title, body, tag, url: link }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'فشل الإرسال');
      setSent({ count: data.sent ?? 0 });
      setSubscribers(data.sent ?? 0);
      setTitle('');
      setBody('');
      setTimeout(() => setSent(null), 3000);
    } catch (e: any) {
      setError(e?.message ?? 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-black">مركز الإشعارات</h2>
        <p className="text-sm text-stone-400">إرسال إشعارات فورية للعملاء المشتركين</p>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Bell size={16} className="text-gold-400" />
            حالة الاشتراك على هذا الجهاز:
            <span className={subscribed ? 'text-emerald-400' : 'text-amber-400'}>
              {subscribed ? 'مشترك' : 'غير مشترك'}
            </span>
          </div>
          {!subscribed && (
            <button onClick={enable} className="btn-ghost !py-2 text-sm">
              تفعيل الإشعارات
            </button>
          )}
        </div>

        {!getPublicKey() && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
            ملاحظة: للإرسال الجماعي يجب ضبط مفاتيح VAPID في بيئة الإنتاج
            (<code dir="ltr">NEXT_PUBLIC_VAPID_PUBLIC_KEY</code> و <code dir="ltr">VAPID_PRIVATE_KEY</code>).
          </div>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-semibold">عنوان الإشعار *</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input-field" placeholder="🔥 تخفيضات نهاية الأسبوع" />
        </label>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">نص الإشعار</span>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="input-field resize-none" placeholder="خصم حتى 30% لمدة 48 ساعة..." />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">التصنيف</span>
            <input value={tag} onChange={(e) => setTag(e.target.value)} className="input-field" placeholder="flash-sale" dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">الرابط</span>
            <input value={link} onChange={(e) => setLink(e.target.value)} className="input-field" placeholder="/products" dir="ltr" />
          </label>
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
            <AlertCircle size={16} /> {error}
          </p>
        )}
        {sent && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-300">
            <CheckCircle2 size={16} /> تم الإرسال إلى {sent.count} مشترك
          </p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button onClick={send} className="btn-gold" disabled={!title.trim() || sending}>
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            إرسال لكل المشتركين
          </button>
        </div>
      </div>
    </div>
  );
}
