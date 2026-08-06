export function formatYER(value: number): string {
  return new Intl.NumberFormat('ar-YE', {
    style: 'currency',
    currency: 'YER',
    maximumFractionDigits: 0,
  }).format(value);
}

export function discountPercent(price: number, compare: number | null): number {
  if (!compare || compare <= price) return 0;
  return Math.round(((compare - price) / compare) * 100);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار المراجعة',
  processing: 'قيد التجهيز',
  shipped: 'في الطريق إليك',
  delivered: 'تم التسليم',
  cancelled: 'ملغي',
};

export const ORDER_STATUS_STEP: Record<string, number> = {
  pending: 0,
  processing: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1,
};

export const PAYMENT_LABEL: Record<string, string> = {
  cash_on_delivery: 'الدفع عند الاستلام',
  deposit: 'عربون مسبق',
  bank_transfer: 'تحويل بنكي',
  local_wallet: 'محفظة محلية',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: 'بانتظار التأكيد',
  paid: 'مدفوع',
  failed: 'فشل الدفع',
  refunded: 'مسترجع',
};
