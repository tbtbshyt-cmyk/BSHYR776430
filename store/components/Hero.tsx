import Link from 'next/link';
import { Sparkles, Truck, ShieldCheck, CreditCard } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-ink-radial" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(212,175,55,0.3), transparent 40%), radial-gradient(circle at 80% 30%, rgba(212,175,55,0.2), transparent 40%)',
        }}
      />
      <div className="container-x relative grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
        <div className="animate-fade-up">
          <span className="badge border border-gold-400/30 bg-gold-400/10 text-gold-300">
            <Sparkles size={14} /> مجموعة 2026 الفاخرة
          </span>
          <h1 className="mt-5 font-display text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
            فخامة الكسوة
            <br />
            <span className="gold-text">اليمنية الأصيلة</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-8 text-stone-300 sm:text-lg">
            ثياب سدرة مطرّزة، بشوت ملكية، أحذية جلدية، وعطور فاخرة منتقاة بعناية.
            جودة ملكية، صنعة يمنية متقونة، وتوصيل إلى باب منزلك.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/products" className="btn-gold text-lg">
              تسوّق الآن
            </Link>
            <Link href="/products?slug=thobes" className="btn-ghost text-lg">
              اكتشف الثياب
            </Link>
          </div>

          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            {[
              { icon: Truck, label: 'توصيل سريع' },
              { icon: ShieldCheck, label: 'جودة مضمونة' },
              { icon: CreditCard, label: 'دفع عند الاستلام' },
            ].map((f) => (
              <div key={f.label} className="flex flex-col items-center gap-2 text-stone-300">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/20 bg-ink-800/60 text-gold-300">
                  <f.icon size={20} />
                </span>
                <span className="text-xs font-semibold">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-md animate-fade-up">
          <div className="absolute -inset-4 rounded-[2rem] bg-gold-gradient opacity-20 blur-3xl" />
          <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-gold-400/30 shadow-gold-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://placehold.co/800x1000/0f0f0f/c9a24b?text=Abu+Bashar+Luxury"
              alt="أبو بشار ستورز"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute -bottom-6 -left-6 card border-gold-400/30 p-4 shadow-gold">
            <p className="text-xs text-stone-400">الأكثر مبيعاً</p>
            <p className="font-display font-extrabold text-gold-300">بشت ملكي مطرّز</p>
          </div>
        </div>
      </div>
    </section>
  );
}
