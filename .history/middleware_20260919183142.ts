import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Klien Supabase khusus untuk lingkungan Server/Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Validasi sesi pengguna aktif dari Supabase Auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAdminPath = path.startsWith('/admin');
  const isKasirPath = path.startsWith('/kasir');
  const isManajemenPath = path.startsWith('/manajemen');
  const isProtectedPath = isAdminPath || isKasirPath || isManajemenPath;

  // 1. Jika mencoba akses rute terlindung tanpa login, tendang ke /login
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika sudah terautentikasi dan berada di /login, langsung arahkan ke /admin
  if (path === '/login' && user) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return supabaseResponse;
}

// Konfigurasi matcher rute
export const config = {
  matcher: [
    '/admin/:path*', 
    '/kasir/:path*', 
    '/manajemen/:path*',
    '/login'
  ],
};