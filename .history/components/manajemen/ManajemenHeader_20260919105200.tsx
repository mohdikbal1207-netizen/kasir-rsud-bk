'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft, ShieldAlert, Maximize2, Minimize2, LayoutDashboard, ChevronDown } from 'lucide-react';

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
  
  // TAMBAHAN: State untuk fitur Fullscreen toggle & Dropdown Quick Actions
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQuickMenu, setShowQuickMenu] = useState(false);

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
    <header className="w-full bg-white/90 border-b border-slate-200/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        
        {/* Bagian Kiri: Identitas & Tombol Kembali */}
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer active:scale-95"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Building2 className="w-6 h-6" />
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

        {/* Bagian Kanan: Status BLUD, Quick Actions & Fullscreen Toggle */}
        <div className="flex items-center space-x-3">
          
          {/* TAMBAHAN: Menu Navigasi Cepat (Quick Actions) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-2xl text-xs font-bold text-slate-700 transition cursor-pointer"
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

          {/* Badge Status BLUD (Kode Lama Dipertahankan & Ditingkatkan Efek Hovernya) */}
          <div className="hidden sm:flex items-center space-x-2 bg-slate-100/80 hover:bg-slate-200/60 border border-slate-200 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-600 transition-colors cursor-default" title="Status operasional rumah sakit berstandar penuh">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>BLUD &amp; Akreditasi Utama</span>
          </div>

          {/* TAMBAHAN: Tombol Toggle Fullscreen untuk Layar Direksi */}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer active:scale-95"
            title={isFullscreen ? "Keluar Layar Penuh" : "Mode Layar Penuh (Fullscreen)"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4 text-emerald-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}