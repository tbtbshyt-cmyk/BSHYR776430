'use client';

import Link from 'next/link';
import { ShoppingBag, Search, Menu, X, Mic, MicOff, User, Camera } from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { useAuth } from '@/lib/auth';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiddenLogo } from './HiddenLogo';

// دعم Web Speech API (متاح في Chrome/Edge)
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { 0: SpeechRecognitionResultLike; length: number } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export function Navbar() {
  const count = useCart((s) => s.lines.reduce((a, l) => a + l.quantity, 0));
  const { user, init } = useAuth();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const router = useRouter();

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const submitSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.trim()) {
      setOpen(false);
      router.push(`/products?q=${encodeURIComponent(q.trim())}`);
    }
  };

  const toggleVoice = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('متصفّحك لا يدعم البحث الصوتي. جرّب Chrome أو Edge.');
      return;
    }
    const rec: SpeechRecognitionLike = new SR();
    rec.lang = 'ar-YE';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setQ(transcript);
      if (transcript.trim()) {
        setListening(false);
        router.push(`/products?q=${encodeURIComponent(transcript.trim())}`);
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const navLinks = [
    { href: '/', label: 'الرئيسية' },
    { href: '/products', label: 'المنتجات' },
    { href: '/products?slug=thobes', label: 'الثياب' },
    { href: '/products?slug=bisht', label: 'البشوت' },
    { href: '/products?slug=shoes', label: 'الأحذية' },
    { href: '/products?slug=perfumes', label: 'العطور' },
    { href: '/track', label: 'تتبع الطلب' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'border-b border-gold-400/20 bg-ink-950/85 backdrop-blur-xl'
          : 'bg-transparent'
      }`}
    >
      <div className="container-x flex h-18 items-center gap-4 py-3">
        <button
          className="rounded-lg p-2 text-gold-300 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="القائمة"
        >
          {open ? <X /> : <Menu />}
        </button>

        <HiddenLogo />

        <nav className="mr-4 hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href + l.label}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-stone-300 transition hover:bg-gold-400/10 hover:text-gold-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form onSubmit={submitSearch} className="mr-auto hidden flex-1 max-w-xs md:block">
          <div className="relative">
            <Search
              size={18}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ابحث أو تحدّث..."
              className="input-field pr-10 pl-10"
            />
            <button
              type="button"
              onClick={toggleVoice}
              className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition ${
                listening
                  ? 'bg-red-500/20 text-red-400 animate-pulse'
                  : 'text-stone-400 hover:bg-white/5 hover:text-gold-300'
              }`}
              aria-label="بحث صوتي"
              title="بحث صوتي"
            >
              {listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <Link
              href="/search/visual"
              className="absolute left-9 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-white/5 hover:text-gold-300"
              aria-label="بحث بالصورة"
              title="بحث بالصورة"
            >
              <Camera size={16} />
            </Link>
          </div>
        </form>

        <Link
          href={user ? '/account' : '/otp'}
          className="relative hidden rounded-xl border border-gold-400/30 p-2.5 text-gold-300 transition hover:bg-gold-400/10 sm:block"
          aria-label="حسابي"
          title={user ? user.full_name : 'تسجيل الدخول'}
        >
          <User size={22} />
          {user && (
            <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
          )}
        </Link>

        <Link
          href="/cart"
          className="relative rounded-xl border border-gold-400/30 p-2.5 text-gold-300 transition hover:bg-gold-400/10"
          aria-label="السلة"
        >
          <ShoppingBag size={22} />
          {count > 0 && (
            <span className="absolute -left-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-gradient px-1 text-xs font-black text-ink-950">
              {count}
            </span>
          )}
        </Link>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-ink-900/95 lg:hidden">
          <nav className="container-x flex flex-col gap-1 py-3">
            <form onSubmit={submitSearch} className="mb-2">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث..."
                  className="input-field pr-10 pl-10"
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 hover:text-gold-300"
                >
                  <Mic size={16} />
                </button>
              </div>
            </form>
            {navLinks.concat([
              { href: '/products?slug=accessories', label: 'الإكسسوارات' },
            ]).map((l) => (
              <Link
                key={l.href + l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-stone-200 hover:bg-gold-400/10 hover:text-gold-300"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
