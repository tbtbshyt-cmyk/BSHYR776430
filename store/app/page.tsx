'use client';

import { useEffect, useState } from 'react';
import { BannerCarousel } from '@/components/BannerCarousel';
import { CampaignBanners } from '@/components/CampaignBanners';
import { Stories } from '@/components/Stories';
import { CategoryShowcase } from '@/components/CategoryShowcase';
import { ProductGrid } from '@/components/ProductGrid';
import { Hero } from '@/components/Hero';
import { getBanners, getCategories, getProducts } from '@/lib/store';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { Banner, Category, Product } from '@/lib/types';

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getBanners(), getCategories(), getProducts({ featured: true })])
      .then(([b, c, f]) => {
        setBanners(b);
        setCategories(c);
        setFeatured(f);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gold-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  return (
    <>
      <BannerCarousel banners={banners} />
      <CampaignBanners />
      <Stories />
      <Hero />
      <CategoryShowcase categories={categories} />

      <section className="container-x py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-gold-400">مختارات بعناية</p>
            <h2 className="section-title mt-2">المنتجات المميزة</h2>
            <div className="divider-gold mt-3" />
          </div>
          <Link
            href="/products"
            className="hidden items-center gap-1 text-sm font-bold text-gold-300 hover:text-gold-200 sm:flex"
          >
            عرض الكل <ArrowLeft size={16} />
          </Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className="container-x py-10">
        <div className="card relative overflow-hidden border-gold-400/20 p-8 text-center md:p-14">
          <div className="absolute inset-0 bg-gold-gradient opacity-5" />
          <h3 className="relative font-display text-2xl font-extrabold sm:text-3xl">
            اطلب الآن وادفع عند الاستلام
          </h3>
          <p className="relative mx-auto mt-3 max-w-xl text-stone-300">
            نوفر لك خدمة الدفع عند الاستلام في معظم مناطق اليمن، مع إمكانية دفع عربون مسبق
            لتأكيد الطلب عبر التحويل البنكي أو المحافظ المحلية.
          </p>
          <Link href="/products" className="btn-gold relative mt-6">
            ابدأ التسوق
          </Link>
        </div>
      </section>
    </>
  );
}
