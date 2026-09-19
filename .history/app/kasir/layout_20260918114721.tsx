'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function KasirLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyKasirAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const userId = session.user.id;

        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .single();

        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        const userRole = (userData?.role || profileData?.role || '').toLowerCase();

        // Modul Kasir hanya boleh diakses oleh role 'kasir' atau 'admin' (admin tetap boleh untuk pengujian)
        if (userRole !== 'kasir' && userRole !== 'admin') {
          await supabase.auth.signOut();
          alert('Akses Ditolak! Akun Anda tidak memiliki izin untuk mengakses Modul Kasir.');
          router.replace('/login');
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error('Kesalahan verifikasi keamanan kasir:', err);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    verifyKasirAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-medium text-slate-400">Memverifikasi hak akses Modul Kasir...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}