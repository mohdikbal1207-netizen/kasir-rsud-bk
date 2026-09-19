'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldAlert, Maximize2, Minimize2, LayoutDashboard, ChevronDown, CalendarClock, Wifi, WifiOff } from 'lucide-react';

interface ManajemenHeaderProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  showBackButton?: boolean;
}

export default function ManajemenHeader({
  title = "RSUD BUKIT KERMAN",
  subtitle = "Portal Eksekutif & Manajemen Rumah Sakit",
  badgeText = "Eksekutif / Manajemen",
  showBackButton = false,
}: ManajemenHeaderProps) {
  const router = useRouter();
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

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

    return () => {
      clearInterval(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

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

          {/* TAMBAHAN: Trio Logo Resmi (Logo RSUD, Logo Kerinci, Logo Kesling) */}
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

        {/* Bagian Kanan: Indikator Jaringan, Jam Real-Time, Status BLUD, Quick Actions & Fullscreen Toggle */}
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

          {/* Menu Navigasi Cepat (Quick Actions) */}
          <div className="relative hidden md:block">
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