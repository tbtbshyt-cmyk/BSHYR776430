import type { Metadata } from 'next';
import { Cairo, Tajawal } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SmartStylist } from '@/components/SmartStylist';
import { PwaInstaller } from '@/components/PwaInstaller';
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
  title: 'محلات أبو بشار للملابس والأحذية | عتق - شبوة',
  description: 'محلات أبو بشار للملابس والأحذية في عتق، شبوة. ملابس رجالية ونسائية وأطفال، أحذية وشرابات وكماليات بأسعار منافسة.',
  keywords: ['ملابس', 'أحذية', 'شبوة', 'عتق', 'أبو بشار', 'معاوز', 'دروع'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'أبو بشار',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
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
        <PwaInstaller />
      </body>
    </html>
  );
}
