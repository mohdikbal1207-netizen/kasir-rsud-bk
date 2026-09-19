'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Wallet, ShieldCheck, User, Clock, Activity, Wifi, WifiOff, ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KasirHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
}

export default function KasirHeader({
  title = "RSUD BUKIT KERMAN",
  subtitle = "Sistem Informasi Manajemen Rumah Sakit — Loket Kasir",
  showBackButton = false,
  backUrl = "/kasir"
}: KasirHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [shiftName, setShiftName] = useState<string>('Shift Pagi');

  // Jam Real-time & Penentuan Shift Kerja Otomatis
  useEffect(() => {
    const updateClockAndShift = () => {
      const now = new Date();
      const hours = now.getHours();
      
      // Tentukan Shift Berdasarkan Jam
      if (hours >= 7 && hours < 14) {
        setShiftName('Shift Pagi');
      } else if (hours >= 14 && hours < 20) {
        setShiftName('Shift Siang');
      } else {
        setShiftName('Shift Malam');
      }

      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    };

    updateClockAndShift();
    const timer = setInterval(updateClockAndShift, 1000);
    return () => clearInterval(timer);
  }, []);

  // Ambil Data Sesi Petugas Kasir yang Login & Status Koneksi Jaringan
  useEffect(() => {
    const fetchUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setCurrentUserEmail(session.user.email);
      }
    };
    fetchUserSession();

    // Listener Status Online / Offline Jaringan Rumah Sakit
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="w-full bg-white/85 border-b border-slate-200/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row items-center justify-between gap-3">
        
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <button
                onClick={() => router.push(backUrl)}
                className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{title}</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Loket Kasir
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border border-slate-200 hidden sm:inline">
                  {shiftName}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2 sm:gap-3 justify-end w-full lg:w-auto">
          
          {/* FITUR BARU: Indikator Email Petugas Kasir Aktif */}
          {currentUserEmail && (
            <div className="hidden xl:flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700">
              <User className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[160px]">{currentUserEmail}</span>
            </div>
          )}

          {/* FITUR BARU: Widget Jam Digital Real-time */}
          {currentTime && (
            <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* FITUR BARU: Indikator Status Koneksi Jaringan */}
          <div className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            isOnline ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>Offline / Putus</span>
              </>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Billing Aktif</span>
          </div>

          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3.5 py-2 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm ml-auto sm:ml-0"
            title="Keluar / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="inline">Keluar</span>
          </button>
        </div>

      </div>
    </header>
  );
}