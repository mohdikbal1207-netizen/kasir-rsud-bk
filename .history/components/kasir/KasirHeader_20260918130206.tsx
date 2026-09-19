'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, LogOut, Wallet, ShieldCheck, User, Clock, 
  Activity, Wifi, WifiOff, Maximize, Minimize, ChevronDown, 
  Building2, Shield, BadgeCheck, Calculator 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface KasirHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  userName?: string;
  userAvatar?: string | null;
}

export default function KasirHeader({
  title = "RSUD BUKIT KERMAN",
  subtitle = "Sistem Informasi Manajemen Rumah Sakit — Loket Kasir",
  showBackButton = false,
  backUrl = "/kasir",
  userName: propUserName,
  userAvatar: propUserAvatar
}: KasirHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>(propUserName || 'SAMPEL KASIR');
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(propUserAvatar || null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [shiftName, setShiftName] = useState<string>('Shift Pagi');
  
  // State untuk Dropdown Profil & Mode Fullscreen
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State untuk Kalkulator Cepat
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcTotal, setCalcTotal] = useState<string>('');
  const [calcPaid, setCalcPaid] = useState<string>('');
  const calcRef = useRef<HTMLDivElement>(null);

  // Hitung kembalian otomatis
  const numericTotal = parseFloat(calcTotal.replace(/[^0-9]/g, '')) || 0;
  const numericPaid = parseFloat(calcPaid.replace(/[^0-9]/g, '')) || 0;
  const changeAmount = numericPaid - numericTotal;

  // Jam Real-time & Penentuan Shift Kerja Otomatis
  useEffect(() => {
    const updateClockAndShift = () => {
      const now = new Date();
      const hours = now.getHours();
      
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

  // Tutup dropdown ketika klik di luar area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (calcRef.current && !calcRef.current.contains(event.target as Node)) {
        setShowCalculator(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler Tombol Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Sinkronisasi Profil dari Supabase & Bucket Storage jika props tidak dikirim langsung
  useEffect(() => {
    if (propUserName) setCurrentUserName(propUserName);
    if (propUserAvatar !== undefined) setCurrentUserAvatar(propUserAvatar);

    if (propUserName && propUserAvatar) return;

    const fetchUserProfileFromSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let email = session?.user?.email;
        let foundName = propUserName || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nama;
        let rawAvatar = propUserAvatar || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.foto_url;

        const { data: dbUser } = await supabase
          .from('users')
          .select('nama, foto_url, avatar_url, foto')
          .or(email ? `email.eq.${email},role.eq.KASIR` : `role.eq.KASIR`)
          .limit(1)
          .maybeSingle();

        if (dbUser) {
          if (!foundName && dbUser.nama) foundName = dbUser.nama;
          if (!rawAvatar && (dbUser.foto_url || dbUser.avatar_url || dbUser.foto)) {
            rawAvatar = dbUser.foto_url || dbUser.avatar_url || dbUser.foto;
          }
        }

        let finalAvatarUrl = null;
        if (rawAvatar) {
          if (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')) {
            finalAvatarUrl = rawAvatar;
          } else {
            const { data: avatarData } = supabase.storage.from('avatars').getPublicUrl(rawAvatar);
            if (avatarData?.publicUrl && !avatarData.publicUrl.includes('empty')) {
              finalAvatarUrl = avatarData.publicUrl;
            } else {
              const { data: profileData } = supabase.storage.from('profiles').getPublicUrl(rawAvatar);
              finalAvatarUrl = profileData?.publicUrl || rawAvatar;
            }
          }
        }

        setCurrentUserName(foundName || 'SAMPEL KASIR');
        if (finalAvatarUrl) setCurrentUserAvatar(finalAvatarUrl);
      } catch (err) {
        console.error('Gagal memuat profil header:', err);
      }
    };

    fetchUserProfileFromSupabase();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [propUserName, propUserAvatar]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="w-full bg-white/90 border-b border-slate-200/85 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col lg:flex-row items-center justify-between gap-3">
        
        {/* Bagian Kiri: Identitas RSUD & Loket */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
          <div className="flex items-center space-x-3">
            {showBackButton && (
              <button
                onClick={() => router.push(backUrl)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-sm"
                title="Kembali"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">{title}</h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Loket Kasir
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-slate-200 hidden sm:inline">
                  {shiftName}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block truncate max-w-md">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Bagian Kanan: Widget & Aksi Cepat */}
        <div className="flex items-center flex-wrap gap-2 justify-end w-full lg:w-auto">
          
          {/* Kalkulator Cepat Dropdown */}
          <div className="relative" ref={calcRef}>
            <button
              onClick={() => setShowCalculator(!showCalculator)}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center"
              title="Kalkulator Cepat Kembalian"
            >
              <Calculator className="w-4 h-4 text-emerald-600" />
            </button>

            {showCalculator && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Calculator className="w-3.5 h-3.5 text-emerald-600" /> Kalkulator Kasir
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold">Tunai</span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Total Tagihan (Rp)</label>
                    <input 
                      type="number" 
                      value={calcTotal}
                      onChange={(e) => setCalcTotal(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Uang Diterima (Rp)</label>
                    <input 
                      type="number" 
                      value={calcPaid}
                      onChange={(e) => setCalcPaid(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-medium"
                    />
                  </div>
                  <div className="mt-3 p-3 bg-emerald-50/70 rounded-xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wide">Uang Kembalian:</p>
                    <p className="text-sm font-black text-emerald-900 mt-0.5">
                      {numericPaid >= numericTotal && numericTotal > 0 
                        ? `Rp ${changeAmount.toLocaleString('id-ID')}` 
                        : 'Rp 0'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Badge Profil Interaktif */}
          {currentUserName && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 shadow-sm transition cursor-pointer"
                title="Detail Operator Aktif"
              >
                {currentUserAvatar ? (
                  <img 
                    src={currentUserAvatar} 
                    alt={currentUserName} 
                    className="w-6 h-6 rounded-full object-cover border border-emerald-500 shadow-sm flex-shrink-0" 
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0">
                    {currentUserName.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-bold text-slate-900 max-w-[130px] truncate">{currentUserName}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Card Detail Operator */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                    {currentUserAvatar ? (
                      <img src={currentUserAvatar} alt={currentUserName} className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        {currentUserName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{currentUserName}</p>
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                        <BadgeCheck className="w-3 h-3" /> Operator Kasir Aktif
                      </p>
                    </div>
                  </div>
                  <div className="pt-3 space-y-2 text-[11px] text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> Unit:</span>
                      <span className="font-semibold text-slate-700 uppercase">Loket Kasir RSUD</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Shift:</span>
                      <span className="font-semibold text-slate-700">{shiftName}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Widget Jam Digital Real-time */}
          {currentTime && (
            <div className="hidden md:flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-700">
              <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>{currentTime}</span>
            </div>
          )}

          {/* Indikator Status Koneksi Jaringan */}
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
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Tombol Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="hidden sm:flex p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition cursor-pointer shadow-sm items-center justify-center"
            title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh"}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          {/* Status Billing Aktif */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl text-xs text-emerald-800 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Billing Aktif</span>
          </div>

          {/* Tombol Logout */}
          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
            title="Keluar / Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>

        </div>

      </div>
    </header>
  );
}