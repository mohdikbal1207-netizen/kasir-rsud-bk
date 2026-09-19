import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Inisialisasi Supabase Admin menggunakan Service Role Key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID tidak valid.' }, { status: 400 });
    }

    // 1. Cabut sesi Auth Supabase secara paksa (Memutus token aktif pengguna)
    const { error: authError } = await supabaseAdmin.auth.admin.signOut(userId);
    if (authError) throw authError;

    // 2. Perbarui status sesi di tabel custom menjadi non-aktif (`is_active = false`)
    const { error: dbError } = await supabaseAdmin
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: 'Sesi pengguna berhasil diakhiri.' });
  } catch (err: unknown) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Terjadi kesalahan internal server.' }, { status: 500 });
  }
}