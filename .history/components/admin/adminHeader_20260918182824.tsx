'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Clock, UserCheck, Activity, Calendar, Bell, Globe } from 'lucide-react';

interface AdminHeaderProps {
  title: string;
  subtitle: string;
  badgeText: string;
  showBackButton?: boolean;
  backUrl?: string;
  adminName?: string; // Nama admin aktif
}

export default function AdminHeader({
  title,
  subtitle,
  badgeText,
  showBackButton = false,
  backUrl = '/admin',
  adminName = 'Admin Verifikator'
}: AdminHeaderProps) {
  // State untuk jam digital & tanggal real-time
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [hasNewNotif, setHasNewNotif] = useState<boolean>(true);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Format Jam: 18.25.34
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      // Format Tanggal: Jumat, 18 Sep 2026
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    
    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 backdrop-blur-md shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
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

        {/* Sisi Tengah: Informasi Status Sistem, Tanggal, Jam & Sesi Admin (UX Profesional) */}
        <div className="hidden xl:flex items-center space-x-3 bg-slate-800/70 border border-slate-700/60 px-4 py-2 rounded-2xl text-xs shadow-inner">
          
          {/* Status Online & Jaringan Rumah Sakit */}
          <div className="flex items-center space-x-1.5 text-emerald-400" title="Koneksi database RSUD Bukit Kerman aman">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-extrabold text-[11px] uppercase tracking-wider">Server Online</span>
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

          {/* Sesi Admin & Indikator Aktivitas */}
          <div className="flex items-center space-x-2 text-slate-200">
            <div className="flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold">{adminName}</span>
            </div>
            
            {/* Tombol Simulasi Notifikasi Cepat */}
            <button 
              onClick={() => setHasNewNotif(false)}
              className="relative p-1.5 rounded-xl hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Pemberitahuan Antrean Sistem"
            >
              <Bell className="w-3.5 h-3.5" />
              {hasNewNotif && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              )}
            </button>
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