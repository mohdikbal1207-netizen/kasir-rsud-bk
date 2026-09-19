'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Phone, 
  Mail, 
  ArrowUp, 
  Database, 
  Sparkles, 
  ExternalLink, 
  X, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Copy, 
  Check,
  Wifi,
  WifiOff,
  MessageSquare,
  Calendar,
  Server,
  Activity,
  RefreshCw,
  Bug,
  Building2,
  Lock
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function PublicFooter() {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [latency, setLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  
  // State Waktu dengan initial null agar aman dari Hydration Error
  const [currentTime, setCurrentTime] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string | null>(null);
  
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(true);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  // 1. Live Clock & Date Display (Aman dari Hydration karena dijalankan hanya di Client side)
  useEffect(() => {
    const updateClockAndDate = () => {
      const now = new Date();
      
      const timeString = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const dateString = now.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      setCurrentTime(`${timeString} WIB`);
      setCurrentDate(dateString);
    };

    updateClockAndDate();
    const clockInterval = setInterval(updateClockAndDate, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // 2. Detektor Status Jaringan Internet Perangkat
  useEffect(() => {
    const handleOnline = () => setIsNetworkOnline(true);
    const handleOffline = () => setIsNetworkOnline(false);

    if (typeof window !== 'undefined') {
      setIsNetworkOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 3. Cek Latency & Status Koneksi Supabase
  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setDbStatus('offline');
      return;
    }
    
    setIsPinging(true);
    const start = performance.now();
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      const end = performance.now();
      if (!error) {
        setDbStatus('online');
        setLatency(Math.round(end - start));
      } else {
        setDbStatus('offline');
      }
    } catch {
      setDbStatus('offline');
    } finally {
      setTimeout(() => setIsPinging(false), 400);
    }
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  const getLatencyQuality = () => {
    if (!latency) return { label: 'Active', color: 'text-emerald-400' };
    if (latency < 150) return { label: 'Sangat Cepat', color: 'text-emerald-400' };
    if (latency < 350) return { label: 'Normal', color: 'text-amber-400' };
    return { label: 'Cepat', color: 'text-red-400' };
  };

  // 4. Aksesibilitas Keyboard (Escape untuk tutup modal)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDetailModal(false);
    }
  }, []);

  useEffect(() => {
    if (showDetailModal) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetailModal, handleKeyDown]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent('Halo Pak Ikbal, saya staf RSUD Bukit Kerman ingin berkonsultasi terkait sistem SIMRS.');
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  const handleReportBug = () => {
    const message = encodeURIComponent('Laporan Kendala SIMRS RSUD Bukit Kerman:\n- Nama Staf / Unit: \n- Lokasi Halaman: \n- Deskripsi Masalah: ');
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  const handleOpenEmail = () => {
    window.open('mailto:mohdikbal1207@gmail.com?subject=Kendala SIMRS RSUD Bukit Kerman', '_self');
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Footer Utama yang bersih dan stabil */}
      <footer className="w-full mt-8 px-4 sm:px-6 pb-6" role="contentinfo">
        <div className="w-full bg-slate-900/95 backdrop-blur-md text-slate-300 border-t border-slate-800 p-6 sm:p-8 shadow-2xl space-y-6 rounded-3xl">
          
          {/* Bagian Atas: Logo & Info Instansi vs Developer Card */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            
            {/* Sisi Kiri: Logo & Deskripsi RSUD */}
            <div className="space-y-3 max-w-xl">
              <div className="flex items-center space-x-3">
                
                {/* Logo 1: Kerinci */}
                <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center transition hover:scale-105">
                  {!imgErrors['kerinci'] ? (
                    <Image 
                      src="/logo-kerinci.png" 
                      alt="Logo Kabupaten Kerinci" 
                      width={32} 
                      height={32} 
                      className="object-contain" 
                      onError={() => handleImageError('kerinci')}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-slate-700" />
                  )}
                </div>

                {/* Logo 2: RSUD */}
                <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center transition hover:scale-105">
                  {!imgErrors['rsud'] ? (
                    <Image 
                      src="/logo-rsud.jpeg" 
                      alt="Logo RSUD Bukit Kerman" 
                      width={32} 
                      height={32} 
                      className="object-contain" 
                      onError={() => handleImageError('rsud')}
                    />
                  ) : (
                    <Building2 className="w-5 h-5 text-blue-700" />
                  )}
                </div>

                {/* Logo 3: Kesling */}
                <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center transition hover:scale-105">
                  {!imgErrors['kesling'] ? (
                    <Image 
                      src="/logo-kesling.png" 
                      alt="Logo Kesehatan Lingkungan RSUD Bukit Kerman" 
                      width={32} 
                      height={32} 
                      className="object-contain" 
                      onError={() => handleImageError('kesling')}
                    />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  )}
                </div>

              </div>

              <div>
                <div className="text-white font-bold text-base sm:text-lg tracking-wide flex items-center gap-2">
                  <span>RSUD BUKIT KERMAN</span>
                  <span className="text-[10px] bg-blue-950 text-blue-400 border border-blue-800 px-2 py-0.5 rounded-md font-mono inline-flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Portal Internal Staf
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Sistem Informasi Manajemen Rumah Sakit (SIMRS) Terintegrasi Operasional Kasir, Administrasi &amp; Management BLUD.
                </p>
              </div>
            </div>

            {/* Sisi Kanan: Kartu Pengembang (Designed & Developed By) */}
            <div className="w-full lg:w-auto bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-inner">
              <div className="flex items-center space-x-3.5">
                
                <div 
                  onClick={() => setShowDetailModal(true)}
                  className="w-12 h-12 relative rounded-xl overflow-hidden border border-blue-500/40 shadow-md flex-shrink-0 group cursor-pointer text-left bg-slate-800 flex items-center justify-center"
                >
                  {!imgErrors['developer'] ? (
                    <Image 
                      src="/koordinator.jpeg" 
                      alt="Foto Profil Mohd. Ikbal, S.Tr.Kes" 
                      fill 
                      className="object-cover object-top transition group-hover:scale-110 duration-200"
                      onError={() => handleImageError('developer')}
                    />
                  ) : (
                    <UserCheck className="w-6 h-6 text-blue-400" />
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Designed &amp; Developed By
                  </span>
                  <div className="text-white font-bold text-sm sm:text-base">Mohd. Ikbal, S.Tr.Kes</div>
                  
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-0.5">
                    <button 
                      type="button"
                      onClick={() => handleCopy('082281155614', 'Nomor HP IT')}
                      className="flex items-center space-x-1 hover:text-emerald-400 transition cursor-pointer group active:scale-95"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>082281155614</span>
                      <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition ml-0.5" />
                    </button>

                    <button 
                      type="button"
                      onClick={() => handleCopy('mohdikbal1207@gmail.com', 'Email IT')}
                      className="flex items-center space-x-1 hover:text-sky-400 transition cursor-pointer group active:scale-95"
                    >
                      <Mail className="w-3 h-3 text-sky-400" />
                      <span>mohdikbal1207@gmail.com</span>
                      <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition ml-0.5" />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(true)}
                className="hidden sm:flex items-center space-x-1 text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 rounded-lg bg-blue-950/40 border border-blue-900/50 transition active:scale-95 cursor-pointer"
              >
                <span>Detail</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

          </div>

          {/* Garis Pembatas */}
          <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            
            <p>
              &copy; {new Date().getFullYear()} <strong className="text-slate-200">RSUD Bukit Kerman</strong>. Hak Cipta Dilindungi.
            </p>

            {/* Status Sistem & Jam */}
            <div className="flex flex-wrap items-center gap-3">
              
              <div 
                className={`px-2.5 py-1.5 rounded-xl border flex items-center space-x-1.5 text-[11px] font-medium ${
                isNetworkOnline 
                  ? 'bg-slate-950/60 border-slate-800/80 text-slate-400' 
                  : 'bg-red-950/80 border-red-800 text-red-300 animate-pulse'
              }`}>
                {isNetworkOnline ? <Wifi className="w-3 h-3 text-emerald-400" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                <span>{isNetworkOnline ? 'Online' : 'Internet Offline'}</span>
              </div>

              {/* Widget Jam Realtime (Aman Hydration) */}
              {currentTime && (
                <div className="bg-slate-950/60 border border-slate-800/80 px-2.5 py-1.5 rounded-xl flex items-center space-x-2 text-[11px] font-mono text-slate-300">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span className="hidden md:inline text-slate-400">{currentDate} &bull;</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-blue-400" />
                    <span>{currentTime}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={checkConnection}
                disabled={isPinging}
                className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl flex items-center space-x-2 shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <span className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    dbStatus === 'online' && isNetworkOnline ? 'bg-emerald-400' : 'bg-red-400'
                  }`}></span>
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${
                    dbStatus === 'online' && isNetworkOnline ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></span>
                </span>
                
                <span className={`text-[11px] font-medium inline-flex items-center space-x-1 ${
                  dbStatus === 'online' && isNetworkOnline ? 'text-emerald-400' : 'text-red-400'
                }`}>
                  <Database className="w-3 h-3 inline mr-1" />
                  {dbStatus === 'online' && isNetworkOnline 
                    ? `Supabase Active (${latency ? `${latency}ms` : 'Connected'})` 
                    : 'Supabase Disconnected'}
                </span>

                <RefreshCw className={`w-3 h-3 text-slate-500 ml-1 ${isPinging ? 'animate-spin' : ''}`} />
              </button>

              <span className="text-[11px] text-slate-500 font-mono bg-slate-950/40 px-2.5 py-1.5 rounded-xl border border-slate-800">
                v1.0.0 Integrated
              </span>

              <button
                type="button"
                onClick={scrollToTop}
                aria-label="Gulir kembali ke bagian paling atas halaman"
                className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3.5 py-1.5 rounded-xl transition border border-slate-700 flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer"
              >
                <span>Ke Atas</span>
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>
      </footer>

      {/* Toast Notification */}
      {copiedText && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span><strong>{copiedText}</strong> berhasil disalin!</span>
        </div>
      )}

      {/* Modal Detail Profil Pengembang */}
      {showDetailModal && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setShowDetailModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowDetailModal(false)}
              aria-label="Tutup modal profil"
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 relative rounded-2xl overflow-hidden border-2 border-blue-500/50 flex-shrink-0 bg-slate-800 flex items-center justify-center">
                {!imgErrors['developer'] ? (
                  <Image 
                    src="/koordinator.jpeg" 
                    alt="Foto Profil Mohd. Ikbal" 
                    fill 
                    className="object-cover object-top" 
                    onError={() => handleImageError('developer')}
                  />
                ) : (
                  <UserCheck className="w-8 h-8 text-blue-400" />
                )}
              </div>
              <div>
                <div className="text-white font-bold text-base">Mohd. Ikbal, S.Tr.Kes</div>
                <div className="text-xs text-blue-400 font-medium">IT &amp; SIMRS Coordinator</div>
                <div className="text-[11px] text-slate-400 mt-0.5">RSUD Bukit Kerman, Kerinci</div>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Pengembang Sistem SIMRS &amp; Modul Kasir BLUD</span>
              </div>
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Sanitarian &amp; Pengelola SIMRS RSUD Bukit Kerman</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/50">
              <div className="flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                <span>Env: Internal Staf</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Respon: <strong className={getLatencyQuality().color}>{getLatencyQuality().label}</strong></span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReportBug}
              className="w-full bg-slate-950/80 hover:bg-slate-950 border border-amber-900/50 text-amber-300 text-xs py-2 rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <Bug className="w-3.5 h-3.5 text-amber-400" />
              <span>Laporkan Kendala / Bug SIMRS ke IT</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Bantuan WA</span>
              </button>

              <button
                type="button"
                onClick={handleOpenEmail}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5 text-sky-400" />
                <span>Email IT</span>
              </button>
              
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-md active:scale-95 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}