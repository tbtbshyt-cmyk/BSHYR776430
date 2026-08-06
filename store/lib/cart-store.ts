'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from './types';

export interface CartLine {
  product_id: string;
  title_ar: string;
  price: number;
  compare_at_price: number | null;
  image: string;
  size: string;
  quantity: number;
}

interface CartState {
  lines: CartLine[];
  add: (product: Product, size: string, quantity?: number) => void;
  updateQty: (product_id: string, size: string, quantity: number) => void;
  remove: (product_id: string, size: string) => void;
  clear: () => void;
  totalCount: () => number;
  subtotal: () => number;
}

const keyOf = (id: string, size: string) => `${id}::${size}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (product, size, quantity = 1) =>
        set((state) => {
          const k = keyOf(product.id, size);
          const existing = state.lines.find(
            (l) => keyOf(l.product_id, l.size) === k,
          );
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                keyOf(l.product_id, l.size) === k
                  ? { ...l, quantity: Math.min(l.quantity + quantity, 99) }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...state.lines,
              {
                product_id: product.id,
                title_ar: product.title_ar,
                price: product.price,
                compare_at_price: product.compare_at_price,
                image: product.images[0],
                size,
                quantity,
              },
            ],
          };
        }),
      updateQty: (product_id, size, quantity) =>
        set((state) => ({
          lines: state.lines
            .map((l) =>
              keyOf(l.product_id, l.size) === keyOf(product_id, size)
                ? { ...l, quantity: Math.max(1, Math.min(99, quantity)) }
                : l,
            )
            .filter((l) => l.quantity > 0),
        })),
      remove: (product_id, size) =>
        set((state) => ({
          lines: state.lines.filter(
            (l) => keyOf(l.product_id, l.size) !== keyOf(product_id, size),
          ),
        })),
      clear: () => set({ lines: [] }),
      totalCount: () => get().lines.reduce((s, l) => s + l.quantity, 0),
      subtotal: () => get().lines.reduce((s, l) => s + l.price * l.quantity, 0),
    }),
    { name: 'abubashar-cart' },
  ),
);
