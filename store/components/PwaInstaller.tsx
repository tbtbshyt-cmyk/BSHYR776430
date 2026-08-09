'use client';

import { useEffect, useState } from 'react';
import { Bell, X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * مسؤول تفعيل PWA وطلب الاشتراك في الإشعارات.
 * يسجّل service worker، ويعرض زر "أضف للشاشة الرئيسية" وطلب الإشعارات.
 */
export function PwaInstaller() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    const onBefore = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
      const dismissed = localStorage.getItem('ab_pwa_dismissed');
      if (!dismissed) setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', onBefore);

    if ('Notification' in window) {
      setNotifEnabled(Notification.permission === 'granted');
    }
    return () => window.removeEventListener('beforeinstallprompt', onBefore);
  }, []);

  const install = async () => {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
    setShowPrompt(false);
  };

  const enableNotif = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      setNotifEnabled(true);
      new Notification('تم تفعيل الإشعارات 🔔', {
        body: 'سنعلمك بأحدث العروض والخصومات!',
        icon: '/icon.svg',
      });
      try {
        const { subscribePush, getPublicKey } = await import('@/lib/push');
        if (getPublicKey()) await subscribePush();
      } catch {
        /* تجاهل في وضع الديمو */
      }
    }
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ab_pwa_dismissed', '1');
  };

  if (!mounted) return null;
  if (!showPrompt && !installEvt && notifEnabled) return null;

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-5 right-5 z-40 w-[92vw] max-w-sm rounded-2xl border border-gold-400/30 bg-ink-900 p-4 shadow-2xl">
          <button onClick={dismiss} className="absolute left-3 top-3 text-stone-400 hover:text-white">
            <X size={16} />
          </button>
          <div className="flex items-center gap-2">
            <Download size={20} className="text-gold-400" />
            <p className="font-bold">أضف التطبيق لشاشتك الرئيسية</p>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            وصّل أسرع لمتجرنا وتابع طلباتك بنقرة واحدة.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="btn-gold flex-1 !py-2 text-sm">
              <Download size={14} /> تثبيت التطبيق
            </button>
            {!notifEnabled && (
              <button onClick={enableNotif} className="btn-ghost !py-2 text-sm">
                <Bell size={14} /> الإشعارات
              </button>
            )}
          </div>
        </div>
      )}

      {/* زر صغير دائم لتفعيل الإشعارات بعد رفض البانر */}
      {mounted && !showPrompt && !notifEnabled && typeof window !== 'undefined' && 'Notification' in window && (
        <button
          onClick={enableNotif}
          aria-label="تفعيل الإشعارات"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-gold-300 shadow-lg ring-1 ring-gold-400/30 hover:bg-ink-800"
        >
          <Bell size={20} />
        </button>
      )}
    </>
  );
}
