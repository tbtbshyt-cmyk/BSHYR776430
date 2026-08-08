'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2, X, FileSpreadsheet, Download } from 'lucide-react';
import { bulkImportProducts, parseImportFile } from '@/lib/demo-store';

const CSV_TEMPLATE = 'title,price,compare_at_price,stock,category,sizes,barcode,description,featured,active';

export function BulkImport({ onDone }: { onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const rows = parseImportFile(text, file.name);
      if (rows.length === 0) {
        setError('الملف فارغ أو غير صالح. استخدم JSON أو CSV يحتوي على رؤوس أعمدة.');
        setBusy(false);
        return;
      }
      const { imported } = bulkImportProducts(rows);
      setResult(imported);
      onDone();
    } catch (e: any) {
      setError(e?.message ?? 'فشل الاستيراد');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <FileSpreadsheet size={18} className="text-gold-400" /> استيراد منتجات بالجملة
      </h3>
      <p className="mb-3 text-xs text-stone-400">
        ارفع ملف <strong>JSON</strong> (مصفوفة كائنات) أو <strong>CSV</strong> بأعمدة:{' '}
        <code className="text-gold-300" dir="ltr">title, price, category, stock, image, sizes, barcode</code>.
        يمكن استيراد حتى 500 منتج.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        hidden
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="btn-ghost !py-2 text-sm"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        اختيار ملف للاستيراد
      </button>

      <a
        href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE + '\n')}`}
        download="products-template.csv"
        className="mr-2 inline-flex items-center gap-2 rounded-xl border border-gold-400/30 px-4 py-2 text-sm text-gold-300 transition hover:bg-gold-400/10"
      >
        <Download size={16} /> تحميل نموذج CSV
      </a>

      {result !== null && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          <span>✓ تم استيراد <strong>{result}</strong> منتج بنجاح</span>
          <button onClick={() => setResult(null)}><X size={14} /></button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
