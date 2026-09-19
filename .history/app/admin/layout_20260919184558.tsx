'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2, WifiOff, Lock, BellRing } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isOnline, setIsOnline] = useState<boolean>(typeof window !== 'undefined' ? navigator.onLine : true);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState<boolean>(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [activeUserEmail, setActiveUserEmail] = useState<string>('');
  const [isQuickLocked, setIsQuickLocked] = useState<boolean>(false);
  const [lockPasswordInput, setLockPasswordInput] = useState<string>('');
  const [lockError, setLockError] = useState<string>('');

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }, []);

  const handleAutoLogout = useCallback(async () => {
    try {
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
      let timeLeft = 300;
      countdownIntervalRef.current = setInterval(() => {
        timeLeft -= 1;
        setSecondsRemaining(timeLeft);
        if (timeLeft <= 0) {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        }
      }, 1000);

    }, 25 * 60 * 1000);

    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLogout();
    }, 30 * 60 * 1000);
  }, [handleAutoLogout]);

  useEffect(() => {
    const handleKeyDownShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        setIsQuickLocked(true);
        triggerToast('Layar Administrator terkunci.');
      }
    };
    window.addEventListener('keydown', handleKeyDownShortcuts);
    return () => window.removeEventListener('keydown', handleKeyDownShortcuts);
  }, [triggerToast]);

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

  useEffect(() => {
    let isMounted = true;

    async function verifyAdminAccess() {
      try {
        // 1. Ambil Sesi Supabase
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          if (isMounted) router.replace('/login');
          return;
        }

        const userEmail = (session.user.email || '').toLowerCase().trim();
        const userId = session.user.id;

        if (isMounted) setActiveUserEmail(userEmail);

        // Fail-safe mutlak khusus Email Super Admin Utama
        if (userEmail === 'mohdikbal1207@gmail.com') {
          if (isMounted) {
            setIsAuthorized(true);
            setIsLoading(false);
          }
          return;
        }

        // 2. Pencarian Fleksibel berdasarkan ID dulu, lalu EMAIL
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

        const userRole = (userData?.role || '').toLowerCase().trim();

        if (userRole !== 'admin') {
          await supabase.auth.signOut();
          if (isMounted) router.replace('/login');
          return;
        }

        if (isMounted) {
          setIsAuthorized(true);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) router.replace('/login');
      }
    }

    verifyAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleUnlockScreen = async (e: React.FormEvent) => {
    e.preventDefault();
    setLockError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: activeUserEmail,
        password: lockPasswordInput,
      });

      if (error) {
        setLockError('Kata sandi salah.');
      } else {
        setIsQuickLocked(false);
        setLockPasswordInput('');
        resetInactivityTimers();
      }
    } catch {
      setLockError('Gagal memverifikasi.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-xs font-medium text-slate-400">Memverifikasi Hak Akses Administrator...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <>
      {!isOnline && (
        <div className="bg-rose-600 text-white text-center py-1.5 px-4 text-xs font-bold flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Koneksi Internet Terputus!</span>
        </div>
      )}

      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-emerald-500 text-emerald-400 text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5">
          <BellRing className="w-4 h-4 text-emerald-400 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {children}

      {isQuickLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl w-full max-w-md space-y-6 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Layar Terkunci</h3>
              <p className="text-xs text-slate-400 mt-1">{activeUserEmail}</p>
            </div>

            <form onSubmit={handleUnlockScreen} className="space-y-4 text-left">
              <div>
                <input 
                  type="password"
                  required
                  value={lockPasswordInput}
                  onChange={(e) => setLockPasswordInput(e.target.value)}
                  placeholder="Masukkan password..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                {lockError && <p className="text-[11px] text-rose-500 font-semibold mt-1.5">{lockError}</p>}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleAutoLogout}
                  className="w-1/3 bg-slate-800 text-slate-300 py-3 rounded-2xl text-xs font-bold"
                >
                  Keluar
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold"
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