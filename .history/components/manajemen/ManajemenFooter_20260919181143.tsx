'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Server, Lock, HeartHandshake, Code2, Cpu, Activity, Mail, CheckCircle2, Clock, Headphones, Printer, Info, Globe2, RefreshCw } from 'lucide-react';

export default function ManajemenFooter() {
  const [pingMs, setPingMs] = useState<number>(14);
  const [isHospitalOpen, setIsHospitalOpen] = useState<boolean>(true);
  const [showItHelpModal, setShowItHelpModal] = useState<boolean>(false);
  const [showServerInfoModal, setShowServerInfoModal] = useState<boolean>(false);
  const [isFooterDarkMode, setIsFooterDarkMode] = useState<boolean>(false);

  // TAMBAHAN: State animasi status sinkronisasi aktif di footer
  const [isSyncingLive, setIsSyncingLive] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPingMs(Math.floor(Math.random() * (24 - 12 + 1)) + 12);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const currentHour = new Date().getHours();
    setIsHospitalOpen(currentHour >= 6 && currentHour <= 21);
  }, []);

  const handleQuickPrint = () => {
    window.print();
  };

  // TAMBAHAN: Handler simulasi sinkronisasi data dari footer
  const handleTriggerSync = () => {
    setIsSyncingLive(true);
    setTimeout(() => {
      setIsSyncingLive(false);
    }, 2000);
  };

  return (
    <footer className={`w-full border-t backdrop-blur-xl mt-auto pt-8 pb-6 shadow-sm print:hidden relative transition-colors duration-300 ${isFooterDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Bagian Atas Footer: Informasi Institusi, Profil Developer Utama, & Status Sistem */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b pb-6 ${isFooterDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          
          {/* Kolom 1: Identitas Institusi (4 Kolom) */}
          <div className="lg:col-span-4 space-y-2 text-center lg:text-left">
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center justify-center lg:justify-start gap-1.5 ${isFooterDarkMode ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500" /> RSUD Bukit Kerman
            </h3>
            <p className={`text-[11px] leading-relaxed ${isFooterDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Pusat Layanan Kesehatan &amp; BLUD Terintegrasi Kabupaten Kerinci, Provinsi Jambi.
            </p>
            
            <div className="pt-1 flex items-center justify-center lg:justify-start gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${isHospitalOpen ? (isFooterDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200') : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                <Clock className="w-3 h-3" /> {isHospitalOpen ? 'Layanan & IGD Siaga 24 Jam' : 'Jam Istirahat / Siaga Darurat'}
              </span>
              
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border font-mono ${isFooterDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <Globe2 className="w-3 h-3 text-teal-500" /> WIB (GMT+7)
              </span>
            </div>
          </div>

          {/* Kolom 2: Profil Developer & IT Coordinator / Sanitarian (4 Kolom - Dibuat Lebih Menonjol) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className={`w-full border p-3.5 rounded-2xl shadow-sm flex items-center space-x-3.5 transition-all group ${isFooterDarkMode ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500' : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-emerald-200/80 hover:border-emerald-300'}`}>
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-md bg-white relative">
                <img 
                  src="/koordinator.jpeg" 
                  alt="Developer & IT Coordinator" 
                  className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Code2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-[9px] font-black uppercase text-emerald-500 tracking-wider">Lead Developer &amp; IT</span>
                  </div>
                  <span className="flex h-2 w-2 relative" title="Developer Aktif & Terverifikasi">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <h4 className={`text-xs font-black truncate ${isFooterDarkMode ? 'text-white' : 'text-slate-900'}`}>Administrator &amp; IT Coordinator</h4>
                <p className={`text-[10px] font-semibold truncate ${isFooterDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Sanitarian &amp; Sistem Informasi RSUD</p>
              </div>
            </div>
          </div>

          {/* Kolom 3: Status Sistem, Ping & Keamanan (4 Kolom) */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end space-y-2 text-center lg:text-right">
            <div className={`inline-flex items-center space-x-1.5 text-[10px] font-bold px-3 py-1 rounded-xl border shadow-xs ${isFooterDarkMode ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
              <Server className="w-3.5 h-3.5 text-emerald-500" />
              <span>SIMRS Khanza &amp; Analytics Active</span>
            </div>
            
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border ${isFooterDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                <Activity className="w-3 h-3 text-teal-400 animate-pulse" /> Ping: {pingMs}ms
              </span>
              
              <button 
                onClick={() => setShowServerInfoModal(true)}
                className={`inline-flex items-center gap-1 font-bold hover:underline cursor-pointer px-2 py-0.5 rounded-md border ${isFooterDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50/80 text-emerald-600 border-emerald-100'}`}
                title="Klik untuk detail kesehatan server"
              >
                <CheckCircle2 className="w-3 h-3" /> 99.9% Uptime <Info className="w-2.5 h-2.5 ml-0.5" />
              </button>
            </div>

            <p className={`text-[10px] flex items-center gap-1 justify-center lg:justify-end ${isFooterDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <Lock className="w-3 h-3 text-slate-400" /> EnKRIPSI SSL &amp; Keamanan Data Terjamin
            </p>
          </div>

        </div>

        {/* Bagian Bawah Footer: Hak Cipta & Tautan Navigasi */}
        <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${isFooterDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          <div className="flex items-center gap-2 font-medium text-center sm:text-left">
            <span>&copy; {new Date().getFullYear()} <strong className={isFooterDarkMode ? 'text-white' : 'text-slate-700'}>RSUD Bukit Kerman</strong> — Kabupaten Kerinci.</span>
            
            {/* TAMBAHAN: Indikator Sinkronisasi Live Interaktif */}
            <button 
              onClick={handleTriggerSync}
              className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md border transition cursor-pointer active:scale-95 ${isSyncingLive ? 'bg-teal-500 text-white border-teal-600 animate-pulse' : (isFooterDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200')}`}
              title="Klik untuk menyegarkan koneksi data"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isSyncingLive ? 'animate-spin' : ''}`} />
              {isSyncingLive ? 'Syncing...' : 'Live Synced'}
            </button>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4 font-semibold text-[11px] flex-wrap justify-center sm:justify-end">
            <span className="hover:text-emerald-500 transition cursor-pointer flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" /> Layanan Publik BLUD
            </span>
            <span>&bull;</span>
            
            <button 
              onClick={() => setIsFooterDarkMode(!isFooterDarkMode)}
              className={`transition text-[10px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer active:scale-95 ${isFooterDarkMode ? 'bg-slate-800 text-amber-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
              title="Ganti Mode Tampilan Footer"
            >
              {isFooterDarkMode ? '☀️ Light Footer' : '🌙 Dark Footer'}
            </button>
            <span>&bull;</span>

            <button 
              onClick={handleQuickPrint}
              className={`transition flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl border cursor-pointer active:scale-95 ${isFooterDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white' : 'bg-slate-100 text-slate-700 border-slate-200'}`}
              title="Cetak Laporan Cepat"
            >
              <Printer className="w-3 h-3" /> Cetak
            </button>
            <span>&bull;</span>

            <button 
              onClick={() => setShowItHelpModal(!showItHelpModal)}
              className={`transition flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl border cursor-pointer active:scale-95 ${isFooterDarkMode ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
            >
              <Headphones className="w-3 h-3" /> Bantuan IT
            </button>
          </div>
        </div>

      </div>

      {/* Modal Dukungan IT Cepat */}
      {showItHelpModal && (
        <div className="absolute bottom-20 right-6 z-50 bg-white border border-slate-200 p-5 rounded-2xl shadow-2xl w-80 text-slate-800 animate-in fade-in slide-in-from-bottom-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Headphones className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs text-slate-900 uppercase">Pusat Bantuan SIMRS &amp; IT</h4>
            </div>
            <button onClick={() => setShowItHelpModal(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer">✕</button>
          </div>
          <div className="py-3 space-y-2 text-xs text-slate-600">
            <p>Butuh bantuan teknis terkait dashboard, pelaporan, atau kendala server SIMRS Khanza?</p>
            <p className="font-mono text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-100 text-center">
              📞 0821-7890-XXXX (IT Support)
            </p>
          </div>
          <button 
            onClick={() => setShowItHelpModal(false)}
            className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Modal Detail Kesehatan Server & Uptime */}
      {showServerInfoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-slate-800 animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-200">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">Status Server SIMRS</h4>
                  <p className="text-[11px] text-slate-500">RSUD Bukit Kerman Cloud Node</p>
                </div>
              </div>
              <button onClick={() => setShowServerInfoModal(false)} className="text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer">✕</button>
            </div>
            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Uptime Bulanan:</span>
                <span className="font-mono font-bold text-emerald-600">99.98% (Optimal)</span>
              </div>
              <div className="flex justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Latency Saat Ini:</span>
                <span className="font-mono font-bold text-teal-600">{pingMs} ms (Stabil)</span>
              </div>
              <div className="flex justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="font-semibold text-slate-500">Database Engine:</span>
                <span className="font-mono font-bold text-slate-800">Supabase &amp; MySQL Khanza</span>
              </div>
            </div>
            <button 
              onClick={() => setShowServerInfoModal(false)}
              className="w-full bg-emerald-600 text-white py-2.5 rounded-2xl text-xs font-bold hover:bg-emerald-700 transition cursor-pointer shadow-md shadow-emerald-600/20"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}
    </footer>
  );
}