'use client';

import { Building2, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function KasirFooter() {
  return (
    <footer className="w-full bg-white/85 border-t border-slate-200/80 backdrop-blur-xl py-6 px-4 sm:px-6 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-800">RSUD Bukit Kerman</span>
          <span>— Modul Keuangan, Billing & Pembayaran Pasien SIMRS v2.5</span>
        </div>

        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1 text-emerald-700 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enkripsi Transaksi Aman</span>
          </span>
          <span>© {new Date().getFullYear()} Kabupaten Kerinci</span>
        </div>
      </div>
    </footer>
  );
}