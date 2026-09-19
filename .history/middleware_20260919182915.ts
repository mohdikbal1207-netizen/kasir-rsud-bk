import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Membuat klien Supabase khusus untuk lingkungan Server/Middleware
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

  // Validasi sesi pengguna secara aman dari server
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  
  // Daftar rute yang dilindungi
  const isAdminPath = path.startsWith('/admin');
  const isKasirPath = path.startsWith('/kasir');
  const isManajemenPath = path.startsWith('/manajemen');
  const isProtectedPath = isAdminPath || isKasirPath || isManajemenPath;

  // 1. Jika mencoba akses rute khusus tanpa login, lempar ke /login
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Proteksi Lanjutan: Validasi Hak Akses Role di Tingkat Server (Middleware)
  if (isProtectedPath && user) {
    const userEmail = user.email?.toLowerCase().trim() || '';

    // Ambil role dari tabel users berdasarkan email atau id
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('email', userEmail)
      .maybeSingle();

    const userRole = (userData?.role || '').toLowerCase().trim();

    // Jalur Khusus Super Admin
    const isSuperAdmin = userEmail === 'mohdikbal1207@gmail.com';

    // Cek jika kasir/staf mencoba masuk ke rute /admin
    if (isAdminPath && userRole !== 'admin' && !isSuperAdmin) {
      const redirectUrl = new URL(userRole === 'kasir' ? '/kasir' : '/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Cek jika admin mencoba masuk ke rute /kasir (opsional, jika ingin diarahkan balik ke admin)
    if (isKasirPath && userRole === 'admin') {
      // Izinkan admin membuka kasir jika perlu, atau uncomment baris di bawah jika mau dibatasi:
      // return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return supabaseResponse;
}

// Konfigurasi rute yang dipantau oleh middleware
export const config = {
  matcher: [
    '/admin/:path*', 
    '/kasir/:path*', 
    '/manajemen/:path*'
  ],
};