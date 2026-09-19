'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, TimerReset, Wifi, WifiOff } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // TAMBAHAN: State untuk fitur keamanan tambahan (Auto Session Timeout & Network status)
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // TAMBAHAN: Fungsi penanganan logout otomatis demi keamanan medis/pemerintahan
  const handleAutoLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      alert('Sesi Administrator berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan data pasien.');
      router.replace('/login');
    } catch (error) {
      console.error('Gagal logout otomatis:', error);
      router.replace('/login');
    }
  }, [router]);

  // TAMBAHAN: Reset timer inaktivitas saat ada gerakan mouse, ketikan, atau klik
  const resetInactivityTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    setShowTimeoutWarning(false);

    // Peringatan muncul setelah 25 menit tidak aktif
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
    }, 25 * 60 * 1000);

    // Logout otomatis setelah 30 menit tidak aktif
    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, 30 * 60 * 1000);
  }, [handleAutoLogout]);

  useEffect(() => {
    // Pantau koneksi internet perangkat secara live
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Daftarkan listener aktivitas user untuk auto-timeout
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimers);
    });

    resetInactivityTimers();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimers);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimers]);

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

  return (
    <>
      {/* TAMBAHAN: Banner Peringatan Offline Koneksi Jaringan */}
      {!isOnline && (
        <div className="bg-rose-600 text-white text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Koneksi Internet Terputus! Beberapa sinkronisasi data database mungkin tertunda.</span>
        </div>
      )}

      {children}

      {/* TAMBAHAN: Modal Peringatan Sesi Hampir Habis karena Inaktivitas */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-slate-100 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <TimerReset className="w-6 h-6 animate-spin" />
              </div>
              <div>
                <h4 className="font-black text-sm text-white">Sesi Akan Berakhir</h4>
                <p className="text-[11px] text-slate-400">Keamanan Panel Admin RSUD</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Anda tidak aktif selama hampir 25 menit. Sesi administrator akan otomatis ditutup dalam 5 menit ke depan demi keamanan data.
            </p>
            <button 
              onClick={resetInactivityTimers}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Saya Masih Aktif (Lanjutkan Sesi)
            </button>
          </div>
        </div>
      )}
    </>
  );
}