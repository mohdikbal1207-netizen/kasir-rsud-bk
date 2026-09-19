'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Phone, Mail, ExternalLink, 
  ArrowUp, Wifi, Clock, Database, Sparkles 
} from 'lucide-react';

interface KasirFooterProps {
  developerName?: string;
  developerTitle?: string;
  developerPhone?: string;
  developerEmail?: string;
  developerAvatar?: string;
}

export default function KasirFooter({
  developerName = "Mohd. Ikbal, S.Tr.Kes",
  developerTitle = "DESIGNED & DEVELOPED BY",
  developerPhone = "082281155614",
  developerEmail = "mohdikbal1207@gmail.com",
  developerAvatar = "/koordinator.jpeg"
}: KasirFooterProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);

  // Jam & Tanggal Real-time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      };
      const dateStr = now.toLocaleDateString('id-ID', options);
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
      setCurrentDateTime(`${dateStr} • ${timeStr}`);
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Monitor Status Koneksi Jaringan
  useEffect(() => {
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

  // Handler Scroll ke Atas Halaman
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#0B132B] text-slate-300 border-t border-slate-800/80 mt-auto pt-8 pb-6 px-4 sm:px-8 shadow-2xl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Bagian Atas: Informasi Utama & Kartu Pengembang */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          
          {/* Sisi Kiri: Branding & Logo RSUD */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-white/5 p-1.5 rounded-xl border border-white/10">
                <img src="/logo-kerinci.png" alt="Kerinci" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <img src="/logo-rsud.jpeg" alt="RSUD" className="w-7 h-7 object-contain rounded-lg" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                <img src="/logo-kesling.png" alt="Kesling" className="w-7 h-7 object-contain" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
              </div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">RSUD BUKIT KERMAN</h2>
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                  Portal Internal Staf
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              Sistem Informasi Manajemen Rumah Sakit (SIMRS) Terintegrasi Operasional Kasir, Administrasi & Management BLUD.
            </p>
          </div>

          {/* Sisi Kanan: Kartu Pengembang (Mohd. Ikbal, S.Tr.Kes) */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center space-x-4 w-full lg:w-auto">
            <div className="relative">
              <img 
                src={developerAvatar} 
                alt={developerName} 
                className="w-14 h-14 rounded-xl object-cover border-2 border-emerald-500 shadow-md flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✓</span>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> {developerTitle}
              </p>
              <p className="text-sm font-extrabold text-white tracking-wide">{developerName}</p>
              <div className="flex items-center space-x-3 text-[11px] text-slate-400 pt-0.5">
                <span className="flex items-center gap-1 hover:text-emerald-400 transition">
                  <Phone className="w-3 h-3 text-emerald-500" /> {developerPhone}
                </span>
                <span className="flex items-center gap-1 hover:text-emerald-400 transition truncate max-w-[180px]">
                  <Mail className="w-3 h-3 text-emerald-500" /> {developerEmail}
                </span>
              </div>
            </div>
            <button 
              onClick={() => alert(`Informasi Kontak Pengembang:\nNama: ${developerName}\nWhatsApp: ${developerPhone}\nEmail: ${developerEmail}`)}
              className="hidden sm:flex items-center space-x-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <span>Detail</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

        {/* Bagian Bawah: Copyright & Status Widget */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} <span className="text-white font-semibold">RSUD Bukit Kerman</span>. Hak Cipta Dilindungi.
          </p>

          {/* Widget Status & Navigasi */}
          <div className="flex items-center flex-wrap justify-center gap-2.5">
            
            {/* Status Koneksi */}
            <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
              isOnline ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
              <Wifi className="w-3.5 h-3.5" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {/* Tanggal & Waktu Real-time */}
            {currentDateTime && (
              <div className="hidden md:flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{currentDateTime}</span>
              </div>
            )}

            {/* Supabase Status */}
            <div className="flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase Active</span>
            </div>

            {/* Versi Aplikasi */}
            <div className="hidden sm:inline-block px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
              v2.5 Integrated
            </div>

            {/* Tombol Ke Atas */}
            <button 
              onClick={scrollToTop}
              className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              title="Kembali ke atas halaman"
            >
              <span>Ke Atas</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

          </div>

        </div>

      </div>
    </footer>
  );
}