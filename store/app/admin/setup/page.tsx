'use client';

import { useEffect, useState } from 'react';
import { Database, CheckCircle2, XCircle, Copy, Download, Loader2, ExternalLink } from 'lucide-react';

interface Status {
  configured: boolean;
  ready: boolean;
  tables?: Record<string, boolean>;
  missing?: string[];
  message?: string;
}

export default function SetupPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [sql, setSql] = useState('');

  const check = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/setup');
      setStatus(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { check(); }, []);

  const loadAndCopy = async () => {
    const res = await fetch('/api/setup?sql=1');
    const text = await res.text();
    setSql(text);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    window.open('/api/setup?sql=1', '_blank');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-gold-400">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

  const isReady = status?.ready;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-2xl font-black">
          <Database size={22} className="text-gold-400" /> تهيئة قاعدة البيانات
        </h2>
        <p className="mt-1 text-sm text-stone-400">إنشاء الجداول والسياسات والبيانات التجريبية في Supabase</p>
      </div>

      {/* الحالة */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="font-bold">حالة الاتصال</p>
          <button onClick={check} className="text-xs text-gold-400 hover:underline">إعادة الفحص</button>
        </div>

        {!status?.configured && (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
            متغيرات بيئة Supabase غير مضبوطة. أضفها في <code dir="ltr">.env.local</code>.
          </div>
        )}

        {status?.configured && (
          <>
            <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-sm ${isReady ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border border-red-500/30 bg-red-500/10 text-red-300'}`}>
              {isReady ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
              {isReady ? 'قاعدة البيانات جاهزة ومتصلة' : 'قاعدة البيانات بحاجة للتهيئة'}
            </div>

            {status.tables && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(status.tables).map(([table, ok]) => (
                  <div key={table} className={`flex items-center gap-2 rounded-lg p-2 text-xs ${ok ? 'bg-emerald-500/5 text-emerald-300' : 'bg-red-500/5 text-red-300'}`}>
                    {ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    <span dir="ltr">{table}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* تعليمات التهيئة */}
      {!isReady && (
        <div className="card p-5">
          <h3 className="mb-3 font-bold">خطوات التهيئة (مرة واحدة)</h3>
          <ol className="list-decimal space-y-3 pr-5 text-sm text-stone-300">
            <li>
              افتح محرر SQL في Supabase:
              <a
                href="https://supabase.com/dashboard/project/_/sql/new"
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1 text-gold-300 hover:underline"
              >
                <ExternalLink size={14} /> فتح SQL Editor
              </a>
            </li>
            <li>حمّل أو انسخ ملف التهيئة الكامل بالزرين أدناه.</li>
            <li>الصقه في المحرر واضغط <strong>Run</strong>.</li>
            <li>ارجع لهذه الصفحة واضغط "إعادة الفحص".</li>
          </ol>

          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={loadAndCopy} className="btn-gold !py-2 text-sm">
              <Copy size={16} /> {copied ? 'تم النسخ ✓' : 'نسخ SQL'}
            </button>
            <button onClick={download} className="btn-ghost !py-2 text-sm">
              <Download size={16} /> تحميل الملف
            </button>
          </div>

          {sql && (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs text-stone-500">معاينة SQL</summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-ink-950 p-3 text-[10px] text-stone-400" dir="ltr">
                {sql.slice(0, 4000)}...
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
