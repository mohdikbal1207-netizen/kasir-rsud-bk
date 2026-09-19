import { createClient } from '@supabase/supabase-js';
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
    // 1. Proteksi Otorisasi: Pastikan pemanggil adalah Admin yang sah
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Token autentikasi tidak ditemukan.' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    
    // Verifikasi token pengguna yang memanggil API
    const { data: { user: callerUser }, error: authVerifyError } = await supabaseAdmin.auth.getUser(token);
    if (authVerifyError || !callerUser) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi pemanggil tidak valid.' },
        { status: 403 }
      );
    }

    // Periksa apakah pemanggil benar-benar memiliki hak akses Admin / IT di tabel `users`
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

    const allowedAdminRoles = ['Administrator', 'IT Coordinator', 'Admin'];
    const userRoleLower = callerProfile.role?.toLowerCase() || '';
    const isAdmin = allowedAdminRoles.some(role => userRoleLower.includes(role.toLowerCase()));

    if (!isAdmin && userRoleLower !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Anda tidak memiliki otoritas manajemen sesi.' },
        { status: 403 }
      );
    }

    // 2. Amankan parsing JSON body
    const body = await request.json().catch(() => null);
    if (!body || !body.userId) {
      return NextResponse.json(
        { success: false, message: 'User ID target wajib disertakan.' },
        { status: 400 }
      );
    }

    const { userId } = body;

    // 3. Validasi format UUID dari userId target
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, message: 'Format User ID target tidak valid.' },
        { status: 400 }
      );
    }

    // 4. Proteksi Tambahan: Cegah Admin melakukan force logout pada akunnya sendiri
    if (callerUser.id === userId) {
      return NextResponse.json(
        { success: false, message: 'Operasi dibatalkan: Anda tidak dapat mengakhiri sesi akun Anda sendiri melalui panel ini.' },
        { status: 400 }
      );
    }

    // 5. Cabut sesi Auth Supabase secara paksa (Memutus token aktif pengguna)
    // Menggunakan try-catch khusus agar jika user sudah offline/tidak memiliki sesi aktif, tidak membuat server crash
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
    if (signOutError) {
      console.warn(`Peringatan SignOut Auth untuk user ${userId}:`, signOutError.message);
    }

    // 6. Perbarui status sesi di tabel custom menjadi non-aktif (`is_active = false`)
    const { error: dbError } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (dbError) {
      console.warn(`Peringatan update user_sessions untuk user ${userId}:`, dbError.message);
    }

    // 7. Catat ke tabel Jejak Audit Keamanan (Audit Log) - Opsional jika tabel `audit_logs` tersedia
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          admin_id: callerUser.id,
          action: 'FORCE_LOGOUT_USER',
          target_user_id: userId,
          description: `Admin ${callerUser.email} mengakhiri sesi aktif pengguna ${userId}`,
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (auditErr) {
      // Abaikan jika tabel audit_logs belum dibuat di database Anda agar fungsionalitas utama tidak terganggu
      console.info('Info: Tabel audit_logs belum tersedia untuk mencatat log.');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Sesi pengguna berhasil diakhiri secara administratif.' 
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