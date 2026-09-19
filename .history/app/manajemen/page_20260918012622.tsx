'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  FileText, 
  Users, 
  BarChart3, 
  ShieldCheck, 
  ArrowRight, 
  LogOut, 
  TrendingUp, 
  Activity,
  BedDouble,
  Stethoscope
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ManajemenHeader from '@/components/manajemen/ManajemenHeader';
import ManajemenFooter from '@/components/manajemen/ManajemenFooter';

export default function ManajemenDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalPasienHariIni: 42,
    totalPendapatan: 14500000,
    pegawaiAktif: 85,
    bedTerisi: '78%'
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <ManajemenHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Dashboard Eksekutif & Manajemen Rumah Sakit"
        badgeText="Manajemen"
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8 relative z-10">
        
        {/* Banner Selamat Datang */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-700 text-xs font-bold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Akses Pimpinan &amp; Manajemen BLUD Terverifikasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Portal Pengawasan &amp; Kinerja RSUD
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Pantau laporan pendapatan harian, statistik kunjungan pasien lintas unit, serta indikator mutu pelayanan rumah sakit secara real-time.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center space-x-2 cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Keluar Sesi</span>
          </button>
        </div>

        {/* Kartu Statistik Ringkasan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-5 shadow-sm backdrop-blur-xl space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Kunjungan Pasien Hari Ini</p>
            <h3 className="text-xl font-black text-slate-900">{stats.totalPasienHariIni} Orang</h3>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-5 shadow-sm backdrop-blur-xl space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Estimasi Pendapatan BLUD</p>
            <h3 className="text-xl font-black text-emerald-700">Rp 14.500.000</h3>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-5 shadow-sm backdrop-blur-xl space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Pegawai / Staf Bertugas</p>
            <h3 className="text-xl font-black text-slate-900">{stats.pegawaiAktif} Personel</h3>
          </div>
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-5 shadow-sm backdrop-blur-xl space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase">Okupansi Bed (BOR)</p>
            <h3 className="text-xl font-black text-teal-700">{stats.bedTerisi}</h3>
          </div>
        </div>

        {/* Grid Modul Manajemen */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">
            Modul Eksekutif &amp; Laporan
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Laporan Keuangan & Kasir */}
            <div 
              onClick={() => router.push('/admin/kasir')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-emerald-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    Audit Keuangan &amp; Billing
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tinjau rekapitulasi transaksi pembayaran pasien dari seluruh unit layanan rumah sakit.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Audit Keuangan</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* 2. Monitoring Staf & Kinerja */}
            <div 
              onClick={() => router.push('/admin/users')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-teal-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-2xl text-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                  <Users className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                    Manajemen Kepegawaian
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Evaluasi data kepegawaian, verifikasi akun baru, dan pemantauan sesi aktif staf.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Kepegawaian</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* 3. Indikator Mutu & Akreditasi */}
            <div className="bg-white/60 border border-slate-200/70 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden opacity-90">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Indikator Mutu RS
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Laporan pencapaian standar pelayanan minimal (SPM) dan dokumen akreditasi utama.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-indigo-600 flex items-center justify-between">
                <span>Segera Terintegrasi</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>

      </main>

      <ManajemenFooter />
    </div>
  );
}