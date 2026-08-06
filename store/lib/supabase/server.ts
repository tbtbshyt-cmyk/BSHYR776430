import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

/**
 * عميل Supabase للاستخدام في مكوّنات الخادم و Route Handlers و Server Actions.
 * يقرأ ملفات تعريف الارتباط من الطلب ويكتبها في الاستجابة عبر واجهة Next.js.
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as any),
          );
        } catch {
          // يمكن تجاهل الخطأ في Server Components (لا يمكن تعديل الـ cookies).
        }
      },
    },
  });
}
