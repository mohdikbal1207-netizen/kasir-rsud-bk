'use client';

import React, { useState } from 'react';
import { 
  ShieldCheck, Cpu, Heart, ArrowUp, HelpCircle, FileText, 
  X, LifeBuoy, BookOpen, PhoneCall, Mail, CheckCircle2 
} from 'lucide-react';

export default function AdminFooter() {
  const currentYear = new Date().getFullYear();
  
  // State untuk modal interaktif Bantuan IT & SOP
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showSopModal, setShowSopModal] = useState<boolean>(false);

  // Fungsi scroll ke atas secara halus
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Modal Bantuan IT */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden p-6 text-slate-800 relative">
            <button 
              onClick={() => setShowHelpModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <LifeBuoy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Pusat Bantuan IT SIMRS</h3>
                <p className="text-[11px] text-slate-500">RSUD Bukit Kerman</p>
              </div>
            </div>
            <div className="space-y-3 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
              <p className="font-medium">Mengalami kendala teknis, error database, atau akses login? Hubungi tim pengembang atau administrator jaringan:</p>
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                <span>Ext. Ruang IT: 102 / WhatsApp Helpdesk</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Mail className="w-3.5 h-3.5 text-emerald-600" />
                <span>rsudbukitkerman@gmail.com</span>
              </div>
            </div>
            <button
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Mengerti &amp; Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Panduan SOP */}
      {showSopModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in print:hidden">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden p-6 text-slate-800 relative">
            <button 
              onClick={() => setShowSopModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Ringkasan SOP Verifikasi</h3>
                <p className="text-[11px] text-slate-500">Standar Operasional Prosedur SIMRS</p>
              </div>
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Validasi Data:</strong> Pastikan NIK, nama pasien, dan nomor registrasi sesuai dengan rekam medis fisik.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Pemeriksaan Tarif:</strong> Periksa rincian biaya tindakan, akomodasi, dan obat sebelum menekan tombol Verifikasi.</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span><strong>Catatan Revisi:</strong> Berikan alasan penolakan/revisi yang jelas agar kasir dapat segera memperbaiki data.</span>
              </div>
            </div>
            <button
              onClick={() => setShowSopModal(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Tutup Panduan
            </button>
          </div>
        </div>
      )}

      {/* Footer Utama */}
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

          {/* Sisi Kanan: Tautan Interaktif, Kredit Pengembang & Tombol Scroll ke Atas */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-slate-400">
            
            {/* Tautan Cepat Interaktif */}
            <div className="flex items-center space-x-3 text-slate-400">
              <button 
                onClick={() => setShowHelpModal(true)}
                className="hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> Bantuan IT
              </button>
              <span>•</span>
              <button 
                onClick={() => setShowSopModal(true)}
                className="hover:text-slate-200 transition cursor-pointer flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Panduan SOP
              </button>
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
    </>
  );
}