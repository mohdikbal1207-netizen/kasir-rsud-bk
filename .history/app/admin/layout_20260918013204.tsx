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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const userId = session.user.id;

        // 2. Ambil role dari tabel 'users'
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        // 3. Ambil role cadangan dari tabel 'profiles' (jaga-jaga jika disimpan di profiles)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        // Normalisasi role menjadi huruf kecil agar aman dari perbedaan kapitalisasi ('ADMIN' vs 'admin')
        const userRole = (userData?.role || profileData?.role || '').toLowerCase();

        // 4. Validasi mutlak: Jika role bukan 'admin', tolak dan tendang keluar!
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