'use client';

import { useState } from 'react';
import { ContentLayout } from '@/components/ContentLayout';
import { Phone, MapPin, Clock, Mail, Send, Loader2, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // في الإنتاج: استبدل هذا باستدعاء API/Server Action لحفظ الرسالة.
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setName('');
      setPhone('');
      setMessage('');
    }, 800);
  };

  return (
    <ContentLayout
      title="تواصل معنا"
      intro="يسعدنا تواصلكم معنا في أي وقت. املأ النموذج أو استخدم إحدى القنوات التالية وسنرد عليك في أقرب وقت."
    >
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Phone, label: 'الهاتف', value: '+967 777 000 001' },
          { icon: Mail, label: 'البريد', value: 'info@abubashar.ye' },
          { icon: Clock, label: 'أوقات العمل', value: 'السبت-الخميس 9ص - 10م' },
        ].map((c) => (
          <div key={c.label} className="card p-5 text-center">
            <c.icon className="mx-auto text-gold-400" size={24} />
            <p className="mt-3 text-sm font-semibold text-gold-300">{c.label}</p>
            <p className="mt-1 text-sm text-stone-300" dir="ltr">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <p className="flex items-center gap-2 text-stone-300">
          <MapPin size={18} className="text-gold-400" /> صنعاء - شارع الستين
        </p>
      </div>

      {sent ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-300">
          <CheckCircle2 />
          <div>
            <p className="font-bold">تم إرسال رسالتك بنجاح</p>
            <p className="text-sm">سنتواصل معك في أقرب وقت ممكن.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">الاسم</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required className="input-field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold">رقم الهاتف</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" required className="input-field text-right" />
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-semibold">رسالتك</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={5}
              className="input-field resize-none"
              placeholder="اكتب استفسارك أو ملاحظاتك هنا..."
            />
          </label>
          <button type="submit" disabled={sending} className="btn-gold">
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            إرسال الرسالة
          </button>
        </form>
      )}
    </ContentLayout>
  );
}
