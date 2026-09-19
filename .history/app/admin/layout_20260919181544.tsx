'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, TimerReset, Wifi, WifiOff, Activity, ShieldCheck, Lock, KeyRound } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  // State untuk hitung mundur detik tersisa (Countdown Timer) sebelum auto-logout
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300); // 5 Menit = 300 Detik
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // State latensi koneksi database (Supabase Heartbeat)
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  // TAMBAHAN: State untuk data sesi user aktif & status penguncian layar instan
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [isQuickLocked, setIsQuickLocked] = useState<boolean>(false);
  const [lockPasswordInput, setLockPasswordInput] = useState<string>('');
  const [lockError, setLockError] = useState<string>('');

  const handleAutoLogout = useCallback(async () => {
    try {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      await supabase.auth.signOut();
      alert('Sesi Administrator berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan data pasien.');
      router.replace('/login');
    } catch (error) {
      console.error('Gagal logout otomatis:', error);
      router.replace('/login');
    }
  }, [router]);

  // TAMBAHAN: Pembaharuan token sesi Supabase secara eksplisit saat sesi diperpanjang
  const resetInactivityTimers = useCallback(async () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowTimeoutWarning(false);
    setSecondsRemaining(300);

    // Refresh session token agar aman
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      console.warn('Gagal memperbarui token sesi:', e);
    }

    // Peringatan muncul setelah 25 menit tidak aktif
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      
      // Jalankan hitung mundur 5 menit (300 detik)
      let timeLeft = 300;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setSecondsRemaining(timeLeft);
        if (timeLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

    }, 25 * 60 * 1000);

    // Logout otomatis setelah 30 menit tidak aktif
    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, 30 * 60 * 1000);
  }, [handleAutoLogout]);

  // TAMBAHAN: Handler Pintasan Keyboard untuk Kunci Layar Cepat (Ctrl + L)
  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsQuickLocked(true);
      }
    };
    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimers);
    });

    resetInactivityTimers();

    // Pengecekan Latensi Database Supabase Berkala (Heartbeat)
    const checkDatabaseHeartbeat = async () => {
      const start = performance.now();
      try {
        await supabase.from('users').select('id', { count: 'exact', head: true });
        const end = performance.now();
        setDbLatency(Math.round(end - start));
      } catch {
        setDbLatency(null);
      }
    };

    checkDatabaseHeartbeat();
    const heartbeatInterval = setInterval(checkDatabaseHeartbeat, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimers);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      clearInterval(heartbeatInterval);
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
        setActiveUserEmail(session.user.email || 'Admin RSUD');

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

  // TAMBAHAN: Verifikasi ulang kata sandi saat membuka kembali Quick Lock Screen
  const handleUnlockScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: activeUserEmail,
        password: lockPasswordInput,
      });

      if (error) {
        setLockError('Kata sandi salah. Akses tetap terkunci.');
      } else {
        setIsQuickLocked(false);
        setLockPasswordInput('');
        resetInactivityTimers();
      }
    } catch {
      setLockError('Terjadi kesalahan verifikasi.');
    }
  };

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

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <>
      {/* Banner Peringatan Offline Koneksi Jaringan */}
      {!isOnline && (
        <div className="bg-rose-600 text-white text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Koneksi Internet Terputus! Beberapa sinkronisasi data database mungkin tertunda.</span>
        </div>
      )}

      {children}

      {/* Indikator Floating Status DB Latency & Keamanan Aktif di Sudut Layar */}
      <div className="fixed bottom-4 left-4 z-40 hidden md:flex items-center gap-2 bg-slate-900/95 border border-slate-800 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-xl text-[10px] text-slate-300 font-mono print:hidden">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-bold text-slate-200">Secure Admin Node</span>
        <span className="text-slate-600">|</span>
        <span className="text-teal-400 flex items-center gap-1">
          <Activity className="w-3 h-3" /> DB: {dbLatency !== null ? `${dbLatency}ms` : 'Syncing...'}
        </span>
        <span className="text-slate-600">|</span>
        
        {/* TAMBAHAN: Pintasan Kunci Layar Instan */}
        <button 
          onClick={() => setIsQuickLocked(true)}
          className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer font-sans font-bold"
          title="Kunci Layar Instan (Ctrl + L)"
        >
          <Lock className="w-3 h-3" /> Lock (Ctrl+L)
        </button>
      </div>

      {/* Modal Peringatan Sesi Hampir Habis karena Inaktivitas dengan Real-time Countdown */}
      {showTimeoutWarning && !isQuickLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-slate-100 animate-in zoom-in-95 space-y-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
                <TimerReset className="w-6 h-6 animate-spin" />
              </div>
            </div>
            <div>
              <h4 className="font-black text-sm text-white">Sesi Akan Berakhir</h4>
              <p className="text-[11px] text-slate-400">Keamanan Panel Admin RSUD Bukit Kerman</p>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 py-3 rounded-2xl">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">Sesi Berakhir Dalam</span>
              <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                {formatCountdown(secondsRemaining)}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Anda tidak aktif selama hampir 25 menit. Sesi administrator akan otomatis ditutup demi keamanan data pasien.
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

      {/* TAMBAHAN: Layar Pengunci Instan (Quick Lock Screen Overlay) */}
      {isQuickLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 text-white animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Layar Administrator Terkunci</h3>
              <p className="text-xs text-slate-400 mt-1">{activeUserEmail}</p>
            </div>

            <form onSubmit={handleUnlockScreen} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Masukkan Kata Sandi Untuk Buka Kunci:
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    required
                    value={lockPasswordInput}
                    onChange={(e) => setLockPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5" />
                </div>
                {lockError && <p className="text-[11px] text-rose-500 font-semibold mt-1.5">{lockError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAutoLogout}
                  className="w-1/3 bg-slate-800 text-slate-300 py-3 rounded-2xl text-xs font-bold hover:bg-slate-700 transition cursor-pointer"
                >
                  Keluar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  Buka Kunci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}