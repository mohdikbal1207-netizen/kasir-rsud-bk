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
      foto_uri 
    } = body;

    // 1. Cek duplikasi NIK di tabel profiles
    const { data: existingNik } = await supabaseAdmin
      .from('profiles')
      .select('nik')
      .eq('nik', nik)
      .maybeSingle();

    if (existingNik) {
      return NextResponse.json({ error: 'Nomor NIK ini sudah terdaftar dalam sistem SIMRS.' }, { status: 400 });
    }

    // 2. Mendaftarkan User ke Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signUp({
      email,
      password,
      options: {
        data: { nama_lengkap, unit_kerja }
      }
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Gagal membuat akun autentikasi.' }, { status: 400 });
    }

    const userId = authData.user.id;

    // 3. Simpan ke tabel users (Bypass RLS via Service Role Key)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: userId,
        email,
        role: unit_kerja,
        is_active: false,
      }, { onConflict: 'id' });

    if (userError) {
      return NextResponse.json({ error: `Gagal simpan tabel users: ${userError.message}` }, { status: 400 });
    }

    // 4. Simpan ke tabel profiles (Bypass RLS via Service Role Key)
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
        foto_uri: foto_uri || null,
      }, { onConflict: 'id' });

    if (profileError) {
      return NextResponse.json({ error: `Gagal simpan tabel profiles: ${profileError.message}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan pada server.' }, { status: 500 });
  }
}