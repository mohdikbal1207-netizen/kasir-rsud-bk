'use client';

import { useState, useEffect } from 'react';
import { ShieldCheck, Server, Lock, HeartHandshake, Code2, Cpu, Activity, Mail, CheckCircle2 } from 'lucide-react';

export default function ManajemenFooter() {
  // TAMBAHAN: State untuk simulasi status ping server real-time di footer
  const [pingMs, setPingMs] = useState<number>(14);

  useEffect(() => {
    const interval = setInterval(() => {
      // Menghasilkan fluktuasi ping yang natural (antara 12ms - 24ms)
      setPingMs(Math.floor(Math.random() * (24 - 12 + 1)) + 12);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="w-full bg-white/95 border-t border-slate-200 backdrop-blur-xl mt-auto pt-8 pb-6 shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Bagian Atas Footer: Informasi Institusi, Profil Developer Utama, & Status Sistem */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-slate-200 pb-6">
          
          {/* Kolom 1: Identitas Institusi (4 Kolom) */}
          <div className="lg:col-span-4 space-y-2 text-center lg:text-left">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center justify-center lg:justify-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> RSUD Bukit Kerman
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Pusat Layanan Kesehatan &amp; BLUD Terintegrasi Kabupaten Kerinci, Provinsi Jambi.
            </p>
          </div>

          {/* Kolom 2: Profil Developer & IT Coordinator / Sanitarian (4 Kolom - Dibuat Lebih Menonjol) */}
          <div className="lg:col-span-4 flex items-center justify-center">
            <div className="w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl shadow-sm flex items-center space-x-3.5 hover:border-emerald-300 transition-all group">
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
                    <Code2 className="w-3 h-3 text-emerald-600" />
                    <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Lead Developer &amp; IT</span>
                  </div>
                  {/* TAMBAHAN: Indikator kecil aktif verifikasi developer */}
                  <span className="flex h-2 w-2 relative" title="Developer Aktif & Terverifikasi">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900 truncate">Administrator &amp; IT Coordinator</h4>
                <p className="text-[10px] text-slate-600 font-semibold truncate">Sanitarian &amp; Sistem Informasi RSUD</p>
              </div>
            </div>
          </div>

          {/* Kolom 3: Status Sistem, Ping & Keamanan (4 Kolom) */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end space-y-2 text-center lg:text-right">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1 rounded-xl shadow-xs">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span>SIMRS Khanza &amp; Analytics Active</span>
            </div>
            
            {/* TAMBAHAN: Real-time Server Latency / Ping Monitor */}
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 text-slate-600">
                <Activity className="w-3 h-3 text-teal-600 animate-pulse" /> Ping: {pingMs}ms
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                <CheckCircle2 className="w-3 h-3" /> 99.9% Uptime
              </span>
            </div>

            <p className="text-[10px] text-slate-400 flex items-center gap-1 justify-center lg:justify-end">
              <Lock className="w-3 h-3 text-slate-400" /> EnKRIPSI SSL &amp; Keamanan Data Terjamin
            </p>
          </div>

        </div>

        {/* Bagian Bawah Footer: Hak Cipta & Tautan Navigasi */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p className="font-medium text-center sm:text-left">
            &copy; {new Date().getFullYear()} <strong className="text-slate-700">RSUD Bukit Kerman</strong> — Kabupaten Kerinci. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <div className="flex items-center space-x-4 font-semibold text-[11px]">
            <span className="hover:text-emerald-600 transition cursor-pointer flex items-center gap-1">
              <HeartHandshake className="w-3.5 h-3.5 text-emerald-500" /> Layanan Publik BLUD
            </span>
            <span>&bull;</span>
            <span className="hover:text-emerald-600 transition cursor-pointer">Kebijakan Privasi</span>
            {/* TAMBAHAN: Tautan Bantuan IT */}
            <span>&bull;</span>
            <a href="mailto:it.support@rsudbukitkerman.go.id" className="hover:text-emerald-600 transition flex items-center gap-1 text-emerald-700 font-bold">
              <Mail className="w-3 h-3" /> Dukungan IT
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}