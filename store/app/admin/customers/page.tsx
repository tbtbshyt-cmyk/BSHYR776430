'use client';

import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Loader2, Users, Phone, Shield } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  role: string;
  created_at: string;
}

const ROLE_LABEL: Record<string, string> = {
  customer: 'عميل',
  admin: 'مسؤول',
  manager: 'مدير',
  delivery: 'توصيل',
};

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      supabase
        .from('profiles')
        .select('id, full_name, phone, role, created_at')
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setCustomers(data as Customer[]);
          setLoading(false);
        });
    } else {
      // بيانات تجريبية للعرض
      setCustomers([
        { id: '1', full_name: 'عميل تجريبي', phone: '967777100001', role: 'customer', created_at: new Date().toISOString() },
        { id: '2', full_name: 'أحمد العمري', phone: '967777100002', role: 'customer', created_at: new Date().toISOString() },
        { id: '3', full_name: 'محمد الصبري', phone: '967777100003', role: 'customer', created_at: new Date().toISOString() },
      ]);
      setLoading(false);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-black">العملاء والمستخدمون</h2>
        <p className="text-sm text-stone-400">إدارة حسابات العملاء والموظفين</p>
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-gold-400" />
          </div>
        ) : (
          <table className="w-full text-right text-sm">
            <thead className="text-xs text-stone-500">
              <tr className="border-b border-white/5">
                <th className="py-3 pl-4 pr-4">الاسم</th>
                <th className="py-3 pl-4">الهاتف</th>
                <th className="py-3 pl-4">الدور</th>
                <th className="py-3">تاريخ الانضمام</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                  <td className="py-3 pl-4 pr-4">
                    <span className="flex items-center gap-2 font-semibold">
                      <Users size={14} className="text-gold-400" />
                      {c.full_name}
                    </span>
                  </td>
                  <td className="py-3 pl-4" dir="ltr">
                    <span className="flex items-center justify-end gap-2">
                      <Phone size={13} className="text-stone-500" />
                      {c.phone}
                    </span>
                  </td>
                  <td className="py-3 pl-4">
                    <span
                      className={`badge ${
                        c.role === 'customer'
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-gold-400/15 text-gold-300'
                      }`}
                    >
                      {c.role !== 'customer' && <Shield size={12} />}
                      {ROLE_LABEL[c.role] ?? c.role}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-stone-500">
                    {new Date(c.created_at).toLocaleDateString('ar-YE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
