import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SmartStylist } from '@/components/SmartStylist';
import { CartDrawer } from '@/components/CartDrawer';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-cairo',
  display: 'swap',
});

const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'أبو بشار جوال | جوالات وإكسسوارات - شبوة عتق',
  description: 'أبو بشار جوال - وكالة الجوالات والإكسسوارات في شبوة عتق. خلف شبوة مول الجديد، خالف سوق الجوالات. جوالات وشواحن وسماعات وإكسسوارات بأسعار منافسة.',
  keywords: ['جوالات', 'إكسسوارات', 'شبوة', 'عتق', 'أبو بشار جوال', 'آيفون', 'سامسونج', 'شاومي'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${tajawal.variable}`}
    >
      <body className="flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
        <SmartStylist />
      </body>
    </html>
  );
}
