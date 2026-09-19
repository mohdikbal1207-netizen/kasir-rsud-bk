'use client';

import React from 'react';
import { ShieldCheck, Cpu, Heart, ArrowUp, HelpCircle, FileText } from 'lucide-react';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  // Fungsi untuk menggulir halaman kembali ke bagian paling atas secara halus
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-4 sm:px-6 text-xs mt-auto print:hidden shadow-inner relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Sisi Kiri: Hak Cipta, Info SIMRS & Badge Versi */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
          <p className="font-medium text-slate-300">
            &copy; {currentYear} <strong className="text-white">RSUD Bukit Kerman</strong>. Seluruh Hak Cipta Dilindungi.
          </p>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            SIMRS Enterprise v2.5
          </span>
        </div>

        {/* Sisi Kanan: Pintasan Bantuan, Kredit Pengembang & Tombol Scroll ke Atas */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
          
          {/* Tautan Cepat */}
          <div className="flex items-center space-x-3 text-slate-400">
            <span className="hover:text-slate-200 transition cursor-pointer flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> Bantuan IT
            </span>
            <span>•</span>
            <span className="hover:text-slate-200 transition cursor-pointer flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-400" /> Panduan SOP
            </span>
          </div>

          <div className="hidden lg:block w-px h-4 bg-slate-700"></div>

          {/* Kredit Pengembang */}
          <div className="flex items-center space-x-1.5">
            <span>Dev with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
            <span>by</span>
            <span className="text-emerald-400 font-black tracking-wide">Mohd. Ikbal, S.Tr.Kes</span>
          </div>

          {/* Tombol Kembali ke Atas */}
          <button
            onClick={scrollToTop}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition shadow-sm cursor-pointer ml-1 flex items-center justify-center"
            title="Kembali ke atas halaman"
          >
            <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
          </button>
        </div>

      </div>
    </footer>
  );
}