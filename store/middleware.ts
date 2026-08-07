import { NextResponse, type NextRequest } from 'next/server';

const STAFF_ROUTES = ['/admin', '/delivery'];
const CUSTOMER_ROUTES = ['/account'];
const AUTH_ROUTES = ['/otp', '/login'];

function matchRoute(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(r + '/'));
}

/**
 * فك تشفير جزء الحمولة (payload) من JWT بشكل آمن دون مكتبات خارجية.
 * لا يتحقق من التوقيع هنا — التحقق الفعلي للجلسة يتم عند استعلام قاعدة البيانات
 * عبر RLS باستخدام ملف تعريف الارتباط المرسل إلى Supabase. الغرض من الـ middleware
 * هو الحماية الأولية للواجهات وتوجيه الأدوار فقط.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json =
      typeof atob === 'function'
        ? atob(part.replace(/-/g, '+').replace(/_/g, '/'))
        : Buffer.from(part, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getSupabaseSession(request: NextRequest): {
  isAuthed: boolean;
  staffRole?: string;
} {
  // يخزّن Supabase الجلسة في كوكي باسم مشابه لـ sb-<ref>-auth-token
  const tokenCookie = request.cookies
    .getAll()
    .find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));

  if (!tokenCookie) return { isAuthed: false };

  const payload = decodeJwtPayload(tokenCookie.value);
  if (!payload) return { isAuthed: false };

  const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  if (exp && exp < Date.now()) return { isAuthed: false };

  // دور الموظف يُخزَّن في app_metadata.staff_role (راجع abubashar_v4_role_metadata_sync.sql)
  const appMeta = (payload.app_metadata ?? {}) as Record<string, unknown>;
  const staffRole =
    typeof appMeta.staff_role === 'string' ? appMeta.staff_role : undefined;

  return { isAuthed: true, staffRole };
}

/**
 * حماية مركزية للمسارات على حافة الشبكة (Edge Middleware).
 * لا نستورد @supabase/ssr هنا لتجنّب استخدام Node APIs غير المدعومة في Edge Runtime
 * (مثل process.version) التي تتسبب بفشل البناء على Netlify.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // الوضع التجريبي (بدون مفاتيح): نترك الحماية لمكوّنات العميل.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next();
  }

  const { isAuthed, staffRole } = getSupabaseSession(request);

  const isStaffRoute = matchRoute(pathname, STAFF_ROUTES);
  const isCustomerRoute = matchRoute(pathname, CUSTOMER_ROUTES);
  const isAuthRoute = matchRoute(pathname, AUTH_ROUTES);

  // غير مسجّل يحاول دخول مسار محمي
  if (!isAuthed && (isStaffRoute || isCustomerRoute)) {
    const redirectTo = encodeURIComponent(pathname);
    const loginPath = isStaffRoute
      ? `/login?next=${redirectTo}`
      : `/otp?next=${redirectTo}`;
    return NextResponse.redirect(new URL(loginPath, request.url));
  }

  // مسجّل مسبقاً يحاول دخول صفحة مصادقة
  if (isAuthed && isAuthRoute) {
    const target =
      staffRole === 'delivery'
        ? '/delivery'
        : staffRole === 'admin' || staffRole === 'manager'
          ? '/admin'
          : '/account';
    return NextResponse.redirect(new URL(target, request.url));
  }

  // حماية الأدوار لمسارات الموظفين
  if (isAuthed && isStaffRoute) {
    if (!staffRole) {
      return NextResponse.redirect(new URL('/account', request.url));
    }
    if (
      (pathname === '/admin' || pathname.startsWith('/admin/')) &&
      staffRole === 'delivery'
    ) {
      return NextResponse.redirect(new URL('/delivery', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/account/:path*', '/admin/:path*', '/delivery/:path*', '/otp', '/login'],
};
