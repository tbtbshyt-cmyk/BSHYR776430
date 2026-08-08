'use client';

import { persist } from 'zustand/middleware';
import { create } from 'zustand';

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  min_order?: number;
  expires_at?: string;
  usage_limit?: number;
  used_count: number;
  active: boolean;
}

interface WalletState {
  points: number;
  total_earned: number;
  last_checkin?: string;
  streak: number;
  coupons: Coupon[];
  appliedCoupon?: Coupon;
  discountAmount: number;

  addPoints: (n: number, reason?: string) => void;
  redeemPoints: (points: number) => boolean;
  dailyCheckIn: () => { earned: number; streak: number };
  addCoupon: (c: Coupon) => void;
  applyCoupon: (code: string, subtotal: number) => { ok: boolean; message: string };
  removeCoupon: () => void;
  recalcDiscount: (subtotal: number) => void;
}

const POINTS_PER_RIYAL = 0.05; // نصف نقطة لكل 10 ريال تقريباً (1 ريال = 0.05 نقطة)
const POINT_VALUE = 100; // كل نقطة = 100 ريال خصم

export const useWallet = create<WalletState>()(
  persist(
    (set, get) => ({
      points: 0,
      total_earned: 0,
      streak: 0,
      coupons: [
        // كوبون ترحيبي تجريبي
        {
          code: 'AHLAN10',
          type: 'percentage',
          value: 10,
          min_order: 5000,
          used_count: 0,
          active: true,
        },
      ],
      discountAmount: 0,

      addPoints: (n) =>
        set((s) => ({ points: s.points + n, total_earned: s.total_earned + n })),

      redeemPoints: (points) => {
        if (get().points < points) return false;
        set((s) => ({ points: s.points - points }));
        return true;
      },

      dailyCheckIn: () => {
        const today = new Date().toISOString().slice(0, 10);
        if (get().last_checkin === today) {
          return { earned: 0, streak: get().streak };
        }
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        const newStreak = get().last_checkin === yesterday ? get().streak + 1 : 1;
        // مكافأة تصاعدية حسب السلسلة (بحد أقصى 25 نقطة)
        const earned = Math.min(5 + newStreak, 25);
        set((s) => ({
          points: s.points + earned,
          total_earned: s.total_earned + earned,
          last_checkin: today,
          streak: newStreak,
        }));
        return { earned, streak: newStreak };
      },

      addCoupon: (c) => set((s) => ({ coupons: [...s.coupons, c] })),

      applyCoupon: (code, subtotal) => {
        const c = get().coupons.find(
          (x) => x.code.toLowerCase() === code.trim().toLowerCase() && x.active,
        );
        if (!c) return { ok: false, message: 'كود الخصم غير صحيح' };
        if (c.expires_at && new Date(c.expires_at) < new Date())
          return { ok: false, message: 'انتهت صلاحية الكود' };
        if (c.usage_limit && c.used_count >= c.usage_limit)
          return { ok: false, message: 'تم استخدام الكود بالكامل' };
        if (c.min_order && subtotal < c.min_order)
          return { ok: false, message: `الحد الأدنى للطلب ${c.min_order} ر.ي` };

        const discount =
          c.type === 'percentage'
            ? Math.round((subtotal * c.value) / 100)
            : Math.min(c.value, subtotal);
        set({ appliedCoupon: c, discountAmount: discount });
        return { ok: true, message: `تم تطبيق الخصم -${discount} ر.ي` };
      },

      removeCoupon: () => set({ appliedCoupon: undefined, discountAmount: 0 }),

      recalcDiscount: (subtotal) => {
        const c = get().appliedCoupon;
        if (!c) return set({ discountAmount: 0 });
        const discount =
          c.type === 'percentage'
            ? Math.round((subtotal * c.value) / 100)
            : Math.min(c.value, subtotal);
        set({ discountAmount: discount });
      },
    }),
    { name: 'abubashar-wallet' },
  ),
);

export const pointsToCurrency = (points: number) => points * POINT_VALUE;
export const currencyToPoints = (amount: number) => Math.floor(amount * POINTS_PER_RIYAL);
