'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPendingPayments, confirmPayment } from '@/lib/admin';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { Transaction, Order } from '@/lib/types';
import { formatYER, PAYMENT_LABEL } from '@/lib/utils';
import { CheckCircle2, XCircle, Loader2, CreditCard, FileImage, Eye } from 'lucide-react';

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<{ order: Order; payment: Transaction }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const load = async () => {
    let pending: { order: Order; payment: Transaction }[] = [];
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase
        .from('transactions')
        .select('*, order:orders(*)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      pending = ((data as any[]) ?? []).map((r) => ({ order: r.order, payment: r }));
    } else {
      pending = await fetchPendingPayments();
    }
    setRows(pending);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const act = async (txId: string, status: 'paid' | 'failed') => {
    setBusy(txId);
    await confirmPayment(txId, status);
    load();
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-black">تأكيد الدفعات ومراجعة الإثباتات</h2>
        <p className="text-sm text-stone-400">راجع إيصالات التحويل، تحقق من بيانات الـ OCR، وأكّد الدفع</p>
      </div>

      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/90 p-4"
          onClick={() => setPreview(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="إثبات الدفع" className="max-h-[90vh] rounded-xl border border-gold-400/30" />
        </div>
      )}

      <div className="card p-6">
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="animate-spin text-gold-400" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-stone-500">
            <CreditCard className="mx-auto mb-3 text-gold-400/60" size={36} />
            لا توجد دفعات معلّقة حالياً.
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map(({ order, payment }) => (
              <div
                key={payment.id}
                className="grid gap-4 rounded-xl border border-white/5 bg-ink-900/50 p-4 md:grid-cols-[auto_1fr_auto] md:items-center"
              >
                {payment.proof_url ? (
                  <button
                    onClick={() => setPreview(payment.proof_url!)}
                    className="relative h-24 w-20 overflow-hidden rounded-lg border border-white/10"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={payment.proof_url} alt="إثبات" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink-950/50 opacity-0 transition hover:opacity-100">
                      <Eye size={20} className="text-gold-300" />
                    </span>
                  </button>
                ) : (
                  <div className="flex h-24 w-20 items-center justify-center rounded-lg border border-dashed border-white/10 text-stone-600">
                    <FileImage size={24} />
                  </div>
                )}

                <div>
                  <Link href={`/admin/orders/${order.id}`} className="font-bold text-gold-300 hover:underline">
                    طلب #{order.order_number}
                  </Link>
                  <p className="text-sm text-stone-400">
                    {PAYMENT_LABEL[payment.method]} ·{' '}
                    <span className="font-bold text-gold-300">{formatYER(Number(payment.amount))}</span>
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-stone-500">
                    {payment.provider && <span>المزوّد: {payment.provider}</span>}
                    {payment.reference && <span dir="ltr">مرجع: {payment.reference}</span>}
                    {payment.ocr_status && (
                      <span className={`rounded-full px-2 py-0.5 ${
                        payment.ocr_status === 'pending' ? 'bg-amber-500/15 text-amber-300'
                          : payment.ocr_status === 'verified' ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-red-500/15 text-red-300'
                      }`}>
                        OCR: {payment.ocr_status === 'pending' ? 'قيد المراجعة' : payment.ocr_status === 'verified' ? 'موثّق' : 'مرفوض'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    disabled={busy === payment.id}
                    onClick={() => act(payment.id, 'paid')}
                    className="btn-gold !py-2 !text-sm"
                  >
                    <CheckCircle2 size={16} /> تأكيد الدفع
                  </button>
                  <button
                    disabled={busy === payment.id}
                    onClick={() => act(payment.id, 'failed')}
                    className="rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    <XCircle size={16} className="ml-1 inline" /> رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
