import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      nama_lengkap, 
      nik, 
      nip, 
      tempat_lahir, 
      tanggal_lahir, 
      unit_kerja, 
      no_telepon, 
      foto_url 
    } = body;

    // 1. Cek duplikasi NIK di tabel profiles
    if (nik) {
      const { data: existingNik } = await supabaseAdmin
        .from('profiles')
        .select('nik')
        .eq('nik', nik)
        .maybeSingle();

      if (existingNik) {
        return NextResponse.json(
          { error: 'Nomor NIK ini sudah terdaftar dalam sistem SIMRS.' }, 
          { status: 400 }
        );
      }
    }

    // 2. Mendaftarkan User ke Supabase Auth dengan admin.createUser
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Langsung aktif tanpa konfirmasi email
      user_metadata: {
        nama_lengkap,
        full_name: nama_lengkap,
        nik,
        nip,
        unit_kerja,
        no_telepon,
        foto_url
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Gagal membuat akun autentikasi.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // 3. Simpan ke tabel users (Dengan Penanganan / Ignored Error Trigger Audit Logs)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        role: (unit_kerja || 'kasir').toLowerCase(),
        is_active: false, // Menunggu verifikasi admin
        nama_lengkap,
        nik,
        nip,
        tempat_lahir,
        tanggal_lahir: tanggal_lahir || null,
        unit_kerja,
        no_telepon,
        foto_url: foto_url || null,
      }, { onConflict: 'id' });

    if (userError) {
      // Jika error dipicu oleh masalah audit_logs, catat log di server tapi JANGAN batalkan pendaftaran
      if (userError.message.includes('audit_logs')) {
        console.warn('Peringatan: Trigger audit_logs gagal, namun akun tetap berhasil dibuat:', userError.message);
      } else {
        return NextResponse.json(
          { error: `Gagal simpan tabel users: ${userError.message}` }, 
          { status: 400 }
        );
      }
    }

    // 4. Simpan ke tabel profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        nama_lengkap,
        nik,
        nip,
        tempat_lahir,
        tanggal_lahir: tanggal_lahir || null,
        unit_kerja,
        no_telepon,
        foto_url: foto_url || null,
      }, { onConflict: 'id' });

    if (profileError) {
      if (profileError.message.includes('audit_logs')) {
        console.warn('Peringatan: Trigger audit_logs pada profiles gagal:', profileError.message);
      } else {
        return NextResponse.json(
          { error: `Gagal simpan tabel profiles: ${profileError.message}` }, 
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('API Daftar Error:', err);
    return NextResponse.json(
      { error: err.message || 'Terjadi kesalahan pada server.' }, 
      { status: 500 }
    );
  }
}