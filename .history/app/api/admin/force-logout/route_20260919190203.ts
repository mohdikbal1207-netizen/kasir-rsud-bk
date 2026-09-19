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

// Regex validasi format UUID standar
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

    // Jika pemanggil tidak terautentikasi, tolak akses
    if (!callerUser) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi autentikasi pemanggil tidak ditemukan.' },
        { status: 401 }
      );
    }

    // 3. FITUR BARU: Fail-Safe Super Admin Bypass & Validasi Hak Akses Role
    const callerEmail = (callerUser.email || '').toLowerCase().trim();
    const isSuperAdminEmail = callerEmail === 'mohdikbal1207@gmail.com';

    if (!isSuperAdminEmail) {
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

      const allowedAdminRoles = ['Administrator', 'IT Coordinator', 'Admin', 'Super Administrator'];
      const userRoleLower = callerProfile.role?.toLowerCase() || '';
      const isAdmin = allowedAdminRoles.some(role => userRoleLower.includes(role.toLowerCase()));

      if (!isAdmin && userRoleLower !== 'admin') {
        return NextResponse.json(
          { success: false, message: 'Akses ditolak: Anda tidak memiliki otoritas manajemen sandi.' },
          { status: 403 }
        );
      }
    }

    // 4. Amankan parsing JSON body
    const body = await request.json().catch(() => null);
    if (!body || !body.userId || !body.newPassword) {
      return NextResponse.json(
        { success: false, message: 'User ID target dan kata sandi baru wajib disertakan.' },
        { status: 400 }
      );
    }

    const { userId, newPassword } = body;
    const cleanPassword = String(newPassword).trim();

    // 5. Validasi format UUID dan panjang kata sandi baru
    if (!uuidRegex.test(userId)) {
      return NextResponse.json(
        { success: false, message: 'Format User ID target tidak valid.' },
        { status: 400 }
      );
    }

    if (cleanPassword.length < 6) {
      return NextResponse.json(
        { success: false, message: 'Kata sandi baru minimal harus terdiri dari 6 karakter tanpa spasi kosong.' },
        { status: 400 }
      );
    }

    // 6. Validasi Eksistensi: Pastikan pengguna target benar-benar ada di sistem Auth
    const { data: targetUser, error: targetCheckError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetCheckError || !targetUser?.user) {
      return NextResponse.json(
        { success: false, message: 'Gagal: Pengguna target tidak ditemukan di dalam sistem.' },
        { status: 404 }
      );
    }

    // 7. Ubah kata sandi pengguna langsung melalui fungsi Admin Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: cleanPassword,
    });

    if (updateError) {
      throw new Error(updateError.message);
    }

    // 8. Cabut seluruh sesi aktif perangkat pengguna target secara paksa demi keamanan
    const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(userId);
    if (signOutError) {
      console.warn(`Peringatan: Gagal mencabut sesi aktif setelah reset password untuk ${userId}:`, signOutError.message);
    }

    // 9. FITUR BARU: Perbarui status sesi di tabel custom dengan detail alasan pengakhiran
    await supabaseAdmin
      .from('user_sessions')
      .update({ 
        is_active: false,
        ended_at: new Date().toISOString(),
        ended_reason: 'PASSWORD_RESET_BY_ADMIN'
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    // 10. FITUR BARU: Catat ke tabel Jejak Audit Keamanan (Audit Log) Lengkap
    try {
      await supabaseAdmin.from('audit_logs').insert([
        {
          admin_id: callerUser.id,
          action: 'RESET_USER_PASSWORD',
          target_user_id: userId,
          description: `Admin ${callerUser.email} mengubah kata sandi dan mencabut sesi aktif untuk staf ber-email ${targetUser.user.email || userId}`,
          ip_address: clientIp,
          user_agent: userAgent,
          created_at: new Date().toISOString(),
        }
      ]);
    } catch (auditErr) {
      console.info('Info: Tabel audit_logs belum tersedia untuk mencatat log.');
    }

    return NextResponse.json({ 
      success: true, 
      message: `Kata sandi pengguna ${targetUser.user.email || 'target'} berhasil diperbarui dan sesi aktif telah diakhiri.`,
      targetUserId: userId,
      updatedAt: new Date().toISOString()
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