'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyAdminAccess() {
      try {
        // 1. Cek sesi login aktif
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          router.replace('/login');
          return;
        }

        const userId = session.user.id;
        const userEmail = (session.user.email || '').toLowerCase().trim();

        // Bypass / Jalur Khusus jika email adalah Super Admin utama
        if (userEmail === 'mohdikbal1207@gmail.com') {
          setIsAuthorized(true);
          return;
        }

        // 2. Ambil role dari tabel 'users' menggunakan id (Gunakan maybeSingle agar tidak throw error)
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        // 3. Ambil role cadangan berdasarkan email jika pencarian id tidak menghasilkan data
        let fallbackRole = '';
        if (!userData) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('role')
            .eq('email', userEmail)
            .maybeSingle();
          fallbackRole = userByEmail?.role || '';
        }

        // 4. Ambil role dari tabel 'profiles'
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        // Normalisasi role menjadi huruf kecil
        const userRole = (userData?.role || fallbackRole || profileData?.role || '').toLowerCase().trim();

        // 5. Validasi: Jika role bukan 'admin', tolak dan keluarkan
        if (userRole !== 'admin') {
          await supabase.auth.signOut();
          alert('Akses Ditolak! Akun staf/kasir tidak diizinkan mengakses Panel Administrator.');
          router.replace('/login');
          return;
        }

        // Jika lolos, izinkan akses
        setIsAuthorized(true);
      } catch (err) {
        console.error('Kesalahan verifikasi keamanan admin:', err);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    verifyAdminAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-medium text-slate-400">Memverifikasi tingkat keamanan Administrator...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}