import Link from 'next/link';
import Image from 'next/image';
import type { Category } from '@/lib/types';
import { ArrowLeft } from 'lucide-react';

export function CategoryShowcase({ categories }: { categories: Category[] }) {
  return (
    <section className="container-x py-14">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-gold-400">تسوّق حسب الفئة</p>
        <h2 className="section-title mt-2">أقسام المتجر</h2>
        <div className="divider-gold mx-auto mt-3" />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?slug=${cat.slug}`}
            className="group card relative aspect-square overflow-hidden"
          >
            {cat.image_url && (
              <Image
                src={cat.image_url}
                alt={cat.name_ar}
                fill
                sizes="20vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <h3 className="font-display text-base font-extrabold text-white sm:text-lg">
                {cat.name_ar}
              </h3>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-gold-300 opacity-0 transition group-hover:opacity-100">
                تصفح <ArrowLeft size={12} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
