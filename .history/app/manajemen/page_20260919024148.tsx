'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  LogOut, 
  BedDouble, 
  Stethoscope, 
  RefreshCw, 
  Wallet, 
  Zap, 
  Pill,
  PieChart as PieIcon,
  BarChart2,
  Activity,
  Search,
  FileText,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { supabase } from '@/lib/supabase';
import ManajemenHeader from '@/components/manajemen/ManajemenHeader';
import ManajemenFooter from '@/components/manajemen/ManajemenFooter';

const COLORS = ['#10B981', '#14B8A6', '#F59E0B', '#6366F1', '#EC4899', '#3B82F6'];

export default function ExecutiveManagementDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'rajal' | 'igd' | 'ranap' | 'farmasi'>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // States Data dari Supabase Views
  const [summary, setSummary] = useState<any>({});
  const [rajalData, setRajalData] = useState<any[]>([]);
  const [igdData, setIgdData] = useState<any[]>([]);
  const [ranapData, setRanapData] = useState<any[]>([]);
  const [topObatData, setTopObatData] = useState<any[]>([]);
  const [componentBreakdown, setComponentBreakdown] = useState<any[]>([]);
  const [penjaminanDistro, setPenjaminanDistro] = useState<any[]>([]);

  const fetchAllData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // 1. Fetch Executive Summary View
      const { data: summaryRes } = await supabase
        .from('vw_executive_analytics_360')
        .select('*')
        .maybeSingle();

      if (summaryRes) {
        setSummary(summaryRes);
        setComponentBreakdown([
          { nama: 'Konsul Spesialis', nilai: Number(summaryRes.sum_konsul_spesialis || 0) },
          { nama: 'Apotek Rajal', nilai: Number(summaryRes.sum_apotek_rajal || 0) },
          { nama: 'Laboratorium', nilai: Number(summaryRes.sum_lab || 0) },
          { nama: 'USG', nilai: Number(summaryRes.sum_usg || 0) },
          { nama: 'Konsul Umum', nilai: Number(summaryRes.sum_konsul_umum || 0) },
          { nama: 'Karcis', nilai: Number(summaryRes.sum_karcis || 0) },
        ]);

        setPenjaminanDistro([
          { name: 'BPJS Kesehatan', value: Number(summaryRes.pasien_bpjs_count || 0) },
          { name: 'Pasien Umum', value: Number(summaryRes.pasien_umum_count || 0) },
        ]);
      }

      // 2. Fetch Detail Rawat Jalan
      const { data: rajalRes } = await supabase
        .from('vw_detail_pasien_rajal')
        .select('*')
        .order('tanggal', { ascending: false });
      if (rajalRes) setRajalData(rajalRes);

      // 3. Fetch Detail IGD
      const { data: igdRes } = await supabase
        .from('vw_detail_pasien_igd')
        .select('*')
        .order('tanggal_pemeriksaan', { ascending: false });
      if (igdRes) setIgdData(igdRes);

      // 4. Fetch Detail Rawat Inap
      const { data: ranapRes } = await supabase
        .from('vw_detail_pasien_ranap')
        .select('*')
        .order('masuk_tgl', { ascending: false });
      if (ranapRes) setRanapData(ranapRes);

      // 5. Fetch Top Obat
      const { data: obatRes } = await supabase
        .from('rincian_obat_detail')
        .select('nama_obat_obhp, jumlah, subtotal')
        .order('jumlah', { ascending: false })
        .limit(5);
      if (obatRes) {
        setTopObatData(obatRes.map(o => ({
          nama: o.nama_obat_obhp,
          jumlah: o.jumlah,
          subtotal: Number(o.subtotal || 0)
        })));
      }

      setLastUpdatedTime(new Date().toLocaleTimeString('id-ID'));
    } catch (err) {
      console.error('Gagal sinkronisasi data eksekutif:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <ManajemenHeader title="RSUD BUKIT KERMAN" subtitle="Executive Management & Analytics 360°" badgeText="Direksi" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* TOP CONTROL BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> BLUD RSUD Bukit Kerman
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Live Sync • {lastUpdatedTime || 'Menghubungkan...'}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 pt-2">Dashboard Pengawasan Manajemen</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchAllData} disabled={isRefreshing} className="bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Data</span>
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95">
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            📊 Ringkasan Eksekutif
          </button>
          <button 
            onClick={() => setActiveTab('rajal')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'rajal' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🏥 Detail Rawat Jalan ({rajalData.length})
          </button>
          <button 
            onClick={() => setActiveTab('igd')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'igd' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🚑 Detail IGD ({igdData.length})
          </button>
          <button 
            onClick={() => setActiveTab('ranap')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'ranap' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🛏️ Detail Rawat Inap ({ranapData.length})
          </button>
          <button 
            onClick={() => setActiveTab('farmasi')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'farmasi' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            💊 Farmasi &amp; Resep
          </button>
        </div>

        {/* TAB 1: OVERVIEW & KPI KEUANGAN */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-emerald-100 uppercase block">Grand Total Pendapatan RS</span>
                  <h3 className="text-2xl font-black font-mono">{formatRupiah(summary.grand_total_pendapatan_rs)}</h3>
                  <p className="text-[10px] text-emerald-100 pt-1">Akumulasi Rajal + IGD + Farmasi</p>
                </div>
                <Wallet className="w-8 h-8 text-white/80" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pasien Terdaftar</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono">{summary.total_pasien_registered || 0} <span className="text-xs font-normal text-slate-500">Orang</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">BPJS: {summary.pasien_bpjs_count || 0} | Umum: {summary.pasien_umum_count || 0}</p>
                </div>
                <Stethoscope className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pasien Rawat Inap Aktif</span>
                  <h3 className="text-2xl font-black text-teal-700 font-mono">{summary.total_pasien_ranap || 0} <span className="text-xs font-normal text-slate-500">Bed</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">SEP Lengkap: {summary.ranap_sep_lengkap || 0}</p>
                </div>
                <BedDouble className="w-8 h-8 text-teal-600" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kunjungan IGD Darurat</span>
                  <h3 className="text-2xl font-black text-amber-600 font-mono">{summary.total_pasien_igd || 0} <span className="text-xs font-normal text-slate-500">Pasien</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">Triase Merah (P1): {summary.triase_merah || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" /> Breakdown Pendapatan Komponen Layanan
                </h3>
                <div className="w-full h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={componentBreakdown} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} tickFormatter={(v) => `Rp${v/1000}k`} />
                      <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Nominal']} />
                      <Bar dataKey="nilai" fill="#10B981" radius={[12, 12, 0, 0]} name="Nominal (IDR)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 flex flex-col justify-between">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-indigo-600" /> Demografi Penjaminan Pasien
                </h3>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={penjaminanDistro} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4}>
                        {penjaminanDistro.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-400 text-center italic">Rasio BPJS Kesehatan vs Pasien Umum terdaftar.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TABEL DETAIL RAWAT JALAN */}
        {activeTab === 'rajal' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-600" /> Data Detail Pasien Rawat Jalan (`vw_detail_pasien_rajal`)
              </h3>
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input 
                  type="text" 
                  placeholder="Cari nama pasien / No RM..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-3 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">No. RM</th>
                    <th className="p-3">Nama Pasien</th>
                    <th className="p-3">Poli Tujuan</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3 text-right">Karcis</th>
                    <th className="p-3 text-right">Konsul Spesialis</th>
                    <th className="p-3 text-right">Total Biaya</th>
                    <th className="p-3 rounded-r-xl text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rajalData
                    .filter(item => item.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) || item.no_rm?.includes(searchTerm))
                    .map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-emerald-700">{item.no_rm}</td>
                      <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                      <td className="p-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold">{item.poli_tujuan}</span></td>
                      <td className="p-3 text-slate-500">{item.tanggal}</td>
                      <td className="p-3 text-right font-mono">{formatRupiah(item.karcis)}</td>
                      <td className="p-3 text-right font-mono">{formatRupiah(item.konsultasi_spesialis)}</td>
                      <td className="p-3 text-right font-mono font-black text-emerald-600">{formatRupiah(item.total_biaya_rajal)}</td>
                      <td className="p-3 text-center">
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-semibold">Terkonfirmasi</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: TABEL DETAIL IGD */}
        {activeTab === 'igd' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" /> Data Detail Kunjungan Gawat Darurat IGD (`vw_detail_pasien_igd`)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">No. RM</th>
                    <th className="p-3">Nama Pasien</th>
                    <th className="p-3">Dokter Pemeriksa</th>
                    <th className="p-3">Triase</th>
                    <th className="p-3">Metode Bayar</th>
                    <th className="p-3">Status Bayar</th>
                    <th className="p-3 rounded-r-xl text-right">Total Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {igdData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-amber-700">{item.no_rm}</td>
                      <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                      <td className="p-3 text-slate-700">{item.dokter_pemeriksa}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-lg font-bold text-[10px] ${item.triase?.includes('Merah') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.triase || 'Hijau'}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-600">{item.metode_bayar}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${item.status_bayar === 'Lunas' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                          {item.status_bayar || 'Pending'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-amber-600">{formatRupiah(item.total_biaya_igd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: TABEL DETAIL RAWAT INAP */}
        {activeTab === 'ranap' && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4 animate-in fade-in">
            <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
              <BedDouble className="w-4 h-4 text-teal-600" /> Data Detail Pasien Rawat Inap &amp; Biaya (`vw_detail_pasien_ranap`)
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl">No. Reg</th>
                    <th className="p-3">Nama Pasien</th>
                    <th className="p-3">Ruangan / Bangsal</th>
                    <th className="p-3">Diagnosa Utama</th>
                    <th className="p-3">DPJP Dokter</th>
                    <th className="p-3">No. SEP BPJS</th>
                    <th className="p-3 text-right">Total Biaya</th>
                    <th className="p-3 rounded-r-xl text-center">Status Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ranapData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-teal-700">{item.no_reg}</td>
                      <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                      <td className="p-3 font-semibold text-slate-700">{item.ruang}</td>
                      <td className="p-3 text-slate-600">{item.diagnosa}</td>
                      <td className="p-3 text-slate-700">{item.dokter_merawat}</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">{item.no_sep_bpjs || 'Belum Terbit'}</td>
                      <td className="p-3 text-right font-mono font-black text-teal-600">{formatRupiah(item.total_biaya_ranap)}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-200">
                          {item.status_verifikasi || 'Verified'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: FARMASI */}
        {activeTab === 'farmasi' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" /> Top 5 Item Obat / OBHP Paling Sering Keluar
              </h3>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topObatData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                    <YAxis dataKey="nama" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={110} />
                    <Tooltip formatter={(v: any) => [`${v} Unit`, 'Jumlah Keluar']} />
                    <Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 12, 12, 0]} name="Kuantitas (Unit)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

      </main>

      <ManajemenFooter />
    </div>
  );
}