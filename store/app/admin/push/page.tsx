'use client';

import { useState } from 'react';
import { Send, Bell, CheckCircle2 } from 'lucide-react';

/**
 * مركز إرسال الإشعارات.
 * حالياً يرسل إشعاراً محلياً للمتصفح (Web Notification) لاختبار الحملات.
 * في الإنتاج يُربط بـ VAPID + service worker push.
 */
export default function PushCenterPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('');
  const [sent, setSent] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
  );

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    setPermission(p);
  };

  const send = async () => {
    if (!title.trim()) return;
    if ('Notification' in window && Notification.permission === 'granted') {
      const reg = await navigator.serviceWorker?.ready;
      if (reg) {
        reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: tag || undefined,
          dir: 'rtl',
          lang: 'ar',
        });
      } else {
        new Notification(title, { body, icon: '/icon.svg', dir: 'rtl' });
      }
    }
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    setTitle('');
    setBody('');
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="font-display text-2xl font-black">مركز الإشعارات</h2>
        <p className="text-sm text-stone-400">إرسال إشعارات للعملاء المشتركين بالعروض والتحديثات</p>
      </div>

      <div className="card p-6">
        {permission !== 'granted' && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            يجب تفعيل إذن الإشعارات في المتصفح لمعاينة الإرسال.
            <button onClick={requestPermission} className="mr-2 underline">تفعيل</button>
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

        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-semibold">تصنيف (tag)</span>
          <input value={tag} onChange={(e) => setTag(e.target.value)} className="input-field" placeholder="flash-sale" dir="ltr" />
        </label>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={send} className="btn-gold" disabled={!title.trim()}>
            <Send size={16} /> إرسال إشعار
          </button>
          {sent && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <CheckCircle2 size={16} /> تم الإرسال
            </span>
          )}
        </div>
      </div>

      <div className="card p-5 text-sm text-stone-400">
        <p className="flex items-center gap-2 font-semibold text-stone-300"><Bell size={16} /> ملاحظة تقنية</p>
        <p className="mt-2">
          هذه الواجهة جاهزة للإرسال الفوري عبر إشعارات المتصفح. لإرسال جماعي لكل المشتركين،
          يجب ربط مفاتيح VAPID ومسار خادم <code className="text-gold-300">/api/push</code> في بيئة الإنتاج.
        </p>
      </div>
    </div>
  );
}
