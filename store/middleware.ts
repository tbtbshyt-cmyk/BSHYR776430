import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

const STAFF_ROUTES = ['/admin', '/delivery'];
const CUSTOMER_ROUTES = ['/account'];
const AUTH_ROUTES = ['/otp', '/login'];

function matchRoute(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

/**
 * حماية مركزية للمسارات على الخادم (Edge Middleware):
 *  - العملاء فقط: /account
 *  - الموظفون (admin/manager/delivery): /admin, /delivery
 *  - إذا كان المستخدم مسجلاً يُمنع من دخول /otp و /login
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // بدون مفاتيح Supabase (وضع تجريبي) نتعامل مع الحماية في المتصفح فقط.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response = NextResponse.next({ request });
          response.cookies.set(name, value, options as any);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isStaffRoute = matchRoute(pathname, STAFF_ROUTES);
  const isCustomerRoute = matchRoute(pathname, CUSTOMER_ROUTES);
  const isAuthRoute = matchRoute(pathname, AUTH_ROUTES);

  // غير مسجّل يحاول دخول مسار محمي → توجيه حسب نوع المسار
  if (!user && (isStaffRoute || isCustomerRoute)) {
    const redirectTo = encodeURIComponent(pathname);
    const loginPath = isStaffRoute ? `/login?next=${redirectTo}` : `/otp?next=${redirectTo}`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // مسجّل مسبقاً يحاول دخول صفحة المصادقة → توجيه لمنطقته
  if (user && isAuthRoute) {
    const target = user.app_metadata?.staff_role === 'delivery' ? '/delivery'
      : ['admin', 'manager'].includes(user.app_metadata?.staff_role) ? '/admin'
      : '/account';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // حماية الأدوار لمسارات الموظفين.
  // الأدوار الحقيقية في جدول profiles (محمي بـ RLS)، لكننا نعكسها في app_metadata
  // عند الدخول لتكون متاحة في الـ Middleware دون استعلام قاعدة بيانات.
  if (user && isStaffRoute) {
    const staffRole = user.app_metadata?.staff_role;
    const isStaff =
      staffRole === 'admin' || staffRole === 'manager' || staffRole === 'delivery';

    if (!isStaff) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
    // /admin للإدارة فقط (وليس عمال التوصيل)
    if (
      (pathname === '/admin' || pathname.startsWith('/admin/')) &&
      staffRole === 'delivery'
    ) {
      return NextResponse.redirect(new URL('/delivery', request.url));
    }
  }

  return response;
}

export const config = {
  // المسارات التي يشملها الـ middleware (نستثني الأصول الثابتة و API العام)
  matcher: ['/account/:path*', '/admin/:path*', '/delivery/:path*', '/otp', '/login'],
};
