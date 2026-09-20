'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, LogOut, Wallet, ShieldCheck, User, Clock, 
  Activity, Wifi, WifiOff, Maximize, Minimize, ChevronDown, 
  Building2, Shield, BadgeCheck, Calculator, Bell, Sparkles, CheckCircle2 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Interface Notifikasi Supabase Realtime
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  role: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

interface KasirHeaderProps {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  userName?: string;
  userAvatar?: string | null;
  currentRole?: string; // Filter notifikasi ('kasir', 'admin', 'manajemen')
}

export default function KasirHeader({
  title = "RSUD BUKIT KERMAN",
  subtitle = "Sistem Informasi Manajemen Rumah Sakit — Loket Kasir",
  showBackButton = false,
  backUrl = "/kasir",
  userName: propUserName,
  userAvatar: propUserAvatar,
  currentRole = 'kasir'
}: KasirHeaderProps) {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>(propUserName || 'Memuat...');
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

  // State untuk System Notifications (Supabase Realtime)
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Hitung kembalian otomatis
  const numericTotal = parseFloat(calcTotal.replace(/[^0-9]/g, '')) || 0;
  const numericPaid = parseFloat(calcPaid.replace(/[^0-9]/g, '')) || 0;
  const changeAmount = numericPaid - numericTotal;

  // Realtime Notifications Fetching & Listening via Supabase
  useEffect(() => {
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .or(`role.eq.${currentRole},role.eq.all`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data && !error) {
        setNotifications(data);
        const unread = data.filter((n: NotificationItem) => !n.is_read).length;
        setUnreadCount(unread);
      }
    };

    fetchNotifications();

    // Dengar perubahan baru secara Realtime
    const channel = supabase
      .channel('realtime-kasir-header-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          if (newNotif.role === currentRole || newNotif.role === 'all') {
            setNotifications((prev) => [newNotif, ...prev.slice(0, 9)]);
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRole]);

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
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handler Tandai Semua Notifikasi Sudah Dibaca
  const handleMarkAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .or(`role.eq.${currentRole},role.eq.all`)
      .eq('is_read', false);
  };

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

  // FETCH SINKRONISASI PROFIL PROPER DARI TABEL 'users' DAN 'profiles'
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) {
          if (!propUserName) setCurrentUserName('SAMPEL KASIR');
          return;
        }

        const userId = authUser.id;

        // 1. Ambil data dari tabel `users`
        const { data: userData } = await supabase
          .from('users')
          .select('nama_lengkap, foto_url')
          .eq('id', userId)
          .maybeSingle();

        // 2. Ambil data dari tabel `profiles` (Fallback)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('nama_lengkap, foto_url, foto_uri')
          .eq('id', userId)
          .maybeSingle();

        // Gabungkan dan tentukan Nama Lengkap
        const resolvedName = 
          propUserName || 
          userData?.nama_lengkap || 
          profileData?.nama_lengkap || 
          authUser.user_metadata?.full_name || 
          authUser.user_metadata?.nama_lengkap || 
          authUser.email?.split('@')[0] || 
          'KASIR RSUD';

        // Tentukan URL Foto
        const rawPhoto = 
          propUserAvatar || 
          userData?.foto_url || 
          profileData?.foto_url || 
          profileData?.foto_uri || 
          authUser.user_metadata?.avatar_url || 
          authUser.user_metadata?.foto_url;

        let finalAvatarUrl: string | null = null;

        if (rawPhoto) {
          if (rawPhoto.startsWith('http') || rawPhoto.startsWith('data:')) {
            finalAvatarUrl = rawPhoto;
          } else {
            // Ambil URL Publik dari Storage Bucket 'avatars' atau 'profiles'
            const { data: avatarPublic } = supabase.storage.from('avatars').getPublicUrl(rawPhoto);
            if (avatarPublic?.publicUrl && !avatarPublic.publicUrl.endsWith('/')) {
              finalAvatarUrl = avatarPublic.publicUrl;
            } else {
              const { data: profilePublic } = supabase.storage.from('profiles').getPublicUrl(rawPhoto);
              finalAvatarUrl = profilePublic?.publicUrl || null;
            }
          }
        }

        setCurrentUserName(resolvedName);
        setCurrentUserAvatar(finalAvatarUrl);

      } catch (err) {
        console.error('Gagal mengambil data profil kasir:', err);
        setCurrentUserName(propUserName || 'SAMPEL KASIR');
      }
    };

    fetchUserProfile();

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
          
          {/* Lonceng Notifikasi Realtime Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown) {
                  handleMarkAllAsRead();
                }
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl transition cursor-pointer shadow-sm relative flex items-center justify-center"
              title="Notifikasi Realtime Kasir"
            >
              <Bell className="w-4 h-4 text-emerald-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold text-white shadow">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Notifikasi Loket</h4>
                  </div>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} Baru
                    </span>
                  )}
                </div>

                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-4 text-xs text-slate-400 font-medium">
                      Belum ada notifikasi baru untuk kasir
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          if (notif.link) router.push(notif.link);
                        }}
                        className={`p-2.5 rounded-xl border text-xs transition cursor-pointer flex items-start space-x-2.5 ${
                          !notif.is_read
                            ? 'bg-emerald-50/70 border-emerald-200'
                            : 'bg-slate-50 border-slate-100'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-slate-800">{notif.title}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 mt-1 block font-mono">
                            {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={() => setShowNotifDropdown(false)}
                  className="w-full mt-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
                >
                  Tutup Notifikasi
                </button>
              </div>
            )}
          </div>

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
                  onError={() => setCurrentUserAvatar(null)}
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm flex-shrink-0">
                  {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'K'}
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
                      {currentUserName ? currentUserName.charAt(0).toUpperCase() : 'K'}
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