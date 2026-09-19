'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, ShieldAlert, TimerReset, Wifi, WifiOff, Activity, ShieldCheck, Lock, KeyRound, Wrench, FileSpreadsheet, BellRing } from 'lucide-react';

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

  // State untuk data sesi user aktif & status penguncian layar instan
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [isQuickLocked, setIsQuickLocked] = useState<boolean>(false);
  const [lockPasswordInput, setLockPasswordInput] = useState<string>('');
  const [lockError, setLockError] = useState<string>('');

  // State untuk Audit Trail Log System & Banner Pemeliharaan Server
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false);

  // State untuk Toast Notification Keamanan Interaktif
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  // Fungsi utilitas untuk mencatat Jejak Keamanan (Audit Log)
  const logAuditActivity = useCallback((action: string, details?: string) => {
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT SECURITY LOG - RSUD BUKIT KERMAN] [${timestamp}] Action: ${action} | User: ${activeUserEmail || 'Unknown'} | Info: ${details || 'N/A'}`);
  }, [activeUserEmail]);

  const handleAutoLogout = useCallback(async () => {
    try {
      logAuditActivity('AUTO_LOGOUT_TIMEOUT', 'Sesi berakhir otomatis karena inaktivitas 30 menit.');
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      await supabase.auth.signOut();
      alert('Sesi Administrator berakhir otomatis karena tidak ada aktivitas selama 30 menit demi keamanan data pasien.');
      router.replace('/login');
    } catch (error) {
      console.error('Gagal logout otomatis:', error);
      router.replace('/login');
    }
  }, [router, logAuditActivity]);

  // Pembaharuan token sesi Supabase secara eksplisit saat sesi diperpanjang
  const resetInactivityTimers = useCallback(async () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowTimeoutWarning(false);
    setSecondsRemaining(300);

    // Refresh session token agar aman
    try {
      await supabase.auth.refreshSession();
      logAuditActivity('SESSION_TOKEN_REFRESHED', 'Sesi admin diperpanjang oleh pengguna.');
    } catch (e) {
      console.warn('Gagal memperbarui token sesi:', e);
    }

    // Peringatan muncul setelah 25 menit tidak aktif
    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      logAuditActivity('SESSION_TIMEOUT_WARNING_SHOWN', 'Peringatan 5 menit sisa waktu inaktivitas muncul.');
      
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
  }, [handleAutoLogout, logAuditActivity]);

  // Handler Pintasan Keyboard untuk Kunci Layar Cepat (Ctrl + L)
  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsQuickLocked(true);
        logAuditActivity('QUICK_LOCK_TRIGGERED', 'Layar terkunci via tombol pintas keyboard Ctrl+L.');
        triggerToast('Layar Administrator berhasil terkunci instan.');
      }
    };
    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  }, [logAuditActivity, triggerToast]);

  // Tab Visibility Watcher - Re-verify sesi saat admin kembali ke tab
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          router.replace('/login');
        } else {
          logAuditActivity('TAB_FOCUS_RESTORED', 'Pengguna kembali berinteraksi pada tab ini.');
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [router, logAuditActivity]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      logAuditActivity('NETWORK_STATUS', 'Koneksi terhubung kembali (Online).');
      triggerToast('Koneksi internet terhubung kembali.');
    };
    const handleOffline = () => {
      setIsOnline(false);
      logAuditActivity('NETWORK_STATUS', 'Koneksi terputus (Offline).');
    };

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
  }, [resetInactivityTimers, logAuditActivity, triggerToast]);

  useEffect(() => {
    async function verifyAdminAccess() {
      try {
        // 1. Cek sesi login aktif dari Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const userId = session.user.id;
        const userEmail = (session.user.email || '').toLowerCase().trim();
        
        setActiveUserEmail(session.user.email || 'Admin RSUD');
        setCurrentSessionId(userId.substring(0, 8).toUpperCase());

        // 2. Pencarian Fleksibel: Coba cari berdasarkan ID dulu, jika null cari berdasarkan EMAIL
        let { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();

        if (!userData) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('role')
            .eq('email', userEmail)
            .maybeSingle();
          userData = userByEmail;
        }

        // 3. Normalisasi role
        const userRole = (userData?.role || '').toLowerCase().trim();

        // 4. Validasi Mutlak: Cek apakah role bernilai 'admin'
        if (userRole !== 'admin') {
          logAuditActivity('UNAUTHORIZED_ACCESS_ATTEMPT', `Email ${userEmail} dengan role '${userRole}' ditolak mengakses Panel Admin.`);
          await supabase.auth.signOut();
          alert(`Akses Ditolak! Akun (${userEmail}) memiliki role '${userRole || 'tidak terdefinisi'}' dan tidak diizinkan mengakses Panel Administrator.`);
          router.replace('/login');
          return;
        }

        // Jika role === 'admin', izinkan masuk!
        setIsAuthorized(true);
        logAuditActivity('ADMIN_VERIFIED_SUCCESSFULLY', `Akses administrator untuk ${userEmail} terkonfirmasi.`);
      } catch (err) {
        console.error('Kesalahan verifikasi keamanan admin:', err);
        router.replace('/login');
      } finally {
        setIsLoading(false);
      }
    }

    verifyAdminAccess();
  }, [router, logAuditActivity]);

  // Verifikasi ulang kata sandi saat membuka kembali Quick Lock Screen
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
        logAuditActivity('LOCKSCREEN_UNLOCK_FAILED', 'Gagal membuka kunci layar: Kata sandi salah.');
      } else {
        setIsQuickLocked(false);
        setLockPasswordInput('');
        resetInactivityTimers();
        logAuditActivity('LOCKSCREEN_UNLOCKED_SUCCESS', 'Layar terkunci berhasil dibuka kembali.');
        triggerToast('Layar berhasil dibuka kembali.');
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

      {/* Banner Informasi Mode Pemeliharaan Terjadwal (Opsional) */}
      {isMaintenanceMode && (
        <div className="bg-amber-500 text-slate-950 text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm">
          <Wrench className="w-4 h-4 animate-bounce" />
          <span>Sistem SIMRS sedang dalam mode pemeliharaan rutin. Data tetap aman terenkripsi.</span>
        </div>
      )}

      {/* Toast Notifikasi Keamanan Melayang */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-emerald-500 text-emerald-400 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-top-4">
          <BellRing className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span>{toastMessage}</span>
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
        
        {/* Pintasan Kunci Layar Instan */}
        <button 
          onClick={() => {
            setIsQuickLocked(true);
            logAuditActivity('QUICK_LOCK_CLICKED', 'Tombol Lock pada Floating Status diklik.');
          }}
          className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer font-sans font-bold"
          title="Kunci Layar Instan (Ctrl + L)"
        >
          <Lock className="w-3 h-3" /> Lock (Ctrl+L)
        </button>
      </div>

      {/* Watermark Keamanan Halus Anti Leak Foto Layar */}
      <div className="fixed bottom-2 right-4 z-30 opacity-25 pointer-events-none select-none text-[9px] font-mono text-slate-400 print:hidden">
        RSUD-BK-SESSION: {currentSessionId} • {activeUserEmail}
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
              onClick={() => {
                resetInactivityTimers();
                triggerToast('Sesi Administrator berhasil diperpanjang.');
              }}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-500 transition cursor-pointer shadow-lg shadow-emerald-600/20"
            >
              Saya Masih Aktif (Lanjutkan Sesi)
            </button>
          </div>
        </div>
      )}

      {/* Layar Pengunci Instan (Quick Lock Screen Overlay) */}
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
                    autoComplete="current-password"
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