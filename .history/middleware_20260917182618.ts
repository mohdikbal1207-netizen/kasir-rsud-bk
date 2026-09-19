import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Deteksi token autentikasi dari cookie Supabase
  const token = request.cookies.get('sb-access-token')?.value || 
                request.cookies.get('supabase-auth-token')?.value;

  // Daftar rute yang dilindungi
  const isProtectedPath = 
    path.startsWith('/admin') || 
    path.startsWith('/kasir') || 
    path.startsWith('/manajemen');

  // Jika mencoba akses rute khusus tanpa token, tendang ke halaman /login
  if (isProtectedPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Konfigurasi rute mana saja yang dipantau oleh middleware
export const config = {
  matcher: [
    '/admin/:path*', 
    '/kasir/:path*', 
    '/manajemen/:path*'
  ],
};