'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, ShieldCheck, Clock, UserCheck, Activity, Calendar, 
  Bell, Globe, CheckCircle2, AlertCircle, Wifi, WifiOff, Cpu, 
  Sparkles, ChevronDown, User, Shield, LogOut, Terminal, Timer, Search, Database, Home 
} from 'lucide-react';

// Import komponen NotificationBell dari folder parent components
import NotificationBell from '../NotificationBell';

// Inisialisasi Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Interface Notifikasi dari Database Supabase
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  role: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  showBackButton?: boolean;
  backUrl?: string;
  adminName?: string; // Nama admin aktif
  currentRole?: string; // Role untuk filter notifikasi ('admin', 'kasir', 'manajemen')
  useExternalBell?: boolean; // Opsional: Set true jika ingin menggunakan komponen NotificationBell terpisah
}

export default function AdminHeader({
  title,
  subtitle,
  badgeText,
  showBackButton = false,
  backUrl = '/admin',
  adminName = 'Admin Verifikator',
  currentRole = 'admin',
  useExternalBell = true
}: AdminHeaderProps) {
  const router = useRouter();

  // State Waktu & Tanggal Real-time
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // State Durasi Sesi Aktif (Timer)
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  
  // State Interaktif Dropdown & Status
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState<boolean>(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [serverLoad] = useState<string>('Normal (14%)');

  // Refs untuk deteksi klik di luar komponen dropdown
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const diagnosticRef = useRef<HTMLDivElement>(null);

  // Synchronize Notifications with Supabase (Realtime)
  useEffect(() => {
    // 1. Fetch awal notifikasi dari Supabase
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

    // 2. Listener Realtime Subscriptions Supabase
    const channel = supabase
      .channel(`realtime-admin-header-notifications-${currentRole}`)
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
    // Deteksi Jaringan Online/Offline
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    // Jam & Tanggal Aktual
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    
    updateDateTime();
    const clockTimer = setInterval(updateDateTime, 1000);

    // Timer Durasi Sesi Admin
    const sessionTimer = setInterval(() => {
      setSessionSeconds(prev => prev + 1);
    }, 1000);

    // Listener Klik di Luar untuk Menutup Dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (diagnosticRef.current && !diagnosticRef.current.contains(event.target as Node)) {
        setShowDiagnosticModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(clockTimer);
      clearInterval(sessionTimer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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

  // Format detik sesi menjadi HH:MM:SS
  const formatSessionTime = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSecs % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative">
        
        {/* Sisi Kiri: Logo, Title & Subtitle */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shadow-inner flex-shrink-0 relative">
            <ShieldCheck className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-ping"></span>
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-sm sm:text-base font-black tracking-wider text-white uppercase">
                {title}
              </span>
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase shadow-sm">
                {badgeText}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Sisi Tengah: Informasi Status Sistem, Durasi Sesi, Tanggal, Jam & Menu Interaktif */}
        <div className="hidden xl:flex items-center space-x-3 bg-slate-800/80 border border-slate-700/70 px-4 py-2 rounded-2xl text-xs shadow-inner">
          
          {/* Status Server & Diagnostik Popover (Klik untuk Buka) */}
          <div className="relative" ref={diagnosticRef}>
            <button
              onClick={() => setShowDiagnosticModal(!showDiagnosticModal)}
              className="flex items-center space-x-1.5 hover:bg-slate-700/60 px-2 py-1 rounded-xl transition cursor-pointer"
              title="Klik untuk melihat diagnostik sistem rumah sakit"
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">Server Online</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span className="font-extrabold text-[11px] uppercase tracking-wider text-rose-400">Offline</span>
                </>
              )}
            </button>

            {/* Modal Diagnostik Sistem */}
            {showDiagnosticModal && (
              <div className="absolute left-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 p-4 z-50 animate-fade-in font-sans">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center space-x-1.5">
                    <Terminal className="w-4 h-4 text-emerald-700" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Diagnostik Sistem RSUD</h4>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">Stabil</span>
                </div>
                <div className="py-3 space-y-2 text-xs">
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500">Koneksi Database:</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1"><Database className="w-3 h-3"/> Supabase Connected</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500">Beban CPU Server:</span>
                    <span className="font-bold text-slate-800">{serverLoad}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl">
                    <span className="text-slate-500">Latensi Jaringan:</span>
                    <span className="font-bold text-emerald-700">18 ms (Optimal)</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowDiagnosticModal(false)}
                  className="w-full mt-1 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Tutup Diagnostik
                </button>
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-700"></div>

          {/* Indikator Durasi Sesi Aktif */}
          <div className="flex items-center space-x-1 text-slate-300 font-mono" title="Durasi Sesi Admin Aktif">
            <Timer className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px]">{formatSessionTime(sessionSeconds)}</span>
          </div>

          <div className="w-px h-4 bg-slate-700"></div>

          {/* Tanggal & Jam */}
          <div className="flex items-center space-x-2 text-slate-300 font-mono">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentDate || 'Memuat...'}</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white font-bold">{currentTime || '00:00:00'} WIB</span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-700"></div>

          {/* Sisi Kanan Tengah: Sesi Admin & Notifikasi */}
          <div className="flex items-center space-x-3 text-slate-200">
            
            {/* Profil Admin Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-1.5 hover:bg-slate-700/60 px-2 py-1 rounded-xl transition cursor-pointer"
                title="Kelola Sesi Admin"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">{adminName}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 p-3 z-50 animate-fade-in font-sans">
                  <div className="px-3 py-2 border-b border-slate-100 mb-2">
                    <p className="text-xs font-black uppercase text-slate-900">{adminName}</p>
                    <p className="text-[10px] text-emerald-700 font-bold">Administrator RSUD Bukit Kerman</p>
                  </div>
                  <div className="space-y-1 text-xs font-medium">
                    <div className="flex items-center space-x-2 px-3 py-2 text-slate-600 rounded-xl bg-slate-50">
                      <Shield className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Hak Akses Verifikasi Penuh</span>
                    </div>
                    <button
                      onClick={() => { setShowProfileDropdown(false); router.push('/admin'); }}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer text-left"
                    >
                      <Home className="w-3.5 h-3.5 text-slate-500" />
                      <span>Beranda Utama Admin</span>
                    </button>
                  </div>
                  <button 
                    onClick={() => setShowProfileDropdown(false)}
                    className="w-full mt-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Tutup Menu
                  </button>
                </div>
              )}
            </div>
            
            {/* Lonceng Notifikasi: Gunakan NotificationBell jika useExternalBell = true, jika false gunakan dropdown bawaan */}
            {useExternalBell ? (
              <NotificationBell currentRole={currentRole} />
            ) : (
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown);
                    if (!showNotifDropdown) {
                      handleMarkAllAsRead();
                    }
                  }}
                  className="relative p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition cursor-pointer flex items-center justify-center"
                  title="Pemberitahuan Antrean Sistem"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 text-slate-800 p-4 z-50 animate-fade-in font-sans">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center space-x-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Pemberitahuan Sistem</h4>
                      </div>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          {unreadCount} Baru
                        </span>
                      )}
                    </div>

                    <div className="py-3 space-y-2.5 max-h-72 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">
                          Belum ada pemberitahuan baru
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div 
                            key={notif.id} 
                            onClick={() => {
                              if (notif.link) router.push(notif.link);
                            }}
                            className={`flex items-start space-x-2.5 text-xs p-2.5 rounded-xl border transition cursor-pointer ${
                              !notif.is_read 
                                ? 'bg-emerald-50/60 border-emerald-200/80' 
                                : 'bg-slate-50 border-slate-100'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-slate-800">{notif.title}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">{notif.message}</p>
                              <span className="text-[9px] text-slate-400 mt-1 block">
                                {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <button 
                      onClick={() => setShowNotifDropdown(false)}
                      className="w-full mt-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow"
                    >
                      Tutup Panel
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Sisi Kanan: Tombol Kembali / Navigasi Cepat */}
        {showBackButton && (
          <Link
            href={backUrl}
            className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Kembali</span>
          </Link>
        )}

      </div>
    </header>
  );
}