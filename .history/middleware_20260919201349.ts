import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // ================= FITUR BARU: AUTO-IP BLACKLISTING & BRUTE-FORCE PROTECTION =================
  const forwardedFor = request.headers.get('x-forwarded-for');
  const clientIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
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
  // =========================================================================================

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

  // Re-evaluate session & cookie
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const isAdminPath = path.startsWith('/admin');
  const isKasirPath = path.startsWith('/kasir');
  const isManajemenPath = path.startsWith('/manajemen');
  const isProtectedPath = isAdminPath || isKasirPath || isManajemenPath;

  // TOLERANSI BYPASS: Jika user adalah super admin utama, jangan dicegat ketat
  const userEmail = (user?.email || '').toLowerCase().trim();
  const isSuperAdmin = userEmail === 'mohdikbal1207@gmail.com';

  // ================= FITUR BARU: VALIDASI REAL-TIME FORCE LOGOUT / SESSION REVOCATION =================
  if (user && isProtectedPath) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const dbClient = createClient(supabaseUrl, supabaseAnonKey);

      const { data: sessionData, error: sessionQueryError } = await dbClient
        .from('user_sessions')
        .select('is_active')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!sessionQueryError && sessionData && sessionData.is_active === false) {
        // Hapus auth session di cookie dan arahkan ke login dengan alasan force logout
        await supabase.auth.signOut();
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('reason', 'force_logout');
        return NextResponse.redirect(loginUrl);
      }
    } catch (sessionErr) {
      console.error('Middleware Session Revocation Check Error:', sessionErr);
    }
  }
  // ==================================================================================================

  // ================= PROTEKSI MAINTENANCE MODE =================
  const isMaintenancePage = path === '/maintenance';
  const isStaticAsset = path.startsWith('/_next') || path.includes('.');

  // Cek Status Maintenance dari Database secara Realtime
  const { data: maintenanceData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .maybeSingle();

  const maintenanceConfig = maintenanceData?.value || { is_active: false, allowed_emails: [] };
  const isMaintenanceActive = Boolean(maintenanceConfig.is_active);
  const allowedEmails: string[] = Array.isArray(maintenanceConfig.allowed_emails)