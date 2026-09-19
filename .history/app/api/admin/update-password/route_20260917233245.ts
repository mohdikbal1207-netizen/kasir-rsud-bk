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

// Regex validasi format UUID standar
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
    
    // Verifikasi token pemanggil
    const { data: { user: callerUser }, error: authVerifyError } = await supabaseAdmin.auth.getUser(token);
    if (authVerifyError || !callerUser) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi pemanggil tidak valid.' },
        { status: 403 }
      );
    }

    // Periksa apakah pemanggil memiliki hak akses Administrator / IT di tabel `users`
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
        { success: false, message: 'Akses ditolak: Anda tidak memiliki otoritas manajemen sandi.' },
        { status: 403 }
      );
    }

    // 2. Amankan parsing JSON body
    const body = await request.json().catch(() => null);
    if (!body || !body.userId || !body.newPassword) {
      return NextResponse.json(
        { success: false, message: 'User ID target dan kata sandi baru wajib disertakan.' },
        { status: 400 }
      );
    }

    const { userId, newPassword } = body;

    // 3. Validasi format UUID dan panjang kata sandi baru
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, message: 'Format User ID target tidak valid.' },
        { status: 400 }
      );
    }

    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi baru minimal harus terdiri dari 6 karakter.' },
        { status: 400 }
      );
    }

    // 4. Ubah kata sandi pengguna langsung melalui fungsi Admin Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 5. Catat ke tabel Jejak Audit Keamanan (Audit Log) - Opsional
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          admin_id: callerUser.id,
          action: 'RESET_USER_PASSWORD',
          target_user_id: userId,
          description: `Admin ${callerUser.email} mengubah kata sandi untuk pengguna ${userId}`,
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (auditErr) {
      console.info('Info: Tabel audit_logs belum tersedia.');
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Kata sandi pengguna berhasil diperbarui secara administratif.' 
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan internal server.';
    console.error('Update Password API Error:', errorMessage);
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}