'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Crown, Phone, MapPin, Instagram, Facebook, MessageCircle } from 'lucide-react';
import { getSettings, type StoreSettings } from '@/lib/demo-store';

export function Footer() {
  const [s, setS] = useState<StoreSettings | null>(null);
  useEffect(() => setS(getSettings()), []);

  const name = s?.store_name ?? 'أبو بشار جوال';
  const tagline = s?.tagline ?? 'وكالة الجوالات والإكسسوارات';
  const phone = s?.phone ?? '776430697';
  const whatsapp = s?.whatsapp ?? '967776430697';
  const address = s?.address ?? 'شبوة - عتق - خالف سوق الجوالات - خلف شبوة مول الجديد';
  const hours = s?.working_hours ?? '';
  const email = s?.email ?? '';

  const waLink = `https://wa.me/${whatsapp.replace(/\D/g, '')}`;

  return (
    <footer className="mt-20 border-t border-gold-400/15 bg-ink-900/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950">
              <Crown size={22} strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold gold-text">{name}</p>
              <p className="text-xs text-stone-400">{tagline}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            وجهتك الموثوقة للجوالات والإكسسوارات في شبوة - عتق. جودة مضمونة وأسعار منافسة وخدمة توصيل.
          </p>
          <div className="mt-4 flex gap-3">
            <a aria-label="WhatsApp" href={waLink} target="_blank" rel="noreferrer"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 text-gold-300 transition hover:bg-gold-400/10">
              <MessageCircle size={18} />
            </a>
            <a aria-label="Instagram" href={s?.instagram || '#'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 text-gold-300 transition hover:bg-gold-400/10">
              <Instagram size={18} />
            </a>
            <a aria-label="Facebook" href={s?.facebook || '#'}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 text-gold-300 transition hover:bg-gold-400/10">
              <Facebook size={18} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-stone-400">
            <li><Link href="/products" className="hover:text-gold-300">جميع المنتجات</Link></li>
            <li><Link href="/products?slug=phones" className="hover:text-gold-300">الجوالات</Link></li>
            <li><Link href="/products?slug=accessories" className="hover:text-gold-300">الإكسسوارات</Link></li>
            <li><Link href="/track" className="hover:text-gold-300">تتبع طلبك</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">خدمة العملاء</h4>
          <ul className="space-y-2 text-sm text-stone-400">
            <li><Link href="/otp" className="hover:text-gold-300">حسابي</Link></li>
            <li><Link href="/checkout" className="hover:text-gold-300">إتمام الطلب</Link></li>
            <li><Link href="/returns" className="hover:text-gold-300">الإرجاع والاستبدال</Link></li>
            <li><Link href="/shipping" className="hover:text-gold-300">الشحن والتوصيل</Link></li>
            <li><Link href="/faq" className="hover:text-gold-300">الأسئلة الشائعة</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">تواصل معنا</h4>
          <ul className="space-y-3 text-sm text-stone-400">
            <li className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 flex-shrink-0 text-gold-400" />
              <span>{address}</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-gold-400" />
              <a href={`tel:${phone}`} dir="ltr" className="hover:text-gold-300">{phone}</a>
            </li>
            {hours && <li className="text-xs">{hours}</li>}
            {email && <li className="text-xs" dir="ltr">{email}</li>}
            <li>
              <a href={waLink} target="_blank" rel="noreferrer"
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-2 text-emerald-300 transition hover:bg-emerald-500/25">
                <MessageCircle size={16} /> راسلنا على واتساب
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-5">
        <div className="container-x flex flex-col items-center justify-between gap-3 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {name}. جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/privacy" className="hover:text-gold-300">الخصوصية</Link>
            <Link href="/terms" className="hover:text-gold-300">الشروط والأحكام</Link>
            <Link href="/contact" className="hover:text-gold-300">تواصل معنا</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
