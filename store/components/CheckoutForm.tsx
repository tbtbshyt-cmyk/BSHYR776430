'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin, Loader2, CheckCircle2, AlertTriangle, LocateFixed,
  Upload, X, FileImage,
} from 'lucide-react';
import { useCart } from '@/lib/cart-store';
import { formatYER, PAYMENT_LABEL } from '@/lib/utils';
import { createOrderAtomic } from '@/lib/store';
import { getSettings } from '@/lib/demo-store';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type PayMethod = 'cash_on_delivery' | 'bank_transfer' | 'local_wallet' | 'deposit';

// محاكاة استخراج بيانات إيصال التحويل (OCR محلي).
// في الإنتاج الحقيقي، تُرفع الصورة لخدمة OCR (Azure/GCP/Tesseract).
function simulateOcr(_file: File): Promise<{ reference: string; provider: string }> {
  return new Promise((resolve) => {
    const providers = ['بنك الكريمي', 'فلوس موني', 'جوال موني', 'بنك التضامن'];
    setTimeout(() => {
      resolve({
        reference: 'DEP-' + Math.floor(100000 + Math.random() * 900000),
        provider: providers[Math.floor(Math.random() * providers.length)],
      });
    }, 1400);
  });
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal, clear } = useCart();

  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PayMethod>('cash_on_delivery');

  const [lat, setLat] = useState<number>();
  const [lng, setLng] = useState<number>();
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const [proofName, setProofName] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<{ reference: string; provider: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [wa] = useState(() => getSettings());
  const [error, setError] = useState<string | null>(null);

  const requiresProof = payment !== 'cash_on_delivery';

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setLocError('تعذّر تحديد الموقع. يمكنك كتابة العنوان يدوياً.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofName(file.name);
    setOcrLoading(true);
    setOcrResult(null);

    // معاينة محلية
    const localUrl = URL.createObjectURL(file);
    setProofUrl(localUrl);

    // في الوضع الحقيقي: رفع إلى Storage ثم الحصول على رابط عام.
    let uploadedUrl = localUrl;
    if (isSupabaseConfigured && supabase) {
      const path = `proofs/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(path, file, { upsert: true });
      if (!error) {
        const { data } = supabase.storage.from('payment-proofs').getPublicUrl(path);
        uploadedUrl = data.publicUrl;
      }
    }
    setProofUrl(uploadedUrl);

    const result = await simulateOcr(file);
    setOcrResult(result);
    setOcrLoading(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!address.trim()) return setError('الرجاء إدخال عنوان التوصيل');
    if (lines.length === 0) return setError('السلة فارغة');
    if (requiresProof && !proofUrl) {
      return setError('يرجى رفع صورة إيصال الدفع لإتمام الطلب');
    }

    setSubmitting(true);
    try {
      const result = await createOrderAtomic({
        shipping_address: address.trim(),
        note: note.trim() || undefined,
        lat,
        lng,
        items: lines.map((l) => ({
          product_id: l.product_id,
          size: l.size,
          quantity: l.quantity,
        })),
      });

      // إنشاء سجل دفعة العربون/التحويل مع رابط الإثبات
      if (requiresProof && proofUrl) {
        if (isSupabaseConfigured && supabase) {
          await supabase.rpc('create_payment', {
            p_order_id: result.id,
            p_method: payment,
            p_amount: Math.round(result.total_amount * 0.5), // عربون 50% كمثال
            p_reference: ocrResult?.reference ?? null,
            p_note: ocrResult ? `المزوّد: ${ocrResult.provider}` : null,
            p_proof_url: proofUrl,
          } as any);
        } else {
          // الوضع المحلي: نسجّل الدفعة مع الطلب
          try {
            const raw = localStorage.getItem('abubashar-demo-orders') || '[]';
            const orders = JSON.parse(raw);
            const idx = orders.findIndex((o: any) => o.id === result.id);
            if (idx >= 0) {
              orders[idx].payments = [
                ...(orders[idx].payments ?? []),
                {
                  id: 'tx-' + Date.now(),
                  order_id: result.id,
                  amount: Math.round(result.total_amount * 0.5),
                  method: payment,
                  status: 'pending',
                  provider: ocrResult?.provider ?? null,
                  reference: ocrResult?.reference ?? null,
                  proof_url: proofUrl,
                  ocr_status: 'pending',
                  paid_at: null,
                },
              ];
              localStorage.setItem('abubashar-demo-orders', JSON.stringify(orders));
            }
          } catch {
            /* ignore */
          }
        }
      }

      clear();
      router.push(`/orders/${result.id}?new=1`);
    } catch (err: any) {
      setError(err?.message ?? 'حدث خطأ أثناء إنشاء الطلب');
      setSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-4 p-12 text-center">
        <h2 className="text-xl font-bold">سلتك فارغة</h2>
        <p className="text-stone-400">أضف منتجات قبل إتمام الطلب.</p>
        <Link href="/products" className="btn-gold">تصفح المنتجات</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className="card p-6">
          <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-extrabold">
            <MapPin size={20} className="text-gold-400" /> عنوان التوصيل
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">الاسم *</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">رقم الهاتف *</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} required dir="ltr" className="input-field text-right" placeholder="7xxxxxxxx" />
            </label>
          </div>

          <label className="block mt-4">
            <span className="mb-1 block text-sm font-semibold">العنوان التفصيلي *</span>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              rows={3}
              placeholder="المحافظة - المدينة - الحي - الشارع - أقرب معلم"
              className="input-field resize-none"
            />
          </label>

          <button
            type="button"
            onClick={getLocation}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-gold-400/30 px-4 py-2 text-sm font-semibold text-gold-300 hover:bg-gold-400/10"
          >
            {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {lat && lng ? 'تم تحديد الموقع' : 'تحديد موقعي عبر GPS'}
          </button>

          {lat && lng && (
            <p className="mt-2 flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 size={14} /> الإحداثيات: {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          )}
          {locError && (
            <p className="mt-2 flex items-center gap-2 text-xs text-amber-400">
              <AlertTriangle size={14} /> {locError}
            </p>
          )}

          <label className="mt-4 block">
            <span className="mb-1 block text-sm font-semibold">ملاحظات للمندوب</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
          </label>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-display text-lg font-extrabold">طريقة الدفع</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              { id: 'cash_on_delivery', desc: 'ادفع نقداً عند الاستلام' },
              { id: 'bank_transfer', desc: 'تحويل بنكي مع رفع الإيصال' },
              { id: 'local_wallet', desc: 'محفظة محلية (فلوس/جوال موني)' },
              { id: 'deposit', desc: 'دفع عربون مسبق 50%' },
            ] as const).map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  payment === m.id
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-white/10 hover:border-gold-400/40'
                }`}
              >
                <input type="radio" name="payment" checked={payment === m.id} onChange={() => setPayment(m.id)} className="mt-1 accent-gold-400" />
                <div>
                  <p className="font-bold">{PAYMENT_LABEL[m.id]}</p>
                  <p className="text-xs text-stone-400">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {requiresProof && (
            <div className="mt-5 rounded-xl border border-gold-400/20 bg-ink-900/60 p-4">
              <p className="mb-3 text-sm font-semibold text-gold-300">
                ارفع صورة إيصال الدفع — سيتم التحقق منها تلقائياً (OCR):
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleProof}
                className="hidden"
              />
              {!proofUrl ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gold-400/30 py-8 text-stone-400 transition hover:border-gold-400/60 hover:text-gold-300"
                >
                  <Upload size={28} />
                  <span className="text-sm font-semibold">اضغط لرفع صورة الإيصال</span>
                </button>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="relative h-28 w-24 overflow-hidden rounded-lg border border-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proofUrl} alt="إثبات" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <FileImage size={16} className="text-gold-400" />
                      {proofName ?? 'إيصال الدفع'}
                    </p>
                    {ocrLoading ? (
                      <p className="mt-2 flex items-center gap-2 text-xs text-amber-400">
                        <Loader2 size={14} className="animate-spin" /> جاري استخراج البيانات...
                      </p>
                    ) : ocrResult ? (
                      <div className="mt-2 rounded-lg bg-emerald-500/10 p-2 text-xs text-emerald-300">
                        <p>✓ تم الاستخراج: {ocrResult.provider}</p>
                        <p dir="ltr">المرجع: {ocrResult.reference}</p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => { setProofUrl(null); setProofName(null); setOcrResult(null); }}
                      className="mt-2 flex items-center gap-1 text-xs text-red-400 hover:underline"
                    >
                      <X size={12} /> إزالة
                    </button>
                  </div>
                </div>
              )}
              <p className="mt-3 text-xs leading-6 text-stone-500">
                بعد تقديم الطلب، سيبقى في حالة <strong>بانتظار المراجعة</strong> حتى يتحقق الموظف
                من الإيصال ويؤكد الدفعة.
              </p>
            </div>
          )}
        </div>
      </div>

      <aside className="lg:col-span-1">
        <div className="card sticky top-24 p-6">
          <h3 className="font-display text-lg font-extrabold">ملخص طلبك</h3>

          <div className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
            {lines.map((l) => (
              <div key={`${l.product_id}-${l.size}`} className="flex gap-3">
                <div className="h-16 w-14 flex-shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${l.image})` }} />
                <div className="flex-1 text-sm">
                  <p className="line-clamp-2 font-semibold leading-5">{l.title_ar}</p>
                  <p className="text-xs text-stone-400">المقاس: {l.size} × {l.quantity}</p>
                </div>
                <p className="text-sm font-bold text-gold-300">{formatYER(l.price * l.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="my-4 border-t border-white/10" />
          <div className="flex justify-between text-base font-extrabold">
            <span>الإجمالي</span>
            <span className="gold-text">{formatYER(subtotal())}</span>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-gold mt-5 w-full text-lg">
            {submitting ? <><Loader2 size={20} className="animate-spin" /> جاري التأكيد...</> : 'تأكيد الطلب'}
          </button>

          {wa.whatsapp_enabled && (
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!address.trim()) { setError('الرجاء إدخال عنوان التوصيل'); return; }
                const items = lines
                  .map((l) => `• ${l.title_ar} ×${l.quantity}${l.size ? ' (' + l.size + ')' : ''} = ${l.price * l.quantity} ر.ي`)
                  .join('%0A');
                const total = lines.reduce((s, l) => s + l.price * l.quantity, 0);
                const msg = (wa.order_template || '')
                  .replace('{items}', items)
                  .replace('{total}', String(total))
                  .replace('{name}', name || '-')
                  .replace('{address}', address)
                  .replace('{phone}', phone || '-');
                window.open(`https://wa.me/${(wa.whatsapp_number || "").replace(/\D/g, '')}?text=${msg}`, '_blank');
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-lg font-bold text-white transition hover:bg-emerald-600"
            >
              إتمام عبر واتساب
            </button>
          )}
        </div>
      </aside>
    </form>
  );
}
