'use client';

import { supabase, isSupabaseConfigured } from './supabase';
import type { Order } from './types';

const LS_ORDERS = 'abubashar-demo-orders';

function readDemo(): Order[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_ORDERS) || '[]');
  } catch {
    return [];
  }
}
function writeDemo(orders: Order[]) {
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
  window.dispatchEvent(new Event('abubashar-orders'));
}

// الطلبات المتاحة: غير مسندة وحالتها pending/processing
export async function fetchAvailableOrders(): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .is('assigned_to', null)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }
  return readDemo().filter(
    (o) => !o.assigned_to && ['pending', 'processing'].includes(o.status),
  );
}

// الطلبات المسندة لمندوب معيّن
export async function fetchMyOrders(deliveryUserId: string): Promise<Order[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('assigned_to', deliveryUserId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  }
  return readDemo().filter((o) => o.assigned_to === deliveryUserId);
}

export async function assignToMe(orderId: string, deliveryUserId: string) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await (supabase as any).rpc('assign_order_to_me', {
      p_order_id: orderId,
    });
    if (error) throw error;
    return data;
  }
  const orders = readDemo();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx >= 0 && !orders[idx].assigned_to) {
    orders[idx].assigned_to = deliveryUserId;
    if (orders[idx].status === 'pending') orders[idx].status = 'processing';
    writeDemo(orders);
  }
}

export async function markShipped(orderId: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await (supabase as any).rpc('update_order_status', {
      p_order_id: orderId,
      p_status: 'shipped',
    });
    if (error) throw error;
    return;
  }
  const orders = readDemo();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx >= 0) {
    orders[idx].status = 'shipped';
    writeDemo(orders);
  }
}

export async function markDelivered(orderId: string) {
  if (isSupabaseConfigured && supabase) {
    const { error } = await (supabase as any).rpc('mark_delivered', { p_order_id: orderId });
    if (error) throw error;
    return;
  }
  const orders = readDemo();
  const idx = orders.findIndex((o) => o.id === orderId);
  if (idx >= 0) {
    orders[idx].status = 'delivered';
    orders[idx].delivered_at = new Date().toISOString();
    writeDemo(orders);
  }
}
