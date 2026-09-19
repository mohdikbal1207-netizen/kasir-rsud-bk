'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Building2, 
  ShieldCheck, 
  HelpCircle, 
  X, 
  MessageSquare, 
  Phone, 
  Copy, 
  Check, 
  Sparkles, 
  UserCheck,
  Globe,
  WifiOff,
  Search,
  Command
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

type PublicHeaderProps = {
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backUrl?: string;
  badgeText?: string;
  onSearchClick?: () => void;
};

export default function PublicHeader({
  title = 'RSUD BUKIT KERMAN',
  subtitle = 'Sistem Informasi Manajemen Rumah Sakit',
  showBackButton = false,
  backUrl = '/',
  badgeText = 'Portal Resmi',
  onSearchClick,
}: PublicHeaderProps) {
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  // Deteksi Status Jaringan Internet Perangkat Publik
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleImageError = (key: string) => {
    setImgErrors((prev) => ({ ...prev, [key]: true }));
  };

  // Salin Kontak ke Clipboard
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  // Direct WhatsApp Layanan Informasi
  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent('Halo RSUD Bukit Kerman, saya ingin bertanya terkait informasi layanan / SIMRS.');
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  // Aksesibilitas Keyboard (Tutup Modal dengan Tombol Escape & Pintasan Ctrl+K)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowHelpModal(false);
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (onSearchClick) onSearchClick();
    }
  }, [onSearchClick]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      <header className="w-full max-w-6xl mx-auto mb-6 px-4 pt-4 print:hidden" role="banner">
        
        {/* Banner Peringatan Offline Real-time */}
        {isOffline && (
          <div className="bg-red-950/90 border border-red-800 text-red-300 rounded-2xl px-4 py-2 mb-3 flex items-center justify-between text-xs animate-pulse shadow-md">
            <div className="flex items-center space-x-2">
              <WifiOff className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Koneksi internet terputus. Beberapa fitur layanan publik mungkin terbatas.</span>
            </div>
          </div>
        )}

        <div className="bg-slate-900/90 backdrop-blur-md text-slate-300 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Identitas Instansi & 3 Logo Resmi RSUD */}
          <div className="flex items-center space-x-3.5 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center space-x-2">
              
              {/* Logo 1: Kerinci */}
              <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0 transition hover:scale-105">
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
              <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0 transition hover:scale-105">
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
              <div className="w-9 h-9 relative bg-white rounded-xl p-0.5 shadow-sm overflow-hidden flex items-center justify-center flex-shrink-0 transition hover:scale-105">
                {!imgErrors['kesling'] ? (
                  <Image
                    src="/logo-kesling.png"
                    alt="Logo Kesling RSUD Bukit Kerman"
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

            {/* Judul Teks Portal Publik */}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm sm:text-base text-white tracking-wide">{title}</h1>
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md font-mono">
                  <Globe className="w-2.5 h-2.5 text-sky-400" /> {badgeText}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{subtitle}</p>
            </div>
          </div>

          {/* Akses Pencarian, Bantuan & Navigasi */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
            
            {/* Tombol Pencarian Cepat Opsional */}
            {onSearchClick && (
              <button
                type="button"
                onClick={onSearchClick}
                title="Cari Layanan / Informasi"
                className="bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-xl transition border border-slate-800 flex items-center space-x-2 shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden md:inline text-slate-400">Cari...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 text-[9px] bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded text-slate-400 font-mono">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              title="Pusat Bantuan Informasi RSUD"
              className="bg-slate-950/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs px-3 py-2 rounded-xl transition border border-slate-800 flex items-center space-x-1.5 shadow-sm active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xs:inline">Bantuan</span>
            </button>

            {showBackButton && (
              <Link
                href={backUrl}
                aria-label="Kembali ke halaman sebelumnya"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-md flex items-center space-x-1.5 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali</span>
              </Link>
            )}
          </div>

        </div>
      </header>

      {/* Toast Notification saat Salin Kontak */}
      {copiedText && (
        <div 
          role="status" 
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border border-slate-700 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <Check className="w-4 h-4 text-emerald-400" />
          <span><strong>{copiedText}</strong> berhasil disalin!</span>
        </div>
      )}

      {/* Modal Informasi & Bantuan Publik */}
      {showHelpModal && (
        <div 
          onClick={(e) => e.target === e.currentTarget && setShowHelpModal(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-modal-title"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              aria-label="Tutup modal bantuan"
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800/50 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Modal */}
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-blue-950/80 border border-blue-800/80 rounded-2xl text-blue-400 flex-shrink-0">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 id="help-modal-title" className="text-white font-bold text-base">Pusat Informasi & Bantuan</h3>
                <p className="text-xs text-slate-400">RSUD Bukit Kerman, Kabupaten Kerinci</p>
              </div>
            </div>

            {/* Kartu Profil Pengelola */}
            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex items-center space-x-3.5">
              <div className="w-12 h-12 relative rounded-xl overflow-hidden border border-blue-500/40 shadow-md flex-shrink-0 bg-slate-800 flex items-center justify-center">
                {!imgErrors['developer_modal'] ? (
                  <Image 
                    src="/koordinator.jpeg" 
                    alt="Foto Profil Mohd. Ikbal" 
                    fill 
                    className="object-cover object-top" 
                    onError={() => handleImageError('developer_modal')}
                  />
                ) : (
                  <UserCheck className="w-6 h-6 text-blue-400" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> IT Coordinator
                </span>
                <h4 className="text-white font-bold text-sm">Mohd. Ikbal, S.Tr.Kes</h4>
                <p className="text-[11px] text-slate-400">Pengelola Sistem Informasi RSUD</p>
              </div>
            </div>

            {/* Opsi Kontak Akses Cepat */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenWhatsApp}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center space-x-2 shadow-md active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Hubungi Layanan Informasi (WA)</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('082281155614', 'Nomor Kontak')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Salin No. HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy('mohdikbal1207@gmail.com', 'Email Kontak')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2.5 rounded-xl border border-slate-700 transition flex items-center justify-center space-x-1.5 active:scale-95 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Salin Email</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs py-2 rounded-xl transition border border-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}