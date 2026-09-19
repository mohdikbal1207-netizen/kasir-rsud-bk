import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Pastikan variabel NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY sudah terisi di .env.local');
}

// Menggunakan createBrowserClient agar sesi otomatis tersimpan di Cookies browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);