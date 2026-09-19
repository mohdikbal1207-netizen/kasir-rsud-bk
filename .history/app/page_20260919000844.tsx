'use client';

import { useState } from 'react';
import { 
  Receipt, 
  CreditCard, 
  Wallet, 
  Lock, 
  Clock, 
  ShieldCheck, 
  QrCode, 
  Building2, 
  LogIn,
  FileText,
  HelpCircle,
  MessageCircle,
  ChevronDown,
  PhoneCall,
  Sparkles,
  Zap,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';

// Import komponen publik
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export default function PublicCashierLandingPage() {
  // State Alur Pembayaran
  const [patientType, setPatientType] = useState<'umum' | 'bpjs'>('umum');

  // State Accordion FAQ
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Apakah pembayaran kasir bisa menggunakan QRIS atau Transfer Bank?',
      a: 'Ya, Kasir BLUD RSUD Bukit Kerman menerima pembayaran tunai, QRIS statis di seluruh loket, serta transfer langsung ke Rekening Resmi BLUD RSUD Bukit Kerman.',
    },
    {
      q: 'Bagaimana jika pasien BPJS mengalami selisih bayar / naik kelas perawatan?',
      a: 'Pasien BPJS Kesehatan yang melakukan naik kelas rawat inap akan dikenakan biaya selisih sesuai ketentuan peraturan perundang-undangan BLUD. Rincian selisih biaya dapat dicetak oleh Petugas Kasir Billing.',
    },
    {
      q: 'Bagaimana cara meminta cetak ulang kuitansi pembayaran yang hilang?',
      a: 'Pasien/keluarga dapat mendatangi Loket Utama Kasir dengan membawa Kartu Identitas (KTP) dan menyebutkan tanggal transaksi atau nomor rekam medis untuk penerbitan salinan kuitansi.',
    },
    {
      q: 'Apakah kuitansi resmi kasir dilengkapi stempel / QR Code validasi?',
      a: 'Seluruh kuitansi yang diterbitkan melalui Sistem Informasi Kasir ini telah dilengkapi tanda tangan digital / stempel resmi BLUD dan kode verifikasi transaksi unik.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Background Decorative Ambient Glows Hijau */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-500/20 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-teal-500/15 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 left-10 w-[400px] h-[400px] bg-lime-500/10 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      {/* 1. HEADER UTAMA */}
      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir &amp; Pembayaran Tarif BLUD"
        badgeText="E-Kasir RSUD"
      />

      {/* 2. KONTEN UTAMA HALAMAN KASIR */}
      <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 space-y-6 sm:space-y-8 mb-8 flex-1 relative z-10">
        
        {/* HERO SECTION BANNER ESTETIK HIJAU */}
        <section className="bg-gradient-to-br from-slate-900/90 via-emerald-950/80 to-teal-950/90 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-950/60 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute -right-12 -bottom-12 opacity-15 pointer-events-none">
            <Receipt className="w-96 h-96 text-emerald-400" />
          </div>
          <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 max-w-2xl space-y-5">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-400/40 px-3.5 py-1.5 rounded-full text-xs text-emerald-300 font-semibold shadow-inner">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Sistem Kasir Resmi Badan Layanan Umum Daerah (BLUD)</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Aplikasi Kasir &amp; Billing <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-300 bg-clip-text text-transparent drop-shadow-sm">
                RSUD Bukit Kerman
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Portal transaksi keuangan terpadu, pencatatan retribusi pelayanan kesehatan, cetak kuitansi resmi, serta pelaporan akuntabilitas penerimaan BLUD RSUD Bukit Kerman.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center space-x-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/30 active:scale-95 cursor-pointer min-h-[46px] border border-emerald-400/40"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk ke Portal Kasir (Login)</span>
              </Link>

              <Link
                href="/daftar"
                className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl transition-all duration-300 shadow-sm active:scale-95 cursor-pointer min-h-[46px]"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Daftar Akun Staf Baru</span>
              </Link>
            </div>
          </div>
        </section>

        {/* STATUS OPERASIONAL LOKET KASIR FULL COLOR HIJAU */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Building2 className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">Status Loket Pembayaran Kasir</h2>
            </div>
            <span className="text-[11px] bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-full font-mono flex items-center gap-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Loket Aktif
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Loket UGD */}
            <div className="bg-gradient-to-br from-slate-900/90 to-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4.5 space-y-2.5 hover:border-emerald-500/60 transition-all duration-300 shadow-xl backdrop-blur-md group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Kasir UGD &amp; Ambulans</span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-semibold">
                  24 Jam
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Pembayaran darurat, tindakan UGD, dan biaya operasional ambulans.</p>
              <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Buka Setiap Hari (Non-Stop)</span>
              </div>
            </div>

            {/* Loket Rawat Jalan */}
            <div className="bg-gradient-to-br from-slate-900/90 to-teal-950/30 border border-teal-500/30 rounded-2xl p-4.5 space-y-2.5 hover:border-teal-500/60 transition-all duration-300 shadow-xl backdrop-blur-md group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors">Kasir Poliklinik Rawat Jalan</span>
                <span className="bg-teal-500/10 text-teal-400 border border-teal-500/30 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-semibold">
                  Shift Pagi
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Karcis pendaftaran, tindakan poliklinik, resep obat, dan laboratorium.</p>
              <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-teal-400 font-mono font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>07.30 - 14.30 WIB</span>
              </div>
            </div>

            {/* Loket Rawat Inap */}
            <div className="bg-gradient-to-br from-slate-900/90 to-lime-950/20 border border-lime-500/30 rounded-2xl p-4.5 space-y-2.5 hover:border-lime-500/60 transition-all duration-300 shadow-xl backdrop-blur-md group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white group-hover:text-lime-300 transition-colors">Kasir Billing Rawat Inap</span>
                <span className="bg-lime-500/10 text-lime-400 border border-lime-500/30 text-[10px] px-2.5 py-0.5 rounded-lg font-mono font-semibold">
                  Shift Operasional
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">Rincian biaya perawatan, selisih bayar BPJS, dan kepulangan pasien.</p>
              <div className="pt-1.5 flex items-center gap-1.5 text-[10px] text-lime-400 font-mono font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>24 Jam (Petugas Jaga Shift)</span>
              </div>
            </div>
          </div>
        </section>

        {/* METODE PEMBAYARAN KASIR ESTETIK */}
        <section className="bg-gradient-to-br from-slate-900/90 via-emerald-950/40 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 space-y-4 shadow-xl backdrop-blur-md">
          <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </div>
            <span>Metode Pembayaran Resmi Kasir BLUD</span>
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center space-x-3 shadow-md hover:border-emerald-400 transition-all">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <Wallet className="w-4 h-4 flex-shrink-0" />
              </div>
              <span className="font-semibold text-slate-200">Tunai / Cash</span>
            </div>

            <div className="bg-gradient-to-br from-teal-950/60 to-slate-900 border border-teal-500/40 p-3.5 rounded-2xl flex items-center space-x-3 shadow-md hover:border-teal-400 transition-all">
              <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
                <QrCode className="w-4 h-4 flex-shrink-0" />
              </div>
              <span className="font-semibold text-slate-200">QRIS Statis Kasir</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-3.5 rounded-2xl flex items-center space-x-3 shadow-md hover:border-emerald-400 transition-all">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                <CreditCard className="w-4 h-4 flex-shrink-0" />
              </div>
              <span className="font-semibold text-slate-200">Transfer Rekening BLUD</span>
            </div>

            <div className="bg-gradient-to-br from-lime-950/50 to-slate-900 border border-lime-500/40 p-3.5 rounded-2xl flex items-center space-x-3 shadow-md hover:border-lime-400 transition-all">
              <div className="p-2 bg-lime-500/20 text-lime-400 rounded-xl">
                <FileText className="w-4 h-4 flex-shrink-0" />
              </div>
              <span className="font-semibold text-slate-200">Klaim BPJS / JKN</span>
            </div>
          </div>
        </section>

        {/* ALUR PEMBAYARAN KASIR INTERAKTIF */}
        <section className="bg-gradient-to-br from-slate-900/90 via-emerald-950/30 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Alur &amp; Prosedur Pembayaran Kasir</h2>
                <p className="text-xs text-slate-400">Petunjuk langkah pembayaran untuk transparansi transaksi BLUD</p>
              </div>
            </div>

            {/* Toggle Tab Pasien */}
            <div className="flex items-center bg-slate-950/90 border border-emerald-500/30 p-1.5 rounded-2xl self-start sm:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => setPatientType('umum')}
                className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-bold cursor-pointer ${
                  patientType === 'umum' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pasien Umum / Tunai
              </button>
              <button
                type="button"
                onClick={() => setPatientType('bpjs')}
                className={`text-xs px-3.5 py-1.5 rounded-xl transition-all font-bold cursor-pointer ${
                  patientType === 'bpjs' 
                    ? 'bg-gradient-to-r from-teal-600 to-lime-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pasien BPJS / JKN
              </button>
            </div>
          </div>

          {patientType === 'umum' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="bg-slate-950/60 border border-emerald-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">Langkah 1</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Pemeriksaan &amp; Nota Tindakan</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Petugas poliklinik/ruangan memberikan Rincian Nota Tindakan kepada pasien/keluarga.</p>
              </div>
              <div className="bg-slate-950/60 border border-emerald-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">Langkah 2</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Penyerahan ke Loket Kasir</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Serahkan Nota ke Petugas Kasir. Pilih metode Tunai, QRIS, atau Transfer BLUD.</p>
              </div>
              <div className="bg-slate-950/60 border border-emerald-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded-lg border border-emerald-500/30 inline-block">Langkah 3</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Penerimaan Kuitansi Resmi</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Kasir memproses transaksi dan menyerahkan Kuitansi Cetak sebagai bukti lunas valid.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="bg-slate-950/60 border border-teal-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-950/90 px-2.5 py-1 rounded-lg border border-teal-500/30 inline-block">Langkah 1</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Klaim Berkas BPJS</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Penjaminan tindakan ditanggung BPJS sesuai tarif INA-CBGs dan regulasi penjaminan.</p>
              </div>
              <div className="bg-slate-950/60 border border-teal-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-950/90 px-2.5 py-1 rounded-lg border border-teal-500/30 inline-block">Langkah 2</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Cek Selisih Bayar (Jika Ada)</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Jika terdapat permintaan naik kelas rawat inap atau obat di luar tanggungan, kasir menghitung selisih resmi.</p>
              </div>
              <div className="bg-slate-950/60 border border-teal-500/20 p-4 rounded-2xl space-y-2 relative overflow-hidden">
                <span className="text-[10px] font-mono font-bold text-teal-300 bg-teal-950/90 px-2.5 py-1 rounded-lg border border-teal-500/30 inline-block">Langkah 3</span>
                <h4 className="font-bold text-xs sm:text-sm text-white">Penerbitan Bukti Bebas Biaya/Kuitansi</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">Kasir menerbitkan Lembar Bebas Biaya atau Kuitansi Selisih Bayar resmi BLUD.</p>
              </div>
            </div>
          )}
        </section>

        {/* PERTANYAAN POPULER (FAQ KASIR BLUD) */}
        <section className="bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl backdrop-blur-md">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white">Pertanyaan Seputar Kasir &amp; Pembayaran</h2>
          </div>

          <div className="space-y-2.5">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-emerald-500/40"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 text-left flex items-center justify-between text-xs sm:text-sm font-semibold text-slate-200 hover:text-white transition cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 flex-shrink-0 ml-2 ${openFaq === idx ? 'rotate-180 text-emerald-400' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-800/50 mt-1 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* HELPDESK & PENGADUAN TRANSAKSI */}
        <section className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-teal-950/90 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 flex-shrink-0 shadow-lg">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Bantuan Transaksi &amp; Kendala Pembayaran</h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                Ada kendala transaksi QRIS, perbedaan rincian biaya, atau butuh bantuan kasir? Hubungi Layanan Keuangan BLUD RSUD Bukit Kerman.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/6282281155614?text=Halo%20Kasir%20RSUD%20Bukit%20Kerman,%20saya%20ingin%20bertanya%20terkait%20transaksi%20pembayaran."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95 min-h-[42px] flex-shrink-0 border border-emerald-400/30"
          >
            <PhoneCall className="w-4 h-4" />
            <span>Kontak Helpdesk Kasir (WA)</span>
          </a>
        </section>

        {/* BANNER LOGIN PETUGAS KASIR */}
        <section className="bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl backdrop-blur-md">
          <div className="flex items-start space-x-3.5">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl text-emerald-300 flex-shrink-0 shadow-lg">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white">Portal Khusus Petugas Kasir &amp; Keuangan BLUD</h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                Silakan login untuk memproses billing pembayaran pasien, mencetak kuitansi resmi, dan input penerimaan kasir harian.
              </p>
            </div>
          </div>

          <Link
            href="/login"
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-6 py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-95 min-h-[42px] flex-shrink-0 border border-emerald-400/30"
          >
            <LogIn className="w-4 h-4" />
            <span>Login Kasir Sekarang</span>
          </Link>
        </section>

      </main>

      {/* 3. FOOTER UTAMA */}
      <PublicFooter />

    </div>
  );
}