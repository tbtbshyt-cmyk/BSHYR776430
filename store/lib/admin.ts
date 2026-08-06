'use client';

import { supabase, isSupabaseConfigured } from './supabase';
import type { Order, OrderStatus, Transaction, Product, Category } from './types';
import { mockProducts, mockCategories } from './mock-data';

// محرّك إداري للوحة التحكم. في الوضع غير المتصل يقدّم محاكاة في الذاكرة
// عبر localStorage لتبقى التجربة كاملة بدون قاعدة بيانات.

const LS_ORDERS = 'abubashar-demo-orders';

interface DemoOrder extends Order {
  items: NonNullable<Order['items']>;
  payments: NonNullable<Order['payments']>;
}

function loadDemoOrders(): DemoOrder[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  } catch {
    return [];
  }
}
function saveDemoOrders(orders: DemoOrder[]) {
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('abubashar-orders'));
}

export async function fetchDashboardStats() {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('admin_dashboard_stats');
    if (error) throw error;
    return data as any;
  }
  const orders = loadDemoOrders();
  const byStatus = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});
  const revenue = orders
    .filter((o) => o.status === 'delivered')
    .reduce((s, o) => s + Number(o.total_amount), 0);
  const pendingRevenue = orders
    .filter((o) => ['pending', 'processing', 'shipped'].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0);
  return {
    orders_total: orders.length,
    orders_by_status: byStatus,
    revenue_delivered: revenue,
    revenue_pending: pendingRevenue,
    pending_deposits: orders.filter((o) => !o.deposit_paid && ['pending', 'processing'].includes(o.status)).length,
    products_total: mockProducts.length,
    low_stock_count: mockProducts.filter((p) => p.stock_quantity < 5).length,
    customers_total: 128 + orders.length,
    staff_total: 3,
  };
}

export async function fetchOrders(status?: OrderStatus | 'all'): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (status && status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    return data as Order[];
  }
  let orders = loadDemoOrders();
  if (status && status !== 'all') orders = orders.filter((o) => o.status === status);
  return orders;
}

export async function fetchOrderFull(id: string): Promise<DemoOrder | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('get_order_details', { p_order_id: id });
    if (error) throw error;
    if (!data) return null;
    return { ...data.order, items: data.items, payments: data.payments } as DemoOrder;
  }
  return loadDemoOrders().find((o) => o.id === id) ?? null;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('update_order_status', {
      p_order_id: id,
      p_status: status,
    });
    if (error) throw error;
    return data;
  }
  const orders = loadDemoOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx >= 0) {
    orders[idx].status = status;
    if (status === 'delivered') orders[idx].delivered_at = new Date().toISOString();
    if (status === 'cancelled') orders[idx].cancelled_at = new Date().toISOString();
    saveDemoOrders(orders);
  }
}

export async function assignToMe(id: string, deliveryUserId: string) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('assign_order_to_me', { p_order_id: id });
    if (error) throw error;
    return data;
  }
  const orders = loadDemoOrders();
  const idx = orders.findIndex((o) => o.id === id);
  if (idx >= 0) {
    orders[idx].assigned_to = deliveryUserId;
    if (orders[idx].status === 'pending') orders[idx].status = 'processing';
    saveDemoOrders(orders);
  }
}

export async function markDelivered(id: string) {
  return updateOrderStatus(id, 'delivered');
}

export async function confirmPayment(txId: string, status: 'paid' | 'failed' | 'refunded') {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('confirm_payment', {
      p_tx_id: txId,
      p_status: status,
    });
    if (error) throw error;
    return data;
  }
  const orders = loadDemoOrders();
  for (const o of orders) {
    const tx = o.payments?.find((p) => p.id === txId);
    if (tx) {
      tx.status = status;
      if (status === 'paid') {
        tx.paid_at = new Date().toISOString();
        o.deposit_paid = true;
      }
    }
  }
  saveDemoOrders(orders);
}

export async function fetchPendingPayments(): Promise<{ order: Order; payment: Transaction }[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, order:orders(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as any[]).map((r) => ({ order: r.order, payment: r }));
  }
  const result: { order: Order; payment: Transaction }[] = [];
  loadDemoOrders().forEach((o) => {
    o.payments
      ?.filter((p) => p.status === 'pending')
      .forEach((p) => result.push({ order: o, payment: p }));
  });
  return result;
}

export async function fetchProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Product[];
  }
  return mockProducts;
}

export async function fetchCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('categories').select('*').order('sort_order');
    if (error) throw error;
    return data as Category[];
  }
  return mockCategories;
}

// تسجيل طلب تجريبي أنشأه العميل من صفحة الإتمام (في الوضع المحلي)
export function registerDemoOrder(order: DemoOrder) {
  const orders = loadDemoOrders();
  if (orders.some((o) => o.id === order.id)) return;
  saveDemoOrders([order, ...orders]);
}

export function getDemoOrders() {
  return loadDemoOrders();
}

// إدارة المنتجات (CRUD) ----------------------------------------------------
const LS_PRODUCTS = 'abubashar-demo-products';

export async function createProduct(input: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .insert(input as any)
      .select()
      .single();
    if (error) throw error;
    return data as Product;
  }
  const list = readDemoProducts();
  const product: Product = {
    id: 'p-' + Date.now(),
    category_id: input.category_id ?? null,
    title_ar: input.title_ar ?? 'منتج جديد',
    description_ar: input.description_ar ?? null,
    price: input.price ?? 0,
    compare_at_price: input.compare_at_price ?? null,
    stock_quantity: input.stock_quantity ?? 0,
    images: input.images ?? ['https://placehold.co/800x1000/0f0f0f/c9a24b?text=New'],
    sizes: input.sizes ?? ['one-size'],
    is_featured: input.is_featured ?? false,
    is_active: input.is_active ?? true,
    barcode: input.barcode ?? null,
  } as Product;
  writeDemoProducts([product, ...list]);
  return product;
}

export async function updateProduct(id: string, patch: Partial<Product>): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await (supabase as any).from('products').update(patch).eq('id', id);
    if (error) throw error;
    return;
  }
  const list = readDemoProducts();
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    writeDemoProducts(list);
  }
}

export async function deleteProduct(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeDemoProducts(readDemoProducts().filter((p) => p.id !== id));
}

export async function adminFetchProducts(): Promise<Product[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Product[];
  }
  const local = readDemoProducts();
  const ids = new Set(local.map((p) => p.id));
  return [...local, ...mockProducts.filter((p) => !ids.has(p.id))];
}

function readDemoProducts(): Product[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_PRODUCTS) || '[]');
  } catch {
    return [];
  }
}
function writeDemoProducts(products: Product[]) {
  localStorage.setItem(LS_PRODUCTS, JSON.stringify(products));
}
