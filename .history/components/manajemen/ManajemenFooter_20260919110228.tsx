'use client';

import { ShieldCheck, Server, Lock, HeartHandshake, Code2, Cpu } from 'lucide-react';

export default function ManajemenFooter() {
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
            <div className="w-full bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 p-3.5 rounded-2xl shadow-sm flex items-center space-x-3.5 hover:border-emerald-300 transition-all">
              <div className="w-14 h-14 rounded-xl overflow-hidden border-2 border-emerald-500 shrink-0 shadow-md bg-white relative">
                <img 
                  src="/koordinator.jpeg" 
                  alt="Developer & IT Coordinator" 
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-emerald-600" />
                  <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Lead Developer &amp; IT</span>
                </div>
                <h4 className="text-xs font-black text-slate-900 truncate">Administrator &amp; IT Coordinator</h4>
                <p className="text-[10px] text-slate-600 font-semibold truncate">Sanitarian &amp; Sistem Informasi RSUD</p>
              </div>
            </div>
          </div>

          {/* Kolom 3: Status Sistem & Keamanan (4 Kolom) */}
          <div className="lg:col-span-4 flex flex-col items-center lg:items-end space-y-1.5 text-center lg:text-right">
            <div className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-3 py-1 rounded-xl shadow-xs">
              <Server className="w-3.5 h-3.5 text-emerald-600" />
              <span>SIMRS Khanza &amp; Analytics Active</span>
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
          </div>
        </div>

      </div>
    </footer>
  );
}