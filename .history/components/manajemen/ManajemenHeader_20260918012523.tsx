'use client';

import { useRouter } from 'next/navigation';
import { Building2, ArrowLeft, ShieldAlert } from 'lucide-react';

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

  return (
    <header className="w-full bg-white/80 border-b border-slate-200/80 backdrop-blur-xl sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {showBackButton && (
            <button
              onClick={() => router.back()}
              className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition cursor-pointer"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30">
            <Building2 className="w-6 h-6" />
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-black text-slate-900 tracking-tight">{title}</h2>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {badgeText}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 bg-slate-100/80 border border-slate-200 px-3.5 py-1.5 rounded-2xl text-xs font-semibold text-slate-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>BLUD &amp; Akreditasi Utama</span>
        </div>
      </div>
    </header>
  );
}