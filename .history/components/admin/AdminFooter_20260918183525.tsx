'use client';

import React from 'react';
import { ShieldCheck, Cpu, Heart } from 'lucide-react';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-slate-900 text-slate-400 border-t border-slate-800 py-6 px-4 sm:px-6 text-xs mt-auto print:hidden shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Sisi Kiri: Hak Cipta & SIMRS Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-2 text-center sm:text-left">
          <p className="font-medium text-slate-300">
            &copy; {currentYear} <strong className="text-white">RSUD Bukit Kerman</strong>. Seluruh Hak Cipta Dilindungi.
          </p>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            SIMRS Enterprise v2.5
          </span>
        </div>

        {/* Sisi Kanan: Kredit Pengembang (Developer Credit) */}
        <div className="flex items-center space-x-2 text-[11px] text-slate-400">
          <span>Designed &amp; Developed with</span>
          <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
          <span>by</span>
          <span className="text-emerald-400 font-black tracking-wide">Mohd. Ikbal, S.Tr.Kes</span>
        </div>

      </div>
    </footer>
  );
}