'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  TrendingUp,
  FileCheck,
  Printer,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  X
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

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

export default function ExecutiveManagementDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'rajal' | 'igd' | 'ranap' | 'farmasi'>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<string>('semua');
  
  // UX Additions: Toast Notification State
  const [toastMessage, setToastMessage] = useState<{ title: string, desc: string } | null>(null);

  // Search states per tab
  const [searchRajal, setSearchRajal] = useState<string>('');
  const [searchIgd, setSearchIgd] = useState<string>('');
  const [searchRanap, setSearchRanap] = useState<string>('');

  const [summary, setSummary] = useState<any>({});
  const [rajalData, setRajalData] = useState<any[]>([]);
  const [igdData, setIgdData] = useState<any[]>([]);
  const [ranapData, setRanapData] = useState<any[]>([]);
  const [topObatData, setTopObatData] = useState<any[]>([]);
  const [componentBreakdown, setComponentBreakdown] = useState<any[]>([]);
  const [penjaminanDistro, setPenjaminanDistro] = useState<any[]>([]);

  const fetchAllData = useCallback(async (isManualRefresh = false) => {
    try {
      setIsRefreshing(true);

      const { data: summaryRes } = await supabase
        .from('vw_executive_analytics_360')
        .select('*')
        .maybeSingle();

      if (summaryRes) {
        setSummary(summaryRes);
        setComponentBreakdown([
          { nama: 'Rawat Jalan', nilai: Number(summaryRes.total_omset_rajal || 0) },
          { nama: 'IGD', nilai: Number(summaryRes.total_omset_igd || 0) },
          { nama: 'Rawat Inap', nilai: Number(summaryRes.total_omset_ranap || 0) },
          { nama: 'Obat / Farmasi', nilai: Number(summaryRes.total_omset_obat || 0) },
        ]);

        setPenjaminanDistro([
          { name: 'BPJS Kesehatan', value: Number(summaryRes.pasien_bpjs_count || 0) },
          { name: 'Pasien Umum', value: Number(summaryRes.pasien_umum_count || 0) },
        ]);
      }

      const { data: rajalRes } = await supabase
        .from('vw_detail_pasien_rajal')
        .select('*');
      if (rajalRes) setRajalData(rajalRes);

      const { data: igdRes } = await supabase
        .from('vw_detail_pasien_igd')
        .select('*');
      if (igdRes) setIgdData(igdRes);

      const { data: ranapRes } = await supabase
        .from('vw_detail_pasien_ranap')
        .select('*');
      if (ranapRes) setRanapData(ranapRes);

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
      
      // Tampilkan notifikasi toast jika refresh manual
      if (isManualRefresh) {
        setToastMessage({ title: 'Sinkronisasi Selesai', desc: 'Data dashboard berhasil diperbarui secara real-time.' });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Gagal sinkronisasi data eksekutif:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Derived Chart Data for Individual Tabs
  const rajalChartData = useMemo(() => {
    const grouped = rajalData.reduce((acc: any, curr: any) => {
      const poli = curr.poli_tujuan || 'Poli Umum';
      if (!acc[poli]) acc[poli] = { nama: poli, nilai: 0 };
      acc[poli].nilai += Number(curr.total_biaya_rajal || 0);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [rajalData]);

  const igdChartData = useMemo(() => {
    const grouped = igdData.reduce((acc: any, curr: any) => {
      const dokter = curr.dokter_pemeriksa || 'Dokter Jaga';
      if (!acc[dokter]) acc[dokter] = { nama: dokter, nilai: 0 };
      acc[dokter].nilai += Number(curr.total_biaya_igd || 0);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [igdData]);

  const ranapChartData = useMemo(() => {
    const grouped = ranapData.reduce((acc: any, curr: any) => {
      const ruang = curr.ruang || 'Bangsal Umum';
      if (!acc[ruang]) acc[ruang] = { nama: ruang, nilai: 0 };
      acc[ruang].nilai += Number(curr.total_biaya_ranap || 0);
      return acc;
    }, {});
    return Object.values(grouped);
  }, [ranapData]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data.length) return alert('Tidak ada data untuk diekspor pada tab ini.');
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportActiveTab = () => {
    if (activeTab === 'rajal') handleExportCSV(rajalData, 'laporan_rawat_jalan');
    else if (activeTab === 'igd') handleExportCSV(igdData, 'laporan_igd');
    else if (activeTab === 'ranap') handleExportCSV(ranapData, 'laporan_rawat_inap');
    else if (activeTab === 'farmasi') handleExportCSV(topObatData, 'laporan_farmasi');
    else handleExportCSV(componentBreakdown, 'laporan_ringkasan_eksekutif');
  };

  // Helper untuk filter data tabel
  const filteredRajal = rajalData.filter(item => item.nama_pasien?.toLowerCase().includes(searchRajal.toLowerCase()) || item.no_rm?.includes(searchRajal) || item.poli_tujuan?.toLowerCase().includes(searchRajal.toLowerCase()));
  const filteredIgd = igdData.filter(item => item.nama_pasien?.toLowerCase().includes(searchIgd.toLowerCase()) || item.no_rm?.includes(searchIgd) || item.dokter_pemeriksa?.toLowerCase().includes(searchIgd.toLowerCase()));
  const filteredRanap = ranapData.filter(item => item.nama_pasien?.toLowerCase().includes(searchRanap.toLowerCase()) || item.no_reg?.includes(searchRanap) || item.ruang?.toLowerCase().includes(searchRanap.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white print:bg-white relative">
      <div className="print:hidden">
        <ManajemenHeader title="RSUD BUKIT KERMAN" subtitle="Executive Management & Analytics 360°" badgeText="Direksi" />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* TOP CONTROL BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> BLUD RSUD Bukit Kerman
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Live Sync • {lastUpdatedTime || 'Menghubungkan...'}
              </span>
              <span className="hidden sm:inline-flex bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold px-3 py-1 rounded-xl items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Status: Terverifikasi
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 pt-2">Dashboard Pengawasan Manajemen</h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center bg-slate-100 border border-slate-200 rounded-2xl px-3 py-2 gap-2 text-xs font-semibold text-slate-600">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Periode:</span>
              <select 
                value={filterPeriod} 
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Waktu</option>
                <option value="bulan_ini">Bulan Ini</option>
                <option value="tahun_ini">Tahun Ini</option>
              </select>
            </div>

            <button 
              onClick={handleExportActiveTab} 
              className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-indigo-100"
              title="Unduh Data Aktif ke CSV"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Ekspor CSV</span>
            </button>
            <button 
              onClick={handlePrintReport} 
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-emerald-100"
              title="Cetak atau Simpan Laporan PDF"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Cetak Laporan</span>
            </button>
            <button 
              onClick={() => fetchAllData(true)} 
              disabled={isRefreshing} 
              className="bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 hover:bg-slate-800 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Sinkronkan Data</span>
            </button>
            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} 
              className="bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-rose-100"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 print:hidden">
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

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between hover:scale-[1.01] transition transform">
                <div>
                  <span className="text-[10px] font-bold text-emerald-100 uppercase block">Grand Total Pendapatan RS</span>
                  <h3 className="text-2xl font-black font-mono">{formatRupiah(summary.grand_total_pendapatan_rs)}</h3>
                  <p className="text-[10px] text-emerald-100 pt-1">Akumulasi Rajal + IGD + Ranap Sah</p>
                </div>
                <Wallet className="w-8 h-8 text-white/80" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between hover:border-emerald-300 transition">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pasien Terdaftar</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono">{summary.total_pasien_registered || 0} <span className="text-xs font-normal text-slate-500">Orang</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">BPJS: {summary.pasien_bpjs_count || 0} | Umum: {summary.pasien_umum_count || 0}</p>
                </div>
                <Stethoscope className="w-8 h-8 text-emerald-600" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between hover:border-teal-300 transition">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Pasien Rawat Inap Aktif</span>
                  <h3 className="text-2xl font-black text-teal-700 font-mono">{summary.total_pasien_ranap || 0} <span className="text-xs font-normal text-slate-500">Bed</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">SEP Lengkap: {summary.ranap_sep_lengkap || 0}</p>
                </div>
                <BedDouble className="w-8 h-8 text-teal-600" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex items-center justify-between hover:border-amber-300 transition">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kunjungan IGD Darurat</span>
                  <h3 className="text-2xl font-black text-amber-600 font-mono">{summary.total_pasien_igd || 0} <span className="text-xs font-normal text-slate-500">Pasien</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">Triase Darurat: {summary.total_pasien_igd || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-amber-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" /> Breakdown Pendapatan (Rajal, IGD, Rawat Inap &amp; Obat)
                </h3>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={componentBreakdown} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748B' }} 
                        domain={[0, 'auto']}
                        allowDecimals={false}
                        tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : v >= 1000 ? `Rp${(v/1000).toFixed(0)}Rb` : `Rp${v}`} 
                      />
                      <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Nominal']} />
                      <Bar dataKey="nilai" fill="#10B981" radius={[12, 12, 0, 0]} name="Nominal (IDR)">
                        {componentBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
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

            {/* MODUL ANALISIS & REKOMENDASI EKSEKUTIF DINAMIS */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white uppercase tracking-wider">Analisis Kinerja &amp; Rekomendasi Strategis BLUD</h3>
                    <p className="text-xs text-slate-400">Evaluasi otomatis berbasis data real-time RSUD Bukit Kerman</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-xl">
                  Status: Terverifikasi Aktif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed">
                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                    <Wallet className="w-4 h-4" /> Performa Finansial &amp; Pendapatan
                  </div>
                  <p className="text-slate-300">
                    Grand total pendapatan RS saat ini tercatat sebesar <strong className="text-white">{formatRupiah(summary.grand_total_pendapatan_rs)}</strong>, bersumber dari akumulasi layanan Rawat Jalan, IGD, dan Inap tervalidasi. Arus kas BLUD terpantau stabil dengan dominasi transaksi sah.
                  </p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-[11px]">
                    <Activity className="w-4 h-4" /> Kunjungan Gawat Darurat &amp; IGD
                  </div>
                  <p className="text-slate-300">
                    Terdapat <strong className="text-white">{summary.total_pasien_igd || 0} pasien IGD</strong> terverifikasi dengan total omset layanan darurat mencapai <strong className="text-white">{formatRupiah(summary.total_omset_igd)}</strong>. Ketersediaan layanan penanganan gawat darurat beroperasi normal.
                  </p>
                </div>

                <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-[11px]">
                    <FileCheck className="w-4 h-4" /> Administrasi &amp; Penjaminan BPJS
                  </div>
                  <p className="text-slate-300">
                    Komposisi pencatatan pasien terdiri dari <strong className="text-white">{summary.pasien_bpjs_count || 0} pasien BPJS</strong> dan <strong className="text-white">{summary.pasien_umum_count || 0} pasien Umum</strong>. Validasi berkas klaim dan SEP Inap aktif perlu dijaga agar proses verifikasi berjalan lancar.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: RAWAT JALAN */}
        {activeTab === 'rajal' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Grafik Pendapatan Berdasarkan Poli Tujuan
              </h3>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rajalChartData} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748B' }} 
                      tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                    />
                    <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Pendapatan']} />
                    <Bar dataKey="nilai" fill="#10B981" radius={[10, 10, 0, 0]} name="Pendapatan (IDR)">
                      {rajalChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" /> Data Detail Pasien Rawat Jalan ({rajalData.length})
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No RM / Poli..." 
                    value={searchRajal}
                    onChange={(e) => setSearchRajal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3">No. RM</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Poli Tujuan</th>
                      <th className="p-3">Tanggal</th>
                      <th className="p-3 text-right">Total Biaya</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRajal.length > 0 ? (
                      filteredRajal.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-emerald-700">{item.no_rm}</td>
                          <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                          <td className="p-3"><span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg font-semibold">{item.poli_tujuan}</span></td>
                          <td className="p-3 text-slate-500">{item.tanggal}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">{formatRupiah(item.total_biaya_rajal)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-200">Verified</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <span>Tidak ada data pasien yang sesuai pencarian.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IGD */}
        {activeTab === 'igd' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-amber-500" /> Grafik Pendapatan Berdasarkan Dokter Pemeriksa IGD
              </h3>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={igdChartData} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748B' }} 
                      tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                    />
                    <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Pendapatan']} />
                    <Bar dataKey="nilai" fill="#F59E0B" radius={[10, 10, 0, 0]} name="Pendapatan (IDR)">
                      {igdChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" /> Data Detail Kunjungan Gawat Darurat IGD ({igdData.length})
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No RM / Dokter..." 
                    value={searchIgd}
                    onChange={(e) => setSearchIgd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3">No. RM</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Dokter Pemeriksa</th>
                      <th className="p-3">Triase</th>
                      <th className="p-3">Metode Bayar</th>
                      <th className="p-3">Status Bayar</th>
                      <th className="p-3 text-right">Total Biaya</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredIgd.length > 0 ? (
                      filteredIgd.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-bold text-amber-700">{item.no_rm}</td>
                          <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                          <td className="p-3 text-slate-700">{item.dokter_pemeriksa}</td>
                          <td className="p-3"><span className="px-2 py-1 rounded-lg font-bold text-[10px] bg-amber-100 text-amber-700">{item.triase}</span></td>
                          <td className="p-3 font-semibold text-slate-600">{item.metode_bayar}</td>
                          <td className="p-3"><span className="px-2 py-1 rounded-md font-bold text-[10px] bg-emerald-100 text-emerald-700">{item.status_bayar}</span></td>
                          <td className="p-3 text-right font-mono font-black text-amber-600">{formatRupiah(item.total_biaya_igd)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <span>Tidak ada data pasien yang sesuai pencarian.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RAWAT INAP */}
        {activeTab === 'ranap' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-teal-600" /> Grafik Pendapatan Berdasarkan Ruangan / Bangsal
              </h3>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ranapChartData} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748B' }} 
                      tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                    />
                    <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Pendapatan']} />
                    <Bar dataKey="nilai" fill="#3B82F6" radius={[10, 10, 0, 0]} name="Pendapatan (IDR)">
                      {ranapChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-teal-600" /> Data Detail Pasien Rawat Inap &amp; Biaya ({ranapData.length})
                </h3>
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No Reg / Ruangan..." 
                    value={searchRanap}
                    onChange={(e) => setSearchRanap(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto max-h-[400px] overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-3">No. Reg</th>
                      <th className="p-3">Nama Pasien</th>
                      <th className="p-3">Ruangan / Bangsal</th>
                      <th className="p-3">Diagnosa Utama</th>
                      <th className="p-3">DPJP Dokter</th>
                      <th className="p-3">No. SEP BPJS</th>
                      <th className="p-3 text-right">Total Biaya</th>
                      <th className="p-3 text-center">Status Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRanap.length > 0 ? (
                      filteredRanap.map((item, idx) => (
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
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Search className="w-8 h-8 opacity-20" />
                            <span>Tidak ada data pasien yang sesuai pencarian.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
              <div className="w-full h-72">
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

            {/* Tambahan UX: Tabel Rincian Data Obat agar eksekutif bisa melihat detail angkanya */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-600" /> Rincian Top Item Farmasi
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Obat / OBHP</th>
                      <th className="p-3 text-right">Kuantitas Keluar (Unit)</th>
                      <th className="p-3 text-right">Subtotal Estimasi Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topObatData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{item.nama}</td>
                        <td className="p-3 text-right font-mono font-bold text-purple-600">{item.jumlah}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* UX Additions: Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-start gap-3 w-80">
            <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
            <div className="flex-1">
              <h4 className="font-bold text-sm">{toastMessage.title}</h4>
              <p className="text-emerald-100 text-xs mt-1 leading-relaxed">{toastMessage.desc}</p>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-200 hover:text-white transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="print:hidden">
        <ManajemenFooter />
      </div>
    </div>
  );
}