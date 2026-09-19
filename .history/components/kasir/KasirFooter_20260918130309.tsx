'use client';

import { Building2, ShieldCheck, Code2 } from 'lucide-react';

interface KasirFooterProps {
  developerName?: string;
  developerAvatar?: string | null;
}

export default function KasirFooter({
  developerName = "Mohd Ikbal",
  developerAvatar = null // Masukkan URL foto atau path bucket jika ada, misal: "/images/ikbal.jpg"
}: KasirFooterProps) {
  return (
    <footer className="w-full bg-white/90 border-t border-slate-200/85 backdrop-blur-xl py-4 px-4 sm:px-6 mt-auto shadow-sm">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        
        {/* Informasi Rumah Sakit & SIMRS */}
        <div className="flex items-center space-x-2 text-center md:text-left">
          <Building2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold text-slate-800">RSUD Bukit Kerman</span>
          <span className="hidden sm:inline">— Modul Keuangan, Billing & Pembayaran Pasien SIMRS v2.5</span>
        </div>

        {/* Kredit Pengembang & Informasi Keamanan */}
        <div className="flex items-center flex-wrap justify-center gap-3">
          
          {/* Badge Pengembang (Mohd Ikbal) */}
          <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl text-slate-700 shadow-xs">
            {developerAvatar ? (
              <img 
                src={developerAvatar} 
                alt={developerName} 
                className="w-5 h-5 rounded-full object-cover border border-emerald-500 shadow-xs flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs flex-shrink-0">
                {developerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-medium text-slate-600">Dev: <span className="font-bold text-slate-900">{developerName}</span></span>
          </div>

          {/* Enkripsi & Hak Cipta */}
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1 text-emerald-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Enkripsi Aman</span>
            </span>
            <span>© {new Date().getFullYear()} Kabupaten Kerinci</span>
          </div>

        </div>

      </div>
    </footer>
  );
}