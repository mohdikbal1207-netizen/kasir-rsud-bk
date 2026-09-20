'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, ShieldAlert, Maximize2, Minimize2, LayoutDashboard, ChevronDown, 
  CalendarClock, Wifi, WifiOff, Bell, Sparkles, CheckCircle2 
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

interface ManajemenHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  showBackButton?: boolean;
  currentRole?: string; // Filter notifikasi ('manajemen', 'admin', 'kasir')
}

export default function ManajemenHeader({
  title = "RSUD BUKIT KERMAN",
  subtitle = "Portal Eksekutif & Manajemen Rumah Sakit",
  badgeText = "Eksekutif / Manajemen",
  showBackButton = false,
  currentRole = 'manajemen'
}: ManajemenHeaderProps) {
  const router = useRouter();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // State Notifikasi Realtime Supabase
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  
  // Refs untuk deteksi klik di luar komponen
  const notifRef = useRef<HTMLDivElement>(null);
  const quickMenuRef = useRef<HTMLDivElement>(null);

  // Synchronize Notifications with Supabase (Realtime)
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!supabaseUrl || !supabaseAnonKey) return;

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

    // Subskripsi Realtime
    const channel = supabase
      .channel('realtime-manajemen-header-notifications')
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

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // Listener klik di luar area dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (quickMenuRef.current && !quickMenuRef.current.contains(event.target as Node)) {
        setShowQuickMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handler Tandai Semua Notifikasi Sudah Dibaca
  const handleMarkAllAsRead = async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    if (supabaseUrl && supabaseAnonKey) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .or(`role.eq.${currentRole},role.eq.all`)
        .eq('is_read', false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  return (
    <header className="w-full bg-white/90 border-b border-slate-200/85 backdrop-blur-xl sticky top-0 z-40 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        
        {/* Bagian Kiri: Tombol Kembali, Trio Logo Resmi, & Identitas */}
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Trio Logo Resmi (Logo RSUD, Logo Kerinci, Logo Kesling) */}
          <div className="flex items-center space-x-2">
            <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0 hover:scale-105 transition-transform" title="RSUD Bukit Kerman">
              <img 
                src="/logo-rsud.jpeg" 
                alt="Logo RSUD Bukit Kerman" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-200 p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0 hidden sm:flex hover:scale-105 transition-transform" title="Kabupaten Kerinci">
              <img 
                src="/logo-kerinci.png" 
                alt="Logo Kabupaten Kerinci" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 p-1 flex items-center justify-center shadow-sm overflow-hidden shrink-0 hidden md:flex hover:scale-105 transition-transform" title="Kesehatan Lingkungan RSUD Bukit Kerman">
              <img 
                src="/logo-kesling.png" 
                alt="Logo Kesehatan Lingkungan" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">{title}</h2>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                {badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          </div>
        </div>

        {/* Bagian Kanan: Indikator Jaringan, Jam Real-Time, Lonceng Notifikasi, Quick Actions, Status BLUD & Fullscreen Toggle */}
        <div className="flex items-center space-x-3">
          
          {/* Indikator Jaringan Real-Time */}
          <div className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-[11px] font-bold border transition-all ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'}`} title={isOnline ? "Koneksi Jaringan Stabil" : "Koneksi Terputus / Offline"}>
            {isOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-600" /> : <WifiOff className="w-3.5 h-3.5 text-rose-600" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Widget Jam Live di Header */}
          <div className="hidden xl:flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl text-xs font-mono font-bold text-slate-600 shadow-sm">
            <CalendarClock className="w-3.5 h-3.5 text-emerald-600" />
            <span>{currentTime || 'Loading...'}</span>
          </div>

          {/* Lonceng Notifikasi Realtime Eksekutif */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (!showNotifDropdown) {
                  handleMarkAllAsRead();
                }
              }}
              className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm relative"
              title="Notifikasi Realtime Manajemen"
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
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Laporan & Peringatan Eksekutif</h4>
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
                      Belum ada pemberitahuan baru untuk manajemen
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
                  Tutup Panel
                </button>
              </div>
            )}
          </div>

          {/* Menu Navigasi Cepat (Quick Actions) */}
          <div className="relative hidden md:block" ref={quickMenuRef}>
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 transition cursor-pointer active:scale-95 shadow-sm"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-emerald-600" />
              <span>Menu Cepat</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showQuickMenu ? 'rotate-180' : ''}`} />
            </button>

            {showQuickMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95">
                <a href="#overview" onClick={() => setShowQuickMenu(false)} className="block px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">📊 Ringkasan Eksekutif</a>
                <a href="#rajal" onClick={() => setShowQuickMenu(false)} className="block px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">🏥 Rawat Jalan</a>
                <a href="#igd" onClick={() => setShowQuickMenu(false)} className="block px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">🚑 IGD Gawat Darurat</a>
                <a href="#ranap" onClick={() => setShowQuickMenu(false)} className="block px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">🛏️ Rawat Inap</a>
                <a href="#farmasi" onClick={() => setShowQuickMenu(false)} className="block px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-emerald-600">💊 Farmasi & Obat</a>
              </div>
            )}
          </div>

          {/* Badge Status BLUD */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-600 transition-colors cursor-default shadow-sm" title="Status operasional rumah sakit berstandar penuh">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>BLUD &amp; Akreditasi Utama</span>
          </div>

          {/* Tombol Toggle Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95 shadow-sm"
            title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}