'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase, isSupabaseConfigured } from './supabase';
import type { Role } from './types';

export interface SessionUser {
  id: string;
  full_name: string;
  phone: string;
  role: Role;
}

  interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  init: () => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  // مصادقة العميل عبر OTP (رسالة نصية)
  requestOtp: (phone: string, fullName?: string) => Promise<{ devCode?: string }>;
  verifyOtp: (phone: string, token: string, fullName?: string) => Promise<void>;
}

const DEMO_CODE = '123456';

// حسابات الموظفين في الوضع التجريبي
const DEMO_STAFF: Record<string, { password: string; user: SessionUser }> = {
  '967777000001': {
    password: 'Abubashar@2026',
    user: { id: 'demo-admin', full_name: 'مدير المتجر', phone: '967777000001', role: 'admin' },
  },
  '967777000002': {
    password: 'Abubashar@2026',
    user: { id: 'demo-manager', full_name: 'مدير العمليات', phone: '967777000002', role: 'manager' },
  },
  '967777000003': {
    password: 'Abubashar@2026',
    user: { id: 'demo-delivery', full_name: 'عامل التوصيل', phone: '967777000003', role: 'delivery' },
  },
};

const normalize = (p: string) => p.replace(/\s+/g, '').replace(/^0/, '967');

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,

      init: async () => {
        if (isSupabaseConfigured && supabase) {
          const { data } = await supabase.auth.getUser();
          if (data.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, phone, role')
              .eq('id', data.user.id)
              .single();
            if (profile) set({ user: profile as SessionUser });
            else set({ user: null });
          }
        }
      },

      login: async (phone, password) => {
        const cleanPhone = normalize(phone);
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.signInWithPassword({
            phone: cleanPhone,
            password,
          });
          if (error) throw error;
          const { data: ud } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, phone, role')
            .eq('id', ud.user!.id)
            .single();
          set({ user: profile as unknown as SessionUser });
          return;
        }
        // الوضع التجريبي (للموظفين)
        const acc = DEMO_STAFF[cleanPhone];
        if (!acc || acc.password !== password) {
          throw new Error('رقم الهاتف أو كلمة المرور غير صحيحة');
        }
        set({ user: acc.user });
      },

      requestOtp: async (phone, fullName?) => {
        const cleanPhone = normalize(phone);
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.signInWithOtp({
            phone: cleanPhone,
            options: fullName ? { data: { full_name: fullName } } : undefined,
          });
          if (error) throw error;
          return {};
        }
        // الوضع التجريبي: الرمز ثابت للاختبار
        return { devCode: DEMO_CODE };
      },

      verifyOtp: async (phone, token, fullName?) => {
        const cleanPhone = normalize(phone);
        if (isSupabaseConfigured && supabase) {
          const { error } = await supabase.auth.verifyOtp({
            phone: cleanPhone,
            token,
            type: 'sms',
          });
          if (error) throw error;
          const { data: ud } = await supabase.auth.getUser();
          // إذا لم يُخزَّن الاسم أثناء الإرسال، نخزنه بعد التحقق (لتحديث الملف الشخصي)
          if (ud.user && fullName && !ud.user.user_metadata?.full_name) {
            await supabase.auth.updateUser({ data: { full_name: fullName } });
          }
          // نتأكد من جلب الملف الشخصي (وقد نعيد المحاولة لمرة واحدة لتفادي سباق المحفّز)
          let profile: any = null;
          for (let attempt = 0; attempt < 3 && !profile; attempt++) {
            const res = await supabase
              .from('profiles')
              .select('id, full_name, phone, role')
              .eq('id', ud.user!.id)
              .maybeSingle();
            profile = res.data;
            if (!profile) await new Promise((r) => setTimeout(r, 250));
          }
          if (profile) set({ user: profile as SessionUser });
          return;
        }
        // الوضع التجريبي
        if (token.trim() !== DEMO_CODE) {
          throw new Error('رمز التحقق غير صحيح');
        }
        set({
          user: {
            id: 'cust-' + cleanPhone,
            full_name: fullName?.trim() || 'عميل',
            phone: cleanPhone,
            role: 'customer',
          },
        });
      },

      logout: async () => {
        if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        set({ user: null });
      },
    }),
    { name: 'abubashar-auth' },
  ),
);
