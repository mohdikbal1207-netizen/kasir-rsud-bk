'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Loader2, 
  WifiOff, 
  Lock, 
  BellRing, 
  ShieldCheck, 
  Clock, 
  KeyRound, 
  AlertTriangle,
  LogOut,
  Sparkles,
  Eye,
  EyeOff,
  Server,
  HelpCircle,
  BarChart3
} from 'lucide-react';

export default function ManajemenLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Status Koneksi & Inaktivitas (Idle Timeout)
  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Identitas User & Lock Screen State
  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [activeUserRole, setActiveUserRole] = useState<string>('Eksekutif Manajemen');
  const [isQuickLocked, setIsQuickLocked] = useState<boolean>(false);
  const [lockPasswordInput, setLockPasswordInput] = useState<string>('');
  const [showLockPassword, setShowLockPassword] = useState<boolean>(false);
  const [lockError, setLockError] = useState<string>('');
  const [isCapsLockActive, setIsCapsLockActive] = useState<boolean>(false);

  // Durasi Sesi & Latency Database Supabase
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(0);
  const [dbLatencyMs, setDbLatencyMs] = useState<number | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [isChannelConnected, setIsChannelConnected] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Ref untuk Focus Input Lock Screen & BroadcastChannel
  const lockInputRef = useRef<HTMLInputElement | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // System Sound Alert via Web Audio API
  const playAlertSound = useCallback((type: 'lock' | 'warning' | 'success' | 'click') => {
    try {
      if (typeof window === 'undefined') return;
      
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReducedMotion) return;

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'lock') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'warning') {
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'click') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {
      // Abaikan autopolicy audio
    }
  }, []);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const handleAutoLogout = useCallback(async () => {
    try {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage('LOGOUT');
      }
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      await supabase.auth.signOut();
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const resetInactivityTimers = useCallback(async () => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setShowTimeoutWarning(false);
    setSecondsRemaining(300);

    warningTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      playAlertSound('warning');
      let timeLeft = 300;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setSecondsRemaining(timeLeft);
        if (timeLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

    }, 25 * 60 * 1000); // Peringatan muncul setelah 25 menit inaktif

    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, 30 * 60 * 1000); // Auto-logout setelah total 30 menit inaktif
  }, [handleAutoLogout, playAlertSound]);

  // ================= FITUR BARU: PEMANTAUAN FORCE LOGOUT JARAK JAUH (REMOTE REVOCATION) =================
  useEffect(() => {
    if (!isAuthorized) return;

    let isMounted = true;
    const checkRemoteRevocation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('user_sessions')
          .select('is_active')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (isMounted && data && data.is_active === false) {
          await supabase.auth.signOut();
          router.replace('/login?reason=force_logout');
        }
      } catch (err) {
        console.error('Error checking remote session revocation:', err);
      }
    };

    // Pengecekan berkala setiap 5 detik
    const revocationInterval = setInterval(checkRemoteRevocation, 5000);

    // Realtime subscription ke tabel user_sessions untuk respons seketika
    const channel = supabase
      .channel('manajemen-session-revocation-sync')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_sessions',
        },
        (payload: any) => {
          if (payload.new && payload.new.is_active === false) {
            supabase.auth.signOut().then(() => {
              router.replace('/login?reason=force_logout');
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      clearInterval(revocationInterval);
      supabase.removeChannel(channel);
    };
  }, [isAuthorized, router]);
  // ==================================================================================================

  // Pengukur Latency Database Supabase
  useEffect(() => {
    let latencyInterval: NodeJS.Timeout;
    const checkLatency = async () => {
      const start = performance.now();
      try {
        await supabase.from('users').select('id').limit(1);
        const end = performance.now();
        setDbLatencyMs(Math.round(end - start));
      } catch {
        setDbLatencyMs(null);
      }
    };

    if (isAuthorized) {
      checkLatency();
      latencyInterval = setInterval(checkLatency, 30000);
    }

    return () => {
      if (latencyInterval) clearInterval(latencyInterval);
    };
  }, [isAuthorized]);

  // BroadcastChannel Sync Antar-Tab Manajemen
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      broadcastChannelRef.current = new BroadcastChannel('simrs_manajemen_session_channel');
      setIsChannelConnected(true);

      broadcastChannelRef.current.onmessage = (event) => {
        if (event.data === 'LOCK_SCREEN') {
          setIsQuickLocked(true);
        } else if (event.data === 'LOGOUT') {
          router.replace('/login');
        } else if (event.data === 'UNLOCK_SCREEN') {
          setIsQuickLocked(false);
        }
      };
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [router]);

  // Pelacak Durasi Sesi Aktif Manajemen
  useEffect(() => {
    const durationInterval = setInterval(() => {
      setSessionDurationMinutes((prev) => prev + 1);
    }, 60000);
    return () => clearInterval(durationInterval);
  }, []);

  // Autofokus Input Lock Screen
  useEffect(() => {
    if (isQuickLocked) {
      setTimeout(() => {
        lockInputRef.current?.focus();
      }, 100);
    }
  }, [isQuickLocked]);

  // Keyboard Shortcuts (Ctrl+L / Alt+L & ESC)
  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsQuickLocked(true);
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage('LOCK_SCREEN');
        }
        playAlertSound('lock');
        triggerToast('Layar Eksekutif Manajemen berhasil terkunci instan.');
      }

      if (e.key === 'Escape' && showLogoutConfirm) {
        setShowLogoutConfirm(false);
      }
    };

    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  }, [triggerToast, playAlertSound, showLogoutConfirm]);

  // Event Listener Online/Offline & Activity Tracking
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

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimers);
      });
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [resetInactivityTimers]);

  // Verifikasi Hak Akses Portal Manajemen
  useEffect(() => {
    async function verifyManajemenAccess() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          router.replace('/login');
          return;
        }

        const userId = session.user.id;
        const userEmail = (session.user.email || '').toLowerCase().trim();
        setActiveUserEmail(userEmail);

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

        if (userRole.includes('admin')) {
          setActiveUserRole('Administrator (Mode Manajemen)');
        } else {
          setActiveUserRole('Eksekutif / Direksi SIMRS');
        }

        if (userRole !== 'manajemen' && !userRole.includes('admin')) {
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

  // Fungsi Unlock dengan Proteksi Rate Limiting & Account Lockout
  const handleUnlockScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError('');
    setIsUnlocking(true);

    try {
      // 1. Cek status Lockout di tabel public.users
      if (activeUserEmail !== 'mohdikbal1207@gmail.com') {
        const { data: userCheck } = await supabase
          .from('users')
          .select('lockout_until, failed_attempts')
          .eq('email', activeUserEmail)
          .maybeSingle();

        if (userCheck?.lockout_until && new Date(userCheck.lockout_until) > new Date()) {
          const remainingMins = Math.ceil((new Date(userCheck.lockout_until).getTime() - new Date().getTime()) / 60000);
          setLockError(`⚠️ Akun terkunci sementara. Coba lagi dalam ${remainingMins} menit.`);
          playAlertSound('warning');
          setIsUnlocking(false);
          return;
        }
      }

      // 2. Verifikasi Password ke Supabase Auth
      const { error } = await supabase.auth.signInWithPassword({
        email: activeUserEmail,
        password: lockPasswordInput,
      });

      if (error) {
        // Jika Salah Password, Akumulasi Failed Attempts
        if (activeUserEmail !== 'mohdikbal1207@gmail.com') {
          const { data: currentData } = await supabase
            .from('users')
            .select('failed_attempts')
            .eq('email', activeUserEmail)
            .maybeSingle();

          if (currentData) {
            const newAttempts = (currentData.failed_attempts || 0) + 1;
            let lockTime = null;

            if (newAttempts >= 4) {
              lockTime = new Date(Date.now() + 15 * 60 * 1000).toISOString();
            }

            await supabase
              .from('users')
              .update({
                failed_attempts: newAttempts,
                lockout_until: lockTime,
              })
              .eq('email', activeUserEmail);

            if (newAttempts >= 4) {
              setLockError('⚠️ Terlalu banyak percobaan salah. Akun dikunci 15 menit.');
            } else {
              setLockError(`Kata sandi salah! Sisa percobaan: ${4 - newAttempts} kali.`);
            }
          }
        } else {
          setLockError('Kata sandi salah. Silakan coba lagi.');
        }

        playAlertSound('warning');
      } else {
        // Reset Counter Gagal jika Berhasil Membuka Kunci
        if (activeUserEmail !== 'mohdikbal1207@gmail.com') {
          await supabase
            .from('users')
            .update({
              failed_attempts: 0,
              lockout_until: null,
            })
            .eq('email', activeUserEmail);
        }

        setIsQuickLocked(false);
        setLockPasswordInput('');
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.postMessage('UNLOCK_SCREEN');
        }
        resetInactivityTimers();
        playAlertSound('success');
        triggerToast('Layar berhasil dibuka kembali.');
      }
    } catch {
      setLockError('Gagal memverifikasi kata sandi.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4 select-none">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 animate-ping absolute"></div>
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 relative z-10" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-slate-200 tracking-wider uppercase">RSUD Bukit Kerman</p>
          <p className="text-[11px] text-slate-400">Memverifikasi hak akses Portal Manajemen...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {/* Banner Koneksi Offline */}
      {!isOnline && (
        <div className="bg-rose-600 text-white text-center py-2 px-4 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50 shadow-lg animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Koneksi Internet Terputus! Beberapa metrik laporan realtime manajemen terhenti.</span>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900/95 border border-emerald-500/50 text-emerald-300 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-in slide-in-from-top-4">
          <div className="p-1.5 bg-emerald-500/20 rounded-xl text-emerald-400">
            <BellRing className="w-4 h-4 animate-bounce" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {children}

      {/* Floating Status Bar Manajemen (Tampil di Desktop) */}
      <div className="fixed bottom-4 left-4 z-40 hidden lg:flex items-center gap-3 bg-slate-900/90 border border-slate-800 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-2xl text-[11px] text-slate-300 font-mono print:hidden selection:bg-none">
        <span className="flex h-2 w-2 relative" title={isChannelConnected ? "Sync Tab Eksekutif Aktif" : "Sync Standalone"}>
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>

        <span className="font-bold text-slate-200 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" /> Executive Node Active
        </span>
        <span className="text-slate-700">|</span>
        
        {/* Latency Meter Realtime */}
        <span className="text-slate-400 flex items-center gap-1" title="Kualitas Latency Respon Database Supabase">
          <Server className="w-3.5 h-3.5 text-slate-400" /> Ping: {dbLatencyMs !== null ? (
            <span className={dbLatencyMs < 150 ? 'text-emerald-400 font-bold' : dbLatencyMs < 300 ? 'text-amber-400 font-bold' : 'text-rose-400 font-bold'}>
              {dbLatencyMs} ms
            </span>
          ) : '--'}
        </span>
        <span className="text-slate-700">|</span>

        <span className="text-slate-400 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-slate-400" /> Sesi: {sessionDurationMinutes} mnt
        </span>
        <span className="text-slate-700">|</span>
        <button 
          type="button"
          onClick={() => {
            setIsQuickLocked(true);
            if (broadcastChannelRef.current) {
              broadcastChannelRef.current.postMessage('LOCK_SCREEN');
            }
            playAlertSound('lock');
            triggerToast('Layar Manajemen terkunci.');
          }}
          className="text-slate-400 hover:text-amber-400 transition flex items-center gap-1 cursor-pointer font-sans font-bold hover:underline"
          title="Kunci Layar Instan (Pintasan: Ctrl + L atau Alt + L)"
        >
          <Lock className="w-3.5 h-3.5 text-amber-400" /> Lock (Ctrl+L)
        </button>
      </div>

      {/* Modal Peringatan Sesi Inaktif Manajemen */}
      {showTimeoutWarning && !isQuickLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/30 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-slate-100 space-y-4 text-center">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            
            <div>
              <h4 className="font-black text-sm text-white">Sesi Eksekutif Akan Berakhir</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Sistem mendeteksi tidak ada aktivitas</p>
            </div>

            <div className="bg-slate-950 border border-slate-800 py-3 rounded-2xl relative overflow-hidden">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-0.5">Logout Otomatis Dalam</span>
              <span className="text-2xl font-black font-mono text-amber-400 tracking-wider">
                {formatCountdown(secondsRemaining)}
              </span>
              
              <div 
                className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(secondsRemaining / 300) * 100}%` }}
              />
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tekan tombol di bawah ini untuk melanjutkan pengoperasian Portal Manajemen.
            </p>

            <button 
              type="button"
              onClick={() => {
                resetInactivityTimers();
                playAlertSound('success');
                triggerToast('Sesi Eksekutif berhasil diperpanjang.');
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Lanjutkan Sesi Manajemen</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal Quick Lock Screen Overlay */}
      {isQuickLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 text-white animate-in fade-in">
          <div className="bg-slate-900/90 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 text-center backdrop-blur-md relative overflow-hidden">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-bold tracking-wider uppercase">
                {activeUserRole}
              </span>
              <h3 className="text-lg font-black text-white">Layar Portal Manajemen Terkunci</h3>
              <p className="text-xs text-slate-400">{activeUserEmail}</p>
            </div>

            <form onSubmit={handleUnlockScreen} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">
                  Masukkan Kata Sandi:
                </label>
                <div className="relative">
                  <input 
                    ref={lockInputRef}
                    type={showLockPassword ? "text" : "password"}
                    required
                    disabled={isUnlocking}
                    value={lockPasswordInput}
                    onChange={(e) => setLockPasswordInput(e.target.value)}
                    onKeyUp={(e) => {
                      const caps = e.getModifierState && e.getModifierState('CapsLock');
                      setIsCapsLockActive(!!caps);
                    }}
                    placeholder="Masukkan kata sandi akun..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-12 py-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition placeholder-slate-600 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLockPassword(!showLockPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
                    title={showLockPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showLockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {isCapsLockActive && (
                  <p className="text-[10px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Perhatian: Tombol Caps Lock sedang aktif.
                  </p>
                )}

                {lockError && (
                  <p className="text-[11px] text-rose-500 font-semibold mt-1.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    {lockError}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar</span>
                </button>
                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-2xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
                >
                  {isUnlocking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Memeriksa...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Buka Kunci</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Logout Manual Manajemen */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center space-y-4">
            <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">Konfirmasi Keluar Portal</h4>
              <p className="text-xs text-slate-400 mt-1">Apakah Anda yakin ingin mengakhiri sesi Portal Manajemen ini?</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-95"
              >
                Batal (ESC)
              </button>
              <button
                type="button"
                onClick={handleAutoLogout}
                className="w-1/2 bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-rose-600/20 active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}