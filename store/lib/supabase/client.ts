'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/** عميل Supabase المستخدم في مكوّنات المتصفح (Client Components). */
export const createClient = () => {
  if (!isSupabaseConfigured) return null;
  return createBrowserClient<Database>(url!, anonKey!);
};

// نسخة وحيدة (singleton) للاستخدام المباشر في الكود الحالي
import { createBrowserClient as _cbc } from '@supabase/ssr';
export const supabase = isSupabaseConfigured ? _cbc<Database>(url!, anonKey!) : null;
