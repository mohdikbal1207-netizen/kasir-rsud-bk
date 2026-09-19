'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Clock, UserCheck, Activity } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  showBackButton?: boolean;
  backUrl?: string;
  adminName?: string; // Tambahan opsional untuk nama admin
}

export default function AdminHeader({
  title,
  subtitle,
  badgeText,
  showBackButton = false,
  backUrl = '/admin',
  adminName = 'Admin Verifikator'
}: AdminHeaderProps) {
  // State untuk jam digital real-time
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        
        {/* Sisi Kiri: Logo, Title & Subtitle */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black shadow-inner flex-shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-sm sm:text-base font-black tracking-wider text-white uppercase">
                {title}
              </span>
              <span className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {badgeText}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Sisi Tengah/Kanan: Informasi Status & Jam (Fitur Baru UX) */}
        <div className="hidden lg:flex items-center space-x-4 bg-slate-800/60 border border-slate-700/60 px-3.5 py-1.5 rounded-2xl text-xs">
          <div className="flex items-center space-x-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold text-[11px] uppercase tracking-wider">Sistem Aktif</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center space-x-1 text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentTime || '00:00:00'} WIB</span>
          </div>
          <div className="w-px h-4 bg-slate-700"></div>
          <div className="flex items-center space-x-1 text-slate-300">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">{adminName}</span>
          </div>
        </div>

        {/* Sisi Kanan: Tombol Kembali */}
        {showBackButton && (
          <Link
            href={backUrl}
            className="inline-flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Kembali</span>
          </Link>
        )}

      </div>
    </header>
  );
}