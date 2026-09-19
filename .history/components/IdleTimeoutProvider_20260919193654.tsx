'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Clock, ShieldAlert } from 'lucide-react';

interface IdleTimeoutProps {
  children: React.ReactNode;
  timeoutMinutes?: number; // Default 15 menit
}

export default function IdleTimeoutProvider({ children, timeoutMinutes = 15 }: IdleTimeoutProps) {
  const router = useRouter();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60); // Peringatan 60 detik terakhir sebelum logout
  
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = 60 * 1000; // Peringatan muncul 1 menit sebelum habis

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    // Lempar kembali ke halaman login dengan alasan session_expired
    window.location.href = '/login?reason=session_expired';
  }, []);

  const resetTimers = useCallback(() => {
    if (showWarning) return; // Jangan reset jika sedang dalam hitungan mundur peringatan

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    // Timer untuk memunculkan peringatan
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);

      // Hitung mundur 60 detik
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, timeoutMs - warningMs);

  }, [showWarning, timeoutMs, warningMs, handleLogout]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

    const handleUserActivity = () => {
      resetTimers();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity);
    });

    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [resetTimers]);

  const handleStayLoggedIn = () => {
    setShowWarning(false);
    resetTimers();
  };

  return (
    <>
      {children}

      {/* Modal Peringatan Auto-Logout */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in select-none">
          <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-2xl text-white">
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight">Sesi Akan Berakhir Otomatis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Komputer Anda terdeteksi tidak aktif selama beberapa waktu demi keamanan data privasi pasien. Sesi Anda akan ditutup dalam:
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl inline-block w-full">
              <span className="text-3xl font-mono font-black text-amber-400">{countdown} Detik</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3 rounded-xl transition cursor-pointer"
              >
                Keluar Sekarang
              </button>
              <button
                type="button"
                onClick={handleStayLoggedIn}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-3 rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                Saya Masih Disini
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}