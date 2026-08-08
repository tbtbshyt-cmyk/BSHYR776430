'use client';

import type { Banner, Category, Product, Order, CreateOrderInput } from './types';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  getDemoBanners,
  getDemoCategories,
  getDemoProducts,
  applyCampaignsToProducts,
} from './demo-store';

// طبقة بيانات موحّدة: تتصل بـ Supabase إن كانت مضبوطة، وإلا تستخدم البيانات المحلية.

export async function getBanners(): Promise<Banner[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as Banner[]) ?? [];
  }
  return getDemoBanners();
}

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as Category[]) ?? [];
  }
  return getDemoCategories();
}

export async function getProducts(opts?: {
  categorySlug?: string;
  featured?: boolean;
  query?: string;
}): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    let q: any = supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (opts?.featured) q = q.eq('is_featured', true);
    if (opts?.query) q = q.ilike('title_ar', `%${opts.query}%`);
    if (opts?.categorySlug) {
      const { data: cat } = await (supabase as any)
        .from('categories')
        .select('id')
        .eq('slug', opts.categorySlug)
        .single();
      if (cat) q = q.eq('category_id', (cat as { id: string }).id);
    }

    const { data, error } = await q;
    if (error) throw error;
    return (data as Product[]) ?? [];
  }

  let list = getDemoProducts();
  if (opts?.featured) list = list.filter((p) => p.is_featured);
  if (opts?.query) {
    const q = opts.query.trim();
    list = list.filter((p) => p.title_ar.includes(q));
  }
  if (opts?.categorySlug) {
    const allCats = getDemoCategories();
    const cat = allCats.find((c) => c.slug === opts!.categorySlug);
    if (cat) {
      const allowed = new Set([cat.id, ...allCats.filter((c) => c.parent_id === cat.id).map((c) => c.id)]);
      list = list.filter((p) => allowed.has(p.category_id ?? ''));
    }
  }
  // تطبيق خصومات الحملات النشطة (للعرض في المتجر فقط)
  list = applyCampaignsToProducts(list);
  return list;
}

export async function getProduct(id: string): Promise<Product | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Product;
  }
  return getDemoProducts().find((p) => p.id === id) ?? null;
}

export async function getMyOrders(): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data: orders, error } = await (supabase as any)
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (orders as Order[]) ?? [];
  }
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('abubashar-demo-orders') || '[]';
      return JSON.parse(raw) as Order[];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getOrder(id: string): Promise<Order | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('get_order_details', {
      p_order_id: id,
    });
    if (error) throw error;
    if (!data) return null;
    const d = data as any;
    return {
      ...d.order,
      items: d.items ?? [],
      payments: d.payments ?? [],
    } as Order;
  }
  // محاكاة محلية للتتبع: نقرأ الطلب من localStorage إن وُجد
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('abubashar-demo-orders') || '[]';
      const orders = JSON.parse(raw);
      const found = orders.find((o: any) => o.id === id);
      if (found) return found as Order;
    } catch {
      /* ignore */
    }
  }
  return null;
}

export async function createOrderAtomic(
  input: CreateOrderInput,
): Promise<{ id: string; order_number: number; total_amount: number; status: string }> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('create_order_atomic', {
      p_shipping_address: input.shipping_address,
      p_note: input.note ?? null,
      p_lat: input.lat ?? null,
      p_lng: input.lng ?? null,
      p_items: input.items,
      p_clear_cart: true,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    return row as any;
  }

  // محاكاة محلية (للعرض بدون قاعدة بيانات)
  await new Promise((r) => setTimeout(r, 900));
  const total = input.items.reduce((sum, it) => {
    const p = getDemoProducts().find((x) => x.id === it.product_id);
    return sum + (p ? p.price * it.quantity : 0);
  }, 0);
  const orderId = 'demo-' + Math.random().toString(36).slice(2, 10);
  const orderNum = Math.floor(100000 + Math.random() * 900000);
  const newOrder = {
    id: orderId,
    order_number: orderNum,
    customer_id: 'demo-customer',
    total_amount: total,
    status: 'pending' as const,
    shipping_address: input.shipping_address,
    gps_coordinates:
      input.lat != null && input.lng != null ? { x: input.lng, y: input.lat } : null,
    deposit_paid: false,
    assigned_to: null,
    note: input.note ?? null,
    created_at: new Date().toISOString(),
    items: input.items.map((it) => {
      const p = getDemoProducts().find((x) => x.id === it.product_id)!;
      return {
        product_id: it.product_id,
        title_ar: p.title_ar,
        unit_price: p.price,
        size: it.size,
        quantity: it.quantity,
      };
    }),
    payments: [],
  };
  try {
    const raw = localStorage.getItem('abubashar-demo-orders') || '[]';
    const existing = JSON.parse(raw);
    localStorage.setItem('abubashar-demo-orders', JSON.stringify([newOrder, ...existing]));
  } catch {
    /* ignore */
  }
  return {
    id: orderId,
    order_number: orderNum,
    total_amount: total,
    status: 'pending',
  };
}
