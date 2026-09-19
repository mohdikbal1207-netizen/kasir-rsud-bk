import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Inisialisasi Supabase Admin menggunakan Service Role Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('FATAL: Kredensial Supabase Admin belum lengkap di environment variables.');
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || ''
);

// Regex sederhana untuk validasi format UUID standar
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    // 1. FITUR BARU: Tangkap IP Address & User Agent untuk Audit Trail Lanjutan
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown Client';

    let callerUser: any = null;

    // 2. Dual-Authentication Check: Pilihan 1 - Dari Authorization Header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data: { user: bearerUser } } = await supabaseAdmin.auth.getUser(token);
      if (bearerUser) {
        callerUser = bearerUser;
      }
    }

    // Dual-Authentication Check: Pilihan 2 - Fallback dari Server Cookie
    if (!callerUser) {
      const cookieStore = await cookies();
      const supabaseServer = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
              try {
                cookiesToSet.forEach(({ name, value, options }) =>
                  cookieStore.set(name, value, options)
                );
              } catch {}
            },
          },
        }
      );

      const { data: { user: cookieUser } } = await supabaseServer.auth.getUser();
      if (cookieUser) {
        callerUser = cookieUser;
      }
    }

    // Jika setelah pengecekan ganda pengguna pemanggil tetap tidak ditemukan, tolak
    if (!callerUser) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi autentikasi tidak ditemukan.' },
        { status: 401 }
      );
    }

    // 3. FITUR BARU: Fail-Safe Super Admin Bypass & Validasi Role
    const callerEmail = (callerUser.email || '').toLowerCase().trim();
    const isSuperAdminEmail = callerEmail === 'mohdikbal1207@gmail.com';

    if (!isSuperAdminEmail) {
      // Periksa apakah pemanggil memiliki hak akses Admin / IT di tabel `users`
      const { data: callerProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('role, is_active')
        .eq('id', callerUser.id)
        .single();

      if (profileError || !callerProfile || callerProfile.is_active === false) {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Akun pemanggil tidak aktif atau tidak memiliki hak akses.' },
          { status: 403 }
        );
      }

      const allowedAdminRoles = ['Administrator', 'IT Coordinator', 'Admin', 'Super Administrator'];
      const userRoleLower = callerProfile.role?.toLowerCase() || '';
      const isAdmin = allowedAdminRoles.some(role => userRoleLower.includes(role.toLowerCase()));

      if (!isAdmin && userRoleLower !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Anda tidak memiliki otoritas manajemen sesi.' },
          { status: 403 }
        );
      }
    }

    // 4. Amankan parsing JSON body
    const body = await request.json().catch(() => null);
    if (!body || !body.userId) {
      return NextResponse.json(
        { success: false, message: 'User ID target wajib disertakan.' },
        { status: 400 }
      );
    }

    const { userId } = body;

    // 5. Validasi format UUID dari userId target
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, message: 'Format User ID target tidak valid.' },
        { status: 400 }
      );
    }

    // 6. Proteksi Tambahan: Cegah Admin melakukan force logout pada akunnya sendiri
    if (callerUser.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Operasi dibatalkan: Anda tidak dapat mengakhiri sesi akun Anda sendiri melalui panel ini.' },
        { status: 400 }
      );
    }

    // 7. Validasi Eksistensi: Pastikan pengguna target benar-benar ada di Supabase Auth
    const { data: targetUser, error: targetCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetCheckError || !targetUser?.user) {
      return NextResponse.json(
        { success: false, message: 'Gagal: Pengguna target tidak ditemukan di dalam sistem.' },
        { status: 404 }
      );
    }

    // 8. Cabut sesi Auth Supabase secara paksa (Memutus token aktif pengguna)
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
    if (signOutError) {
      throw new Error(`Gagal mencabut sesi Auth: ${signOutError.message}`);
    }

    // 9. Perbarui status sesi di tabel custom menjadi non-aktif (`is_active = false`) & catat waktu dibekukan
    const { error: dbError } = await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString(),
        ended_reason: 'FORCE_LOGOUT_ADMIN'
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (dbError) {
      console.warn(`Peringatan update user_sessions untuk user ${userId}:`, dbError.message);
    }

    // 10. Catat ke tabel Jejak Audit Keamanan (Audit Log) Lengkap
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          admin_id: callerUser.id,
          action: 'FORCE_LOGOUT_USER',
          target_user_id: userId,
          description: `Admin ${callerUser.email} mengakhiri sesi aktif pengguna ${targetUser.user.email || userId}`,
          ip_address: clientIp,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (auditErr) {
      // Abaikan jika tabel audit_logs belum tersedia agar fungsionalitas utama tidak terganggu
      console.info('Info: Tabel audit_logs belum tersedia untuk mencatat log.');
    }

    return NextResponse.json({ 
      success: true, 
      message: `Sesi pengguna ${targetUser.user.email || 'target'} berhasil diakhiri secara administratif.`,
      targetUserId: userId,
      terminatedAt: new Date().toISOString()
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan internal server.';
    console.error('Force Logout API Error:', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}