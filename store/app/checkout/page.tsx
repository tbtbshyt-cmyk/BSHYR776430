import { CheckoutForm } from '@/components/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="container-x py-10">
      <h1 className="font-display text-3xl font-black">إتمام الطلب</h1>
      <div className="divider-gold mt-3" />
      <p className="mt-3 text-stone-400">أكمل بيانات التوصيل واختر طريقة الدفع لتأكيد طلبك.</p>
      <div className="mt-8">
        <CheckoutForm />
      </div>
    </div>
  );
}
