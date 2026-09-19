import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variabel Supabase tidak ditemukan di .env.local!');
}

// Menggunakan createBrowserClient agar Sesi Auth otomatis tersinkronisasi ke Cookies & Middleware Server
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);