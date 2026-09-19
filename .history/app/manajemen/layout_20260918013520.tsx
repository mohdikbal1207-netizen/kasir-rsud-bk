'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export default function ManajemenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function verifyManajemenAccess() {
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

        // Modul Manajemen hanya boleh diakses oleh role 'manajemen' atau 'admin'
        if (userRole !== 'manajemen' && userRole !== 'admin') {
          await supabase.auth.signOut();
          alert('Akses Ditolak! Akun Anda tidak memiliki izin untuk mengakses Portal Manajemen.');
          router.replace('/login');
          return;
        }

        setIsAuthorized(true);
      } catch (err) {
        console.error('Kesalahan verifikasi keamanan manajemen:', err);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    verifyManajemenAccess();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-medium text-slate-400">Memverifikasi hak akses Portal Manajemen...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}