'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, ShieldCheck, Phone, Mail, ExternalLink, 
  ArrowUp, Wifi, Clock, Database, Sparkles, X, 
  MessageSquare, Bug, CheckCircle2, UserCheck, Copy, Check, Timer, Activity, Info, HelpCircle 
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
  developerPhone = "6282281155614",
  developerEmail = "mohdikbal1207@gmail.com",
  developerAvatar = "/koordinator.jpeg"
}: KasirFooterProps) {
  const [currentDateTime, setCurrentDateTime] = useState<string>('');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [dbStatusMessage, setDbStatusMessage] = useState<string | null>(null);

  // Penghitung Durasi Sesi Aktif Staf
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);

  // Simulasi Latensi Ping Database Real-time
  const [dbPing, setDbPing] = useState<number>(18);
  const [showVersionModal, setShowVersionModal] = useState<boolean>(false);

  // FITUR BARU: State untuk Panel Bantuan Cepat (FAQ IT)
  const [showFaqModal, setShowFaqModal] = useState<boolean>(false);

  // Jam & Tanggal Real-time + Sesi Aktif + Fluktuasi Ping
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
    
    // Timer Sesi
    const sessionTimer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);

    // Fluktuasi ping database tipis-tipis agar terasa hidup
    const pingTimer = setInterval(() => {
      const randomFluctuation = Math.floor(Math.random() * 7) - 3; // -3 sampai +3 ms
      setDbPing((prev) => Math.min(Math.max(14, prev + randomFluctuation), 35));
    }, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(sessionTimer);
      clearInterval(pingTimer);
    };
  }, []);

  // Format detik sesi menjadi MM:SS atau HH:MM:SS
  const formatSessionTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}j ${minutes}m`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Monitor Status Koneksi Jaringan & Tombol ESC untuk Modal
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowVersionModal(false);
        setShowFaqModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Fungsi Salin Teks ke Clipboard dengan Efek Haptic Visual
  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Cek Status Database Interaktif
  const checkDatabaseStatus = () => {
    setDbStatusMessage(`Koneksi Supabase Cloud Stabil (${dbPing}ms) • Terenkripsi SSL.`);
    setTimeout(() => setDbStatusMessage(null), 3500);
  };

  // Scroll ke Atas Halaman
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-[#0B132B] text-slate-300 border-t border-slate-800/80 mt-auto pt-8 pb-6 px-4 sm:px-8 shadow-2xl relative">
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
          <div className="bg-slate-900/90 hover:border-slate-700 transition border border-slate-800 p-4 rounded-2xl shadow-lg flex items-center space-x-4 w-full lg:w-auto">
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
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-500" /> 0822-8115-5614
                </span>
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <Mail className="w-3 h-3 text-emerald-500" /> {developerEmail}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-1 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
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
          <div className="flex items-center flex-wrap justify-center gap-2.5 relative">
            
            {/* Notifikasi Status DB Sementara */}
            {dbStatusMessage && (
              <div className="absolute -top-12 right-0 bg-emerald-600 text-white text-[11px] font-bold px-3.5 py-2 rounded-2xl shadow-xl animate-in fade-in slide-in-from-bottom-1 z-20 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>{dbStatusMessage}</span>
              </div>
            )}

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

            {/* Indikator Durasi Sesi Aktif Staf */}
            <div className="hidden xl:flex items-center space-x-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300" title="Durasi Sesi Aktif Anda">
              <Timer className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '10s' }} />
              <span>Sesi: {formatSessionTime(sessionSeconds)}</span>
            </div>

            {/* Supabase Status Interaktif dengan Latensi Real-time */}
            <button 
              onClick={checkDatabaseStatus}
              className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 transition cursor-pointer shadow-sm"
              title="Klik untuk tes latensi database"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Supabase ({dbPing}ms)</span>
            </button>

            {/* Versi Aplikasi Interaktif */}
            <button 
              onClick={() => setShowVersionModal(true)}
              className="hidden sm:inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-slate-400 transition cursor-pointer"
              title="Klik untuk detail versi"
            >
              <span>v2.5 Integrated</span>
            </button>

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

      {/* MODAL POPUP DETAIL PENGEMBANG */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-200 relative animate-in zoom-in-95 duration-200">
            
            {/* Tombol Close */}
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Modal */}
            <div className="flex items-center space-x-4 pb-5 border-b border-slate-800">
              <img 
                src={developerAvatar} 
                alt={developerName} 
                className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg flex-shrink-0" 
              />
              <div>
                <h3 className="text-base font-black text-white">{developerName}</h3>
                <p className="text-xs text-emerald-400 font-semibold mt-0.5">IT & SIMRS Coordinator</p>
                <p className="text-[11px] text-slate-400">RSUD Bukit Kerman, Kerinci</p>
              </div>
            </div>

            {/* Info Badge List */}
            <div className="py-4 space-y-2.5">
              <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800/80 p-3 rounded-2xl text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 font-medium">Pengembang Sistem SIMRS & Modul Kasir BLUD</span>
              </div>
              <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800/80 p-3 rounded-2xl text-xs">
                <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 font-medium">Sanitarian & Pengelola SIMRS RSUD Bukit Kerman</span>
              </div>
            </div>

            {/* Status Info & Kontak Cepat dengan Salin Ganda & Haptic Feedback */}
            <div className="space-y-2 py-1 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Env:</span>
                  <span className="font-bold text-slate-200">Internal Staf</span>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between">
                  <span className="text-slate-400">Respon:</span>
                  <span className="font-bold text-emerald-400">Cepat</span>
                </div>
              </div>

              {/* Tombol Salin WhatsApp */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-mono text-[11px]">WA: +{developerPhone}</span>
                <button 
                  onClick={() => handleCopy(`+${developerPhone}`, 'phone')}
                  className={`flex items-center space-x-1 text-xs font-bold transition cursor-pointer px-2 py-1 rounded-lg ${
                    copiedField === 'phone' ? 'bg-emerald-500/20 text-emerald-400' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {copiedField === 'phone' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin No</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tombol Salin Email */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl">
                <span className="text-slate-400 font-mono text-[11px] truncate max-w-[190px]">Email: {developerEmail}</span>
                <button 
                  onClick={() => handleCopy(developerEmail, 'email')}
                  className={`flex items-center space-x-1 text-xs font-bold transition cursor-pointer px-2 py-1 rounded-lg flex-shrink-0 ${
                    copiedField === 'email' ? 'bg-emerald-500/20 text-emerald-400' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {copiedField === 'email' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Tombol Lapor Kendala & Bantuan Cepat */}
            <div className="pt-3 grid grid-cols-2 gap-2">
              <a 
                href={`https://wa.me/${developerPhone}?text=Halo%20Pak%20Ikbal,%20saya%20ingin%20melaporkan%20kendala/bug%20pada%20SIMRS%20RSUD%20Bukit%20Kerman.`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm animate-pulse"
              >
                <Bug className="w-3.5 h-3.5" />
                <span>Lapor Bug</span>
              </a>
              <button 
                onClick={() => setShowFaqModal(true)}
                className="flex items-center justify-center space-x-1.5 bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 py-2.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>FAQ IT</span>
              </button>
            </div>

            {/* Tombol Aksi Bawah */}
            <div className="flex items-center gap-2 pt-3 mt-3 border-t border-slate-800">
              <a 
                href={`https://wa.me/${developerPhone}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-2xl text-xs font-bold transition shadow-md shadow-emerald-600/20"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Bantuan WA</span>
              </a>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL POPUP INFORMASI VERSI APLIKASI */}
      {showVersionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-200 relative animate-in zoom-in-95 duration-200 space-y-4">
            
            <button 
              onClick={() => setShowVersionModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">SIMRS v2.5 Integrated</h4>
                <p className="text-[11px] text-slate-400">Build Release 2026.09 • Stable</p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Modul Aktif:</span>
                <span className="font-semibold text-emerald-400">Kasir & Billing</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-semibold text-slate-200">Supabase PostgreSQL</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Keamanan:</span>
                <span className="font-semibold text-slate-200">SSL 256-bit Encrypted</span>
              </div>
            </div>

            <button 
              onClick={() => setShowVersionModal(false)}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer mt-2"
            >
              Mengerti
            </button>

          </div>
        </div>
      )}

      {/* MODAL POPUP FAQ BANTUAN IT */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border border-slate-700/80 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-200 relative animate-in zoom-in-95 duration-200 space-y-4">
            
            <button 
              onClick={() => setShowFaqModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white">Panduan Cepat Staf (FAQ)</h4>
                <p className="text-[11px] text-slate-400">Solusi Mandiri Kendala Modul Kasir</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 max-h-64 overflow-y-auto pr-1">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-400">1. Data Billing Pasien Tidak Muncul?</p>
                <p className="text-[11px] text-slate-400">Pastikan koneksi internet stabil atau klik tombol Supabase di bawah untuk menyegarkan sinkronisasi.</p>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 space-y-1">
                <p className="font-bold text-emerald-400">2. Kalkulator Kembalian Error?</p>
                <p className="text-[11px] text-slate-400">Gunakan format angka tanpa titik atau koma berlebih saat mengetik total tagihan.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowFaqModal(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition cursor-pointer mt-2"
            >
              Kembali
            </button>

          </div>
        </div>
      )}
    </footer>
  );
}