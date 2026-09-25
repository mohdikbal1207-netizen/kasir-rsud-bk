import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// === CACHE IN-MEMORY UNTUK MENGURANGI EGRESS DATABASE (TTL 30 Detik) ===
let maintenanceCache: {
  is_active: boolean;
  allowed_emails: string[];
  timestamp: number;
} | null = null;
const MAINTENANCE_CACHE_TTL = 30 * 1000; 

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const path = request.nextUrl.pathname;
  const isStaticAsset = path.startsWith('/_next') || path.includes('.');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  // ================= FITUR 1: AUTO-IP BLACKLISTING & BRUTE-FORCE PROTECTION =================
  // [OPTIMASI EGRESS]: Pengecekan IP dibatasi hanya pada rute login atau API auth untuk menghemat bandwidth
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  if (path === '/login' || path.startsWith('/api/auth')) {
    try {
      const dbClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: ipData } = await dbClient
        .from('ip_security_logs')
        .select('is_blacklisted, blacklisted_until')
        .eq('ip_address', clientIp)
        .maybeSingle();

      if (ipData?.is_blacklisted) {
        if (ipData.blacklisted_until && new Date(ipData.blacklisted_until) > new Date()) {
          return new NextResponse(
            'Access Denied: Alamat IP Anda telah diblokir sementara karena terdeteksi aktivitas percobaan login mencurigakan (Brute-Force Protection). Silakan hubungi IT Coordinator RSUD Bukit Kerman.',
            { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
          );
        }
      }
    } catch (err) {
      console.error('Middleware IP Security Check Error:', err);
    }
  }
  // =========================================================================================

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  // Re-evaluate session & user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminPath = path.startsWith('/admin');
  const isKasirPath = path.startsWith('/kasir');
  const isManajemenPath = path.startsWith('/manajemen');
  const isProtectedPath = isAdminPath || isKasirPath || isManajemenPath;

  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'mohdikbal1207@gmail.com';

  // ================= VALIDASI REAL-TIME FORCE LOGOUT / SESSION REVOCATION =================
  if (user && isProtectedPath) {
    try {
      const dbClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: sessionDataList } = await dbClient
        .from('user_sessions')
        .select('is_active')
        .eq('user_id', user.id)
        .order('login_at', { ascending: false })
        .limit(1);

      const sessionData = sessionDataList && sessionDataList.length > 0 ? sessionDataList[0] : null;

      if (sessionData && sessionData.is_active === false) {
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('reason', 'force_logout');
        return NextResponse.redirect(loginUrl);
      }
    } catch (sessionErr) {
      console.error('Middleware Session Revocation Check Error:', sessionErr);
    }
  }
  // =======================================================================================

  // ================= PROTEKSI MAINTENANCE MODE (DENGAN CACHE MEMORI) =================
  const isMaintenancePage = path === '/maintenance';
  let maintenanceConfig = { is_active: false, allowed_emails: ['mohdikbal1207@gmail.com'] };

  const now = Date.now();
  // Gunakan cache memori jika masih dalam rentang waktu 30 detik untuk menghentikan spam query database
  if (maintenanceCache && now - maintenanceCache.timestamp < MAINTENANCE_CACHE_TTL) {
    maintenanceConfig = {
      is_active: maintenanceCache.is_active,
      allowed_emails: maintenanceCache.allowed_emails,
    };
  } else {
    try {
      const dbClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: maintenanceData } = await dbClient
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (maintenanceData?.value) {
        maintenanceConfig = maintenanceData.value;
      }
      maintenanceCache = {
        is_active: Boolean(maintenanceConfig.is_active),
        allowed_emails: Array.isArray(maintenanceConfig.allowed_emails) ? maintenanceConfig.allowed_emails : ['mohdikbal1207@gmail.com'],
        timestamp: now,
      };
    } catch (mErr) {
      console.error('Maintenance Check Error:', mErr);
    }
  }

  const isMaintenanceActive = Boolean(maintenanceConfig.is_active);
  const allowedEmails: string[] = Array.isArray(maintenanceConfig.allowed_emails) 
    ? maintenanceConfig.allowed_emails.map((e: string) => e.toLowerCase().trim()) 
    : ['mohdikbal1207@gmail.com'];

  const isBypassedUser = isSuperAdmin || allowedEmails.includes(userEmail);

  if (isMaintenanceActive && !isBypassedUser && !isMaintenancePage && !isStaticAsset) {
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  if (!isMaintenanceActive && isMaintenancePage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  // =======================================================================================

  // 1. Jika rute dilindungi tapi tidak ada user sama sekali
  if (isProtectedPath && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Jika sudah terautentikasi dan berada di /login, arahkan ke dashboard masing-masing role
  if (path === '/login' && user) {
    let targetPath = '/admin';
    if (!isSuperAdmin) {
      const dbClient = createClient(supabaseUrl, supabaseAnonKey);
      const { data: userData } = await dbClient
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = userData?.role?.toLowerCase() || 'kasir';
      if (role === 'kasir') targetPath = '/kasir';
      if (role === 'manajemen') targetPath = '/manajemen';
    }

    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};