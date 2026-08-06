import Link from 'next/link';
import { Crown, Phone, MapPin, Instagram, Facebook } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-20 border-t border-gold-400/15 bg-ink-900/60">
      <div className="container-x grid gap-10 py-14 md:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-gradient text-ink-950">
              <Crown size={22} strokeWidth={2.5} />
            </span>
            <div>
              <p className="font-display text-lg font-extrabold gold-text">أبو بشار ستورز</p>
              <p className="text-xs text-stone-400">فخامة الكسوة اليمنية الأصيلة</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-stone-400">
            وجهتك الأولى للثياب والبشوت والأحذية الفاخرة والعطور الأصيلة. صنعة يمنية متقونة وجودة ملكية.
          </p>
          <div className="mt-4 flex gap-3">
            <a aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 text-gold-300 transition hover:bg-gold-400/10" href="#">
              <Instagram size={18} />
            </a>
            <a aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 text-gold-300 transition hover:bg-gold-400/10" href="#">
              <Facebook size={18} />
            </a>
          </div>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-stone-400">
            <li><Link href="/products" className="hover:text-gold-300">جميع المنتجات</Link></li>
            <li><Link href="/products?slug=thobes" className="hover:text-gold-300">الثياب اليمنية</Link></li>
            <li><Link href="/products?slug=bisht" className="hover:text-gold-300">البشوت والفراء</Link></li>
            <li><Link href="/track" className="hover:text-gold-300">تتبع طلبك</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">خدمة العملاء</h4>
          <ul className="space-y-2 text-sm text-stone-400">
            <li><Link href="/otp" className="hover:text-gold-300">حسابي / تسجيل الدخول</Link></li>
            <li><Link href="/checkout" className="hover:text-gold-300">إتمام الطلب</Link></li>
            <li><Link href="/returns" className="hover:text-gold-300">سياسة الإرجاع</Link></li>
            <li><Link href="/shipping" className="hover:text-gold-300">الشحن والتوصيل</Link></li>
            <li><Link href="/faq" className="hover:text-gold-300">الأسئلة الشائعة</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 font-bold text-gold-300">تواصل معنا</h4>
          <ul className="space-y-3 text-sm text-stone-400">
            <li className="flex items-center gap-2"><MapPin size={16} className="text-gold-400" /> صنعاء - شارع الستين</li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-gold-400" />
              <span dir="ltr">+967 777 000 001</span>
            </li>
            <li><Link href="/contact" className="hover:text-gold-300">نموذج التواصل</Link></li>
            <li><Link href="/about" className="hover:text-gold-300">من نحن</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/5 py-5">
        <div className="container-x flex flex-col items-center justify-between gap-3 text-xs text-stone-500 sm:flex-row">
          <p>© {new Date().getFullYear()} أبو بشار ستورز. جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/privacy" className="hover:text-gold-300">الخصوصية</Link>
            <Link href="/terms" className="hover:text-gold-300">الشروط والأحكام</Link>
            <Link href="/faq" className="hover:text-gold-300">الأسئلة الشائعة</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
