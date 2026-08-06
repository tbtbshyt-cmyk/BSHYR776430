import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-7xl font-black gold-text">404</p>
      <h1 className="mt-4 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-stone-400">يبدو أن الصفحة التي تبحث عنها قد نُقلت أو أُزيلت.</p>
      <Link href="/" className="btn-gold mt-6">العودة للرئيسية</Link>
    </div>
  );
}
