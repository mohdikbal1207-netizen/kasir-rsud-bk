'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, LogOut, Wallet, ShieldCheck, User, Clock, Activity, Wifi, WifiOff } from 'lucide-react';
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

  // Sinkronisasi Profil dari Supabase & Bucket Storage jika props tidak dikirim langsung
  useEffect(() => {
    if (propUserName) setCurrentUserName(propUserName);
    if (propUserAvatar !== undefined) setCurrentUserAvatar(propUserAvatar);

    if (propUserName && propUserAvatar) return; // Jika sudah ada dari props, lewati fetch

    const fetchUserProfileFromSupabase = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        let email = session?.user?.email;
        let foundName = propUserName || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.nama;
        let rawAvatar = propUserAvatar || session?.user?.user_metadata?.avatar_url || session?.user?.user_metadata?.foto_url;

        // Query tabel users atau pegawai untuk mencocokkan profil aktif
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

        // Resolusi URL Foto dari Supabase Storage Buckets ('avatars' atau 'profiles')
        let finalAvatarUrl = null;
        if (rawAvatar) {
          if (rawAvatar.startsWith('http') || rawAvatar.startsWith('data:')) {
            finalAvatarUrl = rawAvatar;
          } else {
            // Cek bucket 'avatars'
            const { data: avatarData } = supabase.storage.from('avatars').getPublicUrl(rawAvatar);
            if (avatarData?.publicUrl && !avatarData.publicUrl.includes('empty')) {
              finalAvatarUrl = avatarData.publicUrl;
            } else {
              // Cek bucket 'profiles'
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

    // Listener Status Online / Offline Jaringan
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
          
          {/* Badge Nama Lengkap & Foto Profil Asli di Header */}
          {currentUserName && (
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 shadow-sm">
              {currentUserAvatar ? (
                <img 
                  src={currentUserAvatar} 
                  alt={currentUserName} 
                  className="w-6 h-6 rounded-full object-cover border border-emerald-500 shadow-sm flex-shrink-0" 
                  onError={(e) => {
                    // Fallback otomatis ke inisial huruf jika gambar gagal dimuat
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0">
                  {currentUserName.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="font-bold text-slate-900 max-w-[160px] truncate">{currentUserName}</span>
            </div>
          )}

          {/* Widget Jam Digital Real-time */}
          {currentTime && (
            <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono font-bold text-slate-700">
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