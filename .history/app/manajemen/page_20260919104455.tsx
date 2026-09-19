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
  X,
  LineChart as LineIcon,
  ArrowUpDown,
  Filter,
  ArrowUp,
  Timer
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
  Legend,
  AreaChart,
  Area,
  ComposedChart, // TAMBAHAN
  Line           // TAMBAHAN
} from 'recharts';
import { supabase } from '@/lib/supabase';
import ManajemenHeader from '@/components/manajemen/ManajemenHeader';
import ManajemenFooter from '@/components/manajemen/ManajemenFooter';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

// Fungsi helper global untuk mengekstrak tanggal secara agresif
const extractDateUtility = (curr: any) => {
  let dateRaw = curr.tanggal || curr.tgl_registrasi || curr.tgl_masuk || curr.waktu_masuk || curr.created_at;
  if (!dateRaw) {
    const possibleDateKey = Object.keys(curr).find(k => 
      k.toLowerCase().includes('tgl') || 
      k.toLowerCase().includes('tanggal') || 
      k.toLowerCase().includes('date') || 
      k.toLowerCase().includes('waktu')
    );
    if (possibleDateKey) {
      dateRaw = curr[possibleDateKey];
    }
  }
  
  if (!dateRaw) return null;

  try {
    if (typeof dateRaw === 'string' && dateRaw.match(/^\d{4}-\d{2}-\d{2}/)) {
       return dateRaw.substring(0, 10);
    }
    const d = new Date(dateRaw);
    if (isNaN(d.getTime())) {
        if (typeof dateRaw === 'string') return dateRaw.split(' ')[0].split('T')[0];
        return null;
    }
    return d.toISOString().split('T')[0];
  } catch(e) {
    return null;
  }
};

// Helper untuk warna lencana triase IGD yang dinamis
const getTriaseColor = (triase: string) => {
  const t = String(triase || '').toLowerCase();
  if (t.includes('merah') || t.includes('p1') || t.includes('resusitasi')) return 'bg-rose-100 text-rose-700 border-rose-200';
  if (t.includes('kuning') || t.includes('p2') || t.includes('urgent')) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (t.includes('hijau') || t.includes('p3') || t.includes('false')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (t.includes('hitam') || t.includes('p0') || t.includes('doa')) return 'bg-slate-800 text-slate-100 border-slate-700';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200'; 
};

export default function ExecutiveManagementDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'rajal' | 'igd' | 'ranap' | 'farmasi'>('overview');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<string>('semua');
  
  const [toastMessage, setToastMessage] = useState<{ title: string, desc: string } | null>(null);

  const [searchRajal, setSearchRajal] = useState<string>('');
  const [searchIgd, setSearchIgd] = useState<string>('');
  const [searchRanap, setSearchRanap] = useState<string>('');

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAutoRefresh, setIsAutoRefresh] = useState(false);

  const [summary, setSummary] = useState<any>({});
  const [rajalData, setRajalData] = useState<any[]>([]);
  const [igdData, setIgdData] = useState<any[]>([]);
  const [ranapData, setRanapData] = useState<any[]>([]);
  const [topObatData, setTopObatData] = useState<any[]>([]);
  
  const [componentBreakdown, setComponentBreakdown] = useState<any[]>([]);
  const [penjaminanDistro, setPenjaminanDistro] = useState<any[]>([]);

  const fetchAllData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setIsRefreshing(true);

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

      const { data: rajalRes } = await supabase.from('vw_detail_pasien_rajal').select('*');
      if (rajalRes) setRajalData(rajalRes);

      const { data: igdRes } = await supabase.from('vw_detail_pasien_igd').select('*');
      if (igdRes) setIgdData(igdRes);

      const { data: ranapRes } = await supabase.from('vw_detail_pasien_ranap').select('*');
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
      
      if (isManualRefresh) {
        setToastMessage({ title: 'Sinkronisasi Selesai', desc: 'Data dashboard berhasil diperbarui secara real-time.' });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.error('Gagal sinkronisasi data eksekutif:', err);
      if (isManualRefresh) {
        setToastMessage({ title: 'Gagal Sinkronisasi', desc: 'Terjadi kesalahan saat mengambil data.' });
        setTimeout(() => setToastMessage(null), 4000);
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAutoRefresh) {
      interval = setInterval(() => {
        fetchAllData(false);
      }, 60000); 
    }
    return () => clearInterval(interval);
  }, [isAutoRefresh, fetchAllData]);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterByDatePeriod = useCallback((data: any[]) => {
    if (filterPeriod === 'semua' || !data) return data;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return data.filter(item => {
      const dateStr = extractDateUtility(item);
      if (!dateStr) return true;
      const itemDate = new Date(dateStr);
      
      if (filterPeriod === 'bulan_ini') {
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
      }
      if (filterPeriod === 'tahun_ini') {
        return itemDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [filterPeriod]);

  const currentRajalData = useMemo(() => filterByDatePeriod(rajalData), [rajalData, filterByDatePeriod]);
  const currentIgdData = useMemo(() => filterByDatePeriod(igdData), [igdData, filterByDatePeriod]);
  const currentRanapData = useMemo(() => filterByDatePeriod(ranapData), [ranapData, filterByDatePeriod]);

  const filteredComponentBreakdown = useMemo(() => {
    if (filterPeriod === 'semua') return componentBreakdown;
    const rajalOmset = currentRajalData.reduce((acc, curr) => acc + Number(curr.total_biaya_rajal || 0), 0);
    const igdOmset = currentIgdData.reduce((acc, curr) => acc + Number(curr.total_biaya_igd || 0), 0);
    const ranapOmset = currentRanapData.reduce((acc, curr) => acc + Number(curr.total_biaya_ranap || 0), 0);
    return [
      { nama: 'Rawat Jalan', nilai: rajalOmset },
      { nama: 'IGD', nilai: igdOmset },
      { nama: 'Rawat Inap', nilai: ranapOmset },
      { nama: 'Obat / Farmasi', nilai: componentBreakdown[3]?.nilai || 0 }, 
    ];
  }, [componentBreakdown, currentRajalData, currentIgdData, currentRanapData, filterPeriod]);

  const filteredGrandTotal = filteredComponentBreakdown.reduce((acc, curr) => acc + curr.nilai, 0);

  // MODIFIKASI: Menambahkan perhitungan jumlah pasien ke dalam data grafik Rajal
  const rajalChartData = useMemo(() => {
    const grouped = currentRajalData.reduce((acc: any, curr: any) => {
      const poli = curr.poli_tujuan || 'Poli Umum';
      if (!acc[poli]) acc[poli] = { nama: poli, nilai: 0, jumlah_pasien: 0 };
      acc[poli].nilai += Number(curr.total_biaya_rajal || 0);
      acc[poli].jumlah_pasien += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => b.nilai - a.nilai);
  }, [currentRajalData]);

  // TAMBAHAN: Kalkulasi Data Distribusi Triase IGD
  const triaseDistro = useMemo(() => {
    const grouped = currentIgdData.reduce((acc: any, curr: any) => {
      const triase = curr.triase || 'Tidak Disebutkan';
      if (!acc[triase]) acc[triase] = { name: triase, value: 0 };
      acc[triase].value += 1;
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => b.value - a.value);
  }, [currentIgdData]);

  // TAMBAHAN: Kalkulasi Data Top 10 Diagnosa Rawat Inap
  const topDiagnosaData = useMemo(() => {
    const grouped = currentRanapData.reduce((acc: any, curr: any) => {
      const diag = curr.diagnosa || 'Diagnosa Belum Diinput';
      if (!acc[diag]) acc[diag] = { nama: diag, jumlah: 0 };
      acc[diag].jumlah += 1;
      return acc;
    }, {});
    return Object.values(grouped)
      .sort((a: any, b: any) => b.jumlah - a.jumlah)
      .slice(0, 10);
  }, [currentRanapData]);

  const trendKunjunganData = useMemo(() => {
    const grouped: Record<string, any> = {};

    const processData = (sourceData: any[], key: 'rajal' | 'igd' | 'ranap') => {
      sourceData.forEach((curr: any) => {
        let date = extractDateUtility(curr);
        if (!date) {
            date = new Date().toISOString().split('T')[0];
        }
        if (!grouped[date]) {
          grouped[date] = { tanggal: date, rajal: 0, igd: 0, ranap: 0 };
        }
        grouped[date][key] += 1;
      });
    };

    processData(currentRajalData, 'rajal');
    processData(currentIgdData, 'igd');
    processData(currentRanapData, 'ranap');
    
    return Object.values(grouped)
      .sort((a: any, b: any) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime())
      .slice(-14)
      .map((item: any) => ({
        ...item,
        tanggalDisplay: new Date(item.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
      }));
  }, [currentRajalData, currentIgdData, currentRanapData]);

  const igdChartData = useMemo(() => {
    const grouped = currentIgdData.reduce((acc: any, curr: any) => {
      const dokter = curr.dokter_pemeriksa || 'Dokter Jaga';
      if (!acc[dokter]) acc[dokter] = { nama: dokter, nilai: 0 };
      acc[dokter].nilai += Number(curr.total_biaya_igd || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => b.nilai - a.nilai);
  }, [currentIgdData]);

  const ranapChartData = useMemo(() => {
    const grouped = currentRanapData.reduce((acc: any, curr: any) => {
      const ruang = curr.ruang || 'Bangsal Umum';
      if (!acc[ruang]) acc[ruang] = { nama: ruang, nilai: 0 };
      acc[ruang].nilai += Number(curr.total_biaya_ranap || 0);
      return acc;
    }, {});
    return Object.values(grouped).sort((a: any, b: any) => b.nilai - a.nilai);
  }, [currentRanapData]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const handlePrintReport = () => window.print();

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
    if (activeTab === 'rajal') handleExportCSV(currentRajalData, 'laporan_rawat_jalan');
    else if (activeTab === 'igd') handleExportCSV(currentIgdData, 'laporan_igd');
    else if (activeTab === 'ranap') handleExportCSV(currentRanapData, 'laporan_rawat_inap');
    else if (activeTab === 'farmasi') handleExportCSV(topObatData, 'laporan_farmasi');
    else handleExportCSV(filteredComponentBreakdown, 'laporan_ringkasan_eksekutif');
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIconClass = (key: string) => {
    return sortConfig?.key === key ? "w-3.5 h-3.5 text-emerald-600 font-black" : "w-3 h-3 text-slate-300";
  };

  const applySortAndFilter = (data: any[], searchVal: string, searchKeys: string[]) => {
    let result = data.filter(item => 
      searchKeys.some(key => String(item[key] || '').toLowerCase().includes(searchVal.toLowerCase()))
    );
    if (sortConfig !== null) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        if (!isNaN(Number(aVal)) && !isNaN(Number(bVal))) {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  };

  const filteredRajal = applySortAndFilter(currentRajalData, searchRajal, ['nama_pasien', 'no_rm', 'poli_tujuan']);
  const filteredIgd = applySortAndFilter(currentIgdData, searchIgd, ['nama_pasien', 'no_rm', 'dokter_pemeriksa']);
  const filteredRanap = applySortAndFilter(currentRanapData, searchRanap, ['nama_pasien', 'no_reg', 'ruang', 'diagnosa']);

  const getFilterLabel = () => {
    if (filterPeriod === 'bulan_ini') return 'Data Bulan Ini';
    if (filterPeriod === 'tahun_ini') return 'Data Tahun Ini';
    return 'Semua Waktu (All-Time)';
  };

  const tooltipStyle = {
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(4px)',
    padding: '10px 14px',
    fontSize: '12px'
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white print:bg-white relative">
      <div className="print:hidden">
        <ManajemenHeader title="RSUD BUKIT KERMAN" subtitle="Executive Management & Analytics 360°" badgeText="Direksi" />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative print:p-0 print:m-0 print:w-full print:max-w-none">
        
        {/* Global Loading Overlay UX */}
        {isRefreshing && (
          <div className="absolute inset-0 z-40 bg-slate-50/60 backdrop-blur-[2px] flex items-center justify-center rounded-3xl transition-all duration-300 print:hidden">
            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-in zoom-in-95">
              <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm font-bold text-slate-700">Sinkronisasi Data...</p>
            </div>
          </div>
        )}

        {/* TOP CONTROL BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden relative overflow-hidden">
          {isAutoRefresh && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 animate-pulse" />}
          
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs px-3 py-1 rounded-xl flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> BLUD RSUD Bukit Kerman
              </span>
              <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-xl flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> Live Sync • {lastUpdatedTime || 'Menghubungkan...'}
              </span>
              <span className="hidden sm:inline-flex bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold px-3 py-1 rounded-xl items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Terverifikasi
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 pt-2">Dashboard Pengawasan Manajemen</h1>
            <p className="text-xs font-medium text-slate-500 mt-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-500" />
              Menampilkan filter aktif: <strong className="text-slate-700">{getFilterLabel()}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                setIsAutoRefresh(!isAutoRefresh);
                if (!isAutoRefresh) setToastMessage({ title: 'Live Mode Aktif', desc: 'Data akan tersinkronisasi otomatis setiap 60 detik.' });
              }}
              className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-2xl border transition cursor-pointer ${isAutoRefresh ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              title="Aktifkan sinkronisasi otomatis per menit"
            >
              <Timer className={`w-4 h-4 ${isAutoRefresh ? 'animate-pulse text-teal-600' : ''}`} />
              <span className="hidden sm:inline">{isAutoRefresh ? 'Auto Sync: ON' : 'Auto Sync: OFF'}</span>
            </button>

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
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>
            <button 
              onClick={handlePrintReport} 
              className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-emerald-100"
              title="Cetak atau Simpan Laporan PDF"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Cetak</span>
            </button>
            <button 
              onClick={() => fetchAllData(true)} 
              disabled={isRefreshing} 
              className="bg-slate-900 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 hover:bg-slate-800 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <button 
              onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} 
              className="bg-rose-50 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer active:scale-95 hover:bg-rose-100"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4 text-rose-500" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 print:hidden scrollbar-hide">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            📊 Ringkasan Eksekutif
          </button>
          <button 
            onClick={() => setActiveTab('rajal')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'rajal' ? 'bg-emerald-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🏥 Detail Rawat Jalan ({currentRajalData.length})
          </button>
          <button 
            onClick={() => setActiveTab('igd')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'igd' ? 'bg-emerald-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🚑 Detail IGD ({currentIgdData.length})
          </button>
          <button 
            onClick={() => setActiveTab('ranap')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'ranap' ? 'bg-emerald-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            🛏️ Detail Rawat Inap ({currentRanapData.length})
          </button>
          <button 
            onClick={() => setActiveTab('farmasi')}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer shrink-0 ${activeTab === 'farmasi' ? 'bg-emerald-600 text-white shadow-md scale-[1.02]' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
          >
            💊 Farmasi & Resep
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 print:space-y-4">
            <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-4">
              <h2 className="text-xl font-black uppercase text-slate-900">Laporan Eksekutif RSUD Bukit Kerman</h2>
              <p className="text-xs text-slate-600 mt-1">Periode Laporan: {getFilterLabel()} • Dicetak: {lastUpdatedTime}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 print:from-white print:to-white print:border print:border-slate-300 rounded-3xl print:rounded-xl p-5 text-white print:text-slate-900 shadow-lg flex items-center justify-between hover:scale-[1.02] transition-transform duration-300 cursor-default">
                <div>
                  <span className="text-[10px] font-bold text-emerald-100 print:text-slate-500 uppercase block">Total Pendapatan RS (Filter)</span>
                  <h3 className="text-2xl font-black font-mono">{formatRupiah(filteredGrandTotal)}</h3>
                  <p className="text-[10px] text-emerald-100 print:text-slate-500 pt-1">Sesuai Filter Periode</p>
                </div>
                <Wallet className="w-8 h-8 text-white/80 print:text-slate-300" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-emerald-300 transition-colors">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Pasien Terdaftar</span>
                  <h3 className="text-2xl font-black text-slate-900 font-mono">{summary.total_pasien_registered || 0} <span className="text-xs font-normal text-slate-500">Orang</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">BPJS: {summary.pasien_bpjs_count || 0} | Umum: {summary.pasien_umum_count || 0}</p>
                </div>
                <Stethoscope className="w-8 h-8 text-emerald-600 print:text-slate-300" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-teal-300 transition-colors">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kunjungan Rawat Inap</span>
                  <h3 className="text-2xl font-black text-teal-700 font-mono">{currentRanapData.length} <span className="text-xs font-normal text-slate-500">Bed</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">Dari filter periode aktif</p>
                </div>
                <BedDouble className="w-8 h-8 text-teal-600 print:text-slate-300" />
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-5 shadow-sm flex items-center justify-between hover:border-amber-300 transition-colors">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Kunjungan IGD Darurat</span>
                  <h3 className="text-2xl font-black text-amber-600 font-mono">{currentIgdData.length} <span className="text-xs font-normal text-slate-500">Pasien</span></h3>
                  <p className="text-[10px] text-slate-500 pt-1">Dari filter periode aktif</p>
                </div>
                <Activity className="w-8 h-8 text-amber-500 print:text-slate-300" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:block">
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4 print:mb-6 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-emerald-600" /> Breakdown Pendapatan Layanan
                </h3>
                <div className="w-full h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredComponentBreakdown} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                      <YAxis 
                        tick={{ fontSize: 10, fill: '#64748B' }} 
                        domain={[0, 'auto']}
                        allowDecimals={false}
                        tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : v >= 1000 ? `Rp${(v/1000).toFixed(0)}Rb` : `Rp${v}`} 
                      />
                      <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Nominal']} contentStyle={tooltipStyle} />
                      <Bar dataKey="nilai" fill="#10B981" radius={[12, 12, 0, 0]} name="Nominal (IDR)">
                        {filteredComponentBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4 flex flex-col justify-between print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-indigo-600" /> Demografi Penjaminan
                </h3>
                <div className="w-full h-56 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={penjaminanDistro} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4}>
                        {penjaminanDistro.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-400 text-center italic bg-slate-50 p-2 rounded-xl print:hidden">Rasio BPJS Kesehatan vs Pasien Umum terdaftar sepanjang waktu.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <LineIcon className="w-4 h-4 text-blue-500" /> Tren Kunjungan Harian (Filter Aktif)
                </h3>
              </div>
              
              <div className="w-full h-72">
                {trendKunjunganData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendKunjunganData} margin={{ top: 15, right: 15, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRajal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorIgd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorRanap" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="tanggalDisplay" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                      <Tooltip 
                        labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}
                        contentStyle={tooltipStyle}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Area type="monotone" dataKey="rajal" name="Rawat Jalan" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRajal)" />
                      <Area type="monotone" dataKey="igd" name="Instalasi Gawat Darurat" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorIgd)" />
                      <Area type="monotone" dataKey="ranap" name="Rawat Inap" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorRanap)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <BarChart2 className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-500">Belum Ada Data Tren</p>
                    <p className="text-xs text-slate-400">Tidak ada kunjungan tercatat pada periode ini.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 print:bg-white print:border print:border-slate-300 rounded-3xl print:rounded-xl p-6 sm:p-8 text-white print:text-slate-900 shadow-xl space-y-6 relative overflow-hidden print:break-inside-avoid">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none print:hidden" />
              <div className="flex items-center justify-between border-b border-slate-700 print:border-slate-300 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-500/20 print:bg-emerald-100 border border-emerald-500/30 print:border-emerald-200 rounded-2xl text-emerald-400 print:text-emerald-700">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white print:text-slate-900 uppercase tracking-wider">Analisis Kinerja & Rekomendasi Strategis BLUD</h3>
                    <p className="text-xs text-slate-400 print:text-slate-500">Evaluasi otomatis berbasis data real-time RSUD Bukit Kerman</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-xl print:hidden">
                  Status: Terverifikasi Aktif
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs leading-relaxed relative z-10">
                <div className="bg-slate-800/60 print:bg-slate-50 border border-slate-700/60 print:border-slate-200 rounded-2xl p-5 space-y-3 hover:bg-slate-800 transition">
                  <div className="flex items-center gap-2 text-emerald-400 print:text-emerald-700 font-bold uppercase tracking-wider text-[11px]">
                    <Wallet className="w-4 h-4" /> Performa Finansial & Pendapatan
                  </div>
                  <p className="text-slate-300 print:text-slate-600">
                    Grand total pendapatan terfilter saat ini tercatat sebesar <strong className="text-white print:text-slate-900">{formatRupiah(filteredGrandTotal)}</strong>, bersumber dari akumulasi layanan. Arus kas BLUD terpantau stabil dengan dominasi transaksi sah.
                  </p>
                </div>

                <div className="bg-slate-800/60 print:bg-slate-50 border border-slate-700/60 print:border-slate-200 rounded-2xl p-5 space-y-3 hover:bg-slate-800 transition">
                  <div className="flex items-center gap-2 text-amber-400 print:text-amber-600 font-bold uppercase tracking-wider text-[11px]">
                    <Activity className="w-4 h-4" /> Kunjungan Gawat Darurat & IGD
                  </div>
                  <p className="text-slate-300 print:text-slate-600">
                    Terdapat <strong className="text-white print:text-slate-900">{currentIgdData.length} pasien IGD</strong> terverifikasi dengan total omset layanan darurat mencapai <strong className="text-white print:text-slate-900">{formatRupiah(filteredComponentBreakdown[1]?.nilai)}</strong>. Ketersediaan layanan penanganan gawat darurat beroperasi normal.
                  </p>
                </div>

                <div className="bg-slate-800/60 print:bg-slate-50 border border-slate-700/60 print:border-slate-200 rounded-2xl p-5 space-y-3 hover:bg-slate-800 transition">
                  <div className="flex items-center gap-2 text-indigo-400 print:text-indigo-600 font-bold uppercase tracking-wider text-[11px]">
                    <FileCheck className="w-4 h-4" /> Administrasi & Penjaminan BPJS
                  </div>
                  <p className="text-slate-300 print:text-slate-600">
                    Komposisi pencatatan terdiri dari <strong className="text-white print:text-slate-900">{summary.pasien_bpjs_count || 0} pasien BPJS</strong> dan <strong className="text-white print:text-slate-900">{summary.pasien_umum_count || 0} pasien Umum</strong> (All-Time). Validasi berkas klaim dan SEP Inap perlu dijaga.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: RAWAT JALAN */}
        {activeTab === 'rajal' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* MODIFIKASI: Composed Chart Korelasi Volume vs Nilai */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" /> Korelasi Kunjungan vs Pendapatan Poli Tujuan
              </h3>
              <div className="w-full h-72">
                {rajalChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={rajalChartData} margin={{ top: 15, right: 15, left: 20, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                      <YAxis 
                        yAxisId="left"
                        tick={{ fontSize: 10, fill: '#10B981' }} 
                        tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                      />
                      <YAxis 
                        yAxisId="right" 
                        orientation="right" 
                        tick={{ fontSize: 10, fill: '#F59E0B' }} 
                        allowDecimals={false}
                      />
                      <Tooltip 
                        formatter={(v: any, name: string) => [
                          name === 'Pendapatan' ? `Rp ${Number(v).toLocaleString('id-ID')}` : `${v} Pasien`, 
                          name
                        ]} 
                        contentStyle={tooltipStyle} 
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      <Bar yAxisId="left" dataKey="nilai" fill="#10B981" radius={[10, 10, 0, 0]} name="Pendapatan" />
                      <Line yAxisId="right" type="monotone" dataKey="jumlah_pasien" stroke="#F59E0B" strokeWidth={3} name="Total Kunjungan" />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-sm font-semibold text-slate-500">Belum Ada Data Rajal</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-emerald-600" /> Data Detail Pasien Rawat Jalan ({filteredRajal.length})
                </h3>
                <div className="relative w-full sm:w-72 print:hidden">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No RM / Poli..." 
                    value={searchRajal}
                    onChange={(e) => setSearchRajal(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  {searchRajal && (
                    <button onClick={() => setSearchRajal('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] print:max-h-none overflow-y-auto rounded-xl border border-slate-200 custom-scrollbar relative">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm print:shadow-none print:border-b print:border-slate-300">
                    <tr>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('no_rm')}>
                        <div className="flex items-center gap-1">No. RM <ArrowUpDown className={getSortIconClass('no_rm')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('nama_pasien')}>
                        <div className="flex items-center gap-1">Nama Pasien <ArrowUpDown className={getSortIconClass('nama_pasien')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('poli_tujuan')}>
                        <div className="flex items-center gap-1">Poli Tujuan <ArrowUpDown className={getSortIconClass('poli_tujuan')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('tanggal')}>
                        <div className="flex items-center gap-1">Tanggal <ArrowUpDown className={getSortIconClass('tanggal')}/></div>
                      </th>
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('total_biaya_rajal')}>
                        <div className="flex items-center justify-end gap-1"><ArrowUpDown className={getSortIconClass('total_biaya_rajal')}/> Total Biaya</div>
                      </th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {filteredRajal.length > 0 ? (
                      filteredRajal.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                          <td className="p-3 font-mono font-bold text-emerald-700">{item.no_rm}</td>
                          <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                          <td className="p-3"><span className="bg-emerald-50 text-emerald-700 print:border print:border-emerald-200 px-2 py-1 rounded-lg font-semibold">{item.poli_tujuan}</span></td>
                          <td className="p-3 text-slate-500">{item.tanggal}</td>
                          <td className="p-3 text-right font-mono font-black text-emerald-600">{formatRupiah(item.total_biaya_rajal)}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-[10px] border border-emerald-200">Verified</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Search className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Tidak ada data pasien yang sesuai pencarian atau filter.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredRajal.length > 0 && (
                    <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] print:shadow-none print:text-slate-900 print:bg-slate-100">
                      <tr>
                        <td colSpan={4} className="p-3 text-right uppercase tracking-wider text-[11px]">Grand Total (Filtered):</td>
                        <td className="p-3 text-right font-mono text-emerald-400 print:text-slate-900 text-sm">
                          {formatRupiah(filteredRajal.reduce((acc, curr) => acc + (Number(curr.total_biaya_rajal) || 0), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: IGD */}
        {activeTab === 'igd' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* MODIFIKASI: Layout 2 Kolom untuk Grafik IGD */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-amber-500" /> Pendapatan Berdasarkan Dokter
                </h3>
                <div className="w-full h-64">
                  {igdChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={igdChartData} margin={{ top: 15, right: 15, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#64748B' }} 
                          tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                        />
                        <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Pendapatan']} contentStyle={tooltipStyle} />
                        <Bar dataKey="nilai" fill="#F59E0B" radius={[10, 10, 0, 0]} name="Pendapatan (IDR)">
                          {igdChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-sm font-semibold text-slate-500">Belum Ada Data IGD</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TAMBAHAN: Grafik Donut Distribusi Triase */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-rose-500" /> Distribusi Triase Gawat Darurat
                </h3>
                <div className="w-full h-64">
                  {triaseDistro.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={triaseDistro} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
                          {triaseDistro.map((entry, index) => {
                            const name = String(entry.name).toLowerCase();
                            let color = '#94a3b8';
                            if (name.includes('merah') || name.includes('p1')) color = '#e11d48';
                            else if (name.includes('kuning') || name.includes('p2')) color = '#d97706';
                            else if (name.includes('hijau') || name.includes('p3')) color = '#10b981';
                            else if (name.includes('hitam') || name.includes('p0')) color = '#0f172a';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Pie>
                        <Tooltip formatter={(v: any) => [`${v} Pasien`, 'Jumlah']} contentStyle={tooltipStyle} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-sm font-semibold text-slate-500">Tidak ada data Triase</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500" /> Data Detail Kunjungan Gawat Darurat IGD ({filteredIgd.length})
                </h3>
                <div className="relative w-full sm:w-72 print:hidden">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No RM / Dokter..." 
                    value={searchIgd}
                    onChange={(e) => setSearchIgd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {searchIgd && (
                    <button onClick={() => setSearchIgd('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] print:max-h-none overflow-y-auto rounded-xl border border-slate-200 custom-scrollbar relative">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm print:shadow-none print:border-b print:border-slate-300">
                    <tr>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('no_rm')}>
                        <div className="flex items-center gap-1">No. RM <ArrowUpDown className={getSortIconClass('no_rm')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('nama_pasien')}>
                        <div className="flex items-center gap-1">Nama Pasien <ArrowUpDown className={getSortIconClass('nama_pasien')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('dokter_pemeriksa')}>
                        <div className="flex items-center gap-1">Dokter Pemeriksa <ArrowUpDown className={getSortIconClass('dokter_pemeriksa')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('triase')}>
                        <div className="flex items-center gap-1">Triase <ArrowUpDown className={getSortIconClass('triase')}/></div>
                      </th>
                      <th className="p-3">Metode Bayar</th>
                      <th className="p-3">Status Bayar</th>
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('total_biaya_igd')}>
                        <div className="flex items-center justify-end gap-1"><ArrowUpDown className={getSortIconClass('total_biaya_igd')}/> Total Biaya</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {filteredIgd.length > 0 ? (
                      filteredIgd.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                          <td className="p-3 font-mono font-bold text-amber-700">{item.no_rm}</td>
                          <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                          <td className="p-3 text-slate-700">{item.dokter_pemeriksa}</td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border ${getTriaseColor(item.triase)}`}>
                              {item.triase || 'Normal'}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-slate-600">{item.metode_bayar}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-md font-bold text-[10px] border ${item.status_bayar?.toLowerCase().includes('lunas') ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                              {item.status_bayar}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-amber-600">{formatRupiah(item.total_biaya_igd)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Search className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Tidak ada data pasien yang sesuai pencarian atau filter.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredIgd.length > 0 && (
                    <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] print:shadow-none print:text-slate-900 print:bg-slate-100">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-[11px]">Grand Total (Filtered):</td>
                        <td className="p-3 text-right font-mono text-amber-400 print:text-slate-900 text-sm">
                          {formatRupiah(filteredIgd.reduce((acc, curr) => acc + (Number(curr.total_biaya_igd) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: RAWAT INAP */}
        {activeTab === 'ranap' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* MODIFIKASI: Layout 2 Kolom untuk Grafik Ranap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-teal-600" /> Pendapatan Berdasarkan Ruangan
                </h3>
                <div className="w-full h-64">
                  {ranapChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ranapChartData} margin={{ top: 15, right: 15, left: 20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="nama" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                        <YAxis 
                          tick={{ fontSize: 10, fill: '#64748B' }} 
                          tickFormatter={(v) => v >= 1000000 ? `Rp${(v/1000000).toFixed(1)}Jt` : `Rp${v}`} 
                        />
                        <Tooltip formatter={(v: any) => [`Rp ${Number(v).toLocaleString('id-ID')}`, 'Total Pendapatan']} contentStyle={tooltipStyle} />
                        <Bar dataKey="nilai" fill="#3B82F6" radius={[10, 10, 0, 0]} name="Pendapatan (IDR)">
                          {ranapChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-sm font-semibold text-slate-500">Belum Ada Data Rawat Inap</p>
                    </div>
                  )}
                </div>
              </div>

              {/* TAMBAHAN: Grafik Horizontal Bar Top 10 Diagnosa */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-500" /> Top 10 Diagnosa Penyakit (Kasus)
                </h3>
                <div className="w-full h-64">
                  {topDiagnosaData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topDiagnosaData} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} allowDecimals={false} />
                        <YAxis dataKey="nama" type="category" tick={{ fontSize: 9, fill: '#64748B' }} width={120} />
                        <Tooltip formatter={(v: any) => [`${v} Pasien`, 'Jumlah Kasus']} contentStyle={tooltipStyle} />
                        <Bar dataKey="jumlah" fill="#14B8A6" radius={[0, 8, 8, 0]} name="Kasus (Pasien)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                      <p className="text-sm font-semibold text-slate-500">Belum Ada Data Diagnosa</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                  <BedDouble className="w-4 h-4 text-teal-600" /> Data Detail Pasien Rawat Inap & Biaya ({filteredRanap.length})
                </h3>
                <div className="relative w-full sm:w-72 print:hidden">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    placeholder="Cari pasien / No Reg / Ruangan..." 
                    value={searchRanap}
                    onChange={(e) => setSearchRanap(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-8 py-2.5 focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  {searchRanap && (
                    <button onClick={() => setSearchRanap('')} className="absolute right-3 top-3.5 text-slate-400 hover:text-rose-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] print:max-h-none overflow-y-auto rounded-xl border border-slate-200 custom-scrollbar relative">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold sticky top-0 z-10 shadow-sm print:shadow-none print:border-b print:border-slate-300">
                    <tr>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('no_reg')}>
                        <div className="flex items-center gap-1">No. Reg <ArrowUpDown className={getSortIconClass('no_reg')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('nama_pasien')}>
                        <div className="flex items-center gap-1">Nama Pasien <ArrowUpDown className={getSortIconClass('nama_pasien')}/></div>
                      </th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('ruang')}>
                        <div className="flex items-center gap-1">Ruangan / Bangsal <ArrowUpDown className={getSortIconClass('ruang')}/></div>
                      </th>
                      <th className="p-3">Diagnosa Utama</th>
                      <th className="p-3 cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('dokter_merawat')}>
                        <div className="flex items-center gap-1">DPJP Dokter <ArrowUpDown className={getSortIconClass('dokter_merawat')}/></div>
                      </th>
                      <th className="p-3">No. SEP BPJS</th>
                      <th className="p-3 text-right cursor-pointer hover:bg-slate-200 transition" onClick={() => requestSort('total_biaya_ranap')}>
                        <div className="flex items-center justify-end gap-1"><ArrowUpDown className={getSortIconClass('total_biaya_ranap')}/> Total Biaya</div>
                      </th>
                      <th className="p-3 text-center">Status Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {filteredRanap.length > 0 ? (
                      filteredRanap.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                          <td className="p-3 font-mono font-bold text-teal-700">{item.no_reg}</td>
                          <td className="p-3 font-bold text-slate-900">{item.nama_pasien}</td>
                          <td className="p-3 font-semibold text-slate-700">{item.ruang}</td>
                          <td className="p-3 text-slate-600 truncate max-w-[150px]" title={item.diagnosa}>{item.diagnosa}</td>
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
                        <td colSpan={8} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Search className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Tidak ada data pasien yang sesuai pencarian atau filter.</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredRanap.length > 0 && (
                    <tfoot className="bg-slate-800 text-white font-bold sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] print:shadow-none print:text-slate-900 print:bg-slate-100">
                      <tr>
                        <td colSpan={6} className="p-3 text-right uppercase tracking-wider text-[11px]">Grand Total (Filtered):</td>
                        <td className="p-3 text-right font-mono text-teal-400 print:text-slate-900 text-sm">
                          {formatRupiah(filteredRanap.reduce((acc, curr) => acc + (Number(curr.total_biaya_ranap) || 0), 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FARMASI */}
        {activeTab === 'farmasi' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <Pill className="w-4 h-4 text-purple-600" /> Top 5 Item Obat / OBHP Paling Sering Keluar
              </h3>
              <div className="w-full h-72">
                {topObatData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topObatData} layout="vertical" margin={{ top: 10, right: 10, left: 30, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#64748B' }} />
                      <YAxis dataKey="nama" type="category" tick={{ fontSize: 10, fill: '#64748B' }} width={110} />
                      <Tooltip formatter={(v: any) => [`${v} Unit`, 'Jumlah Keluar']} contentStyle={tooltipStyle} />
                      <Bar dataKey="jumlah" fill="#8B5CF6" radius={[0, 12, 12, 0]} name="Kuantitas (Unit)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                    <p className="text-sm font-semibold text-slate-500">Belum Ada Data Farmasi</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl print:rounded-xl p-6 shadow-sm space-y-4 print:break-inside-avoid">
              <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-purple-600" /> Rincian Top Item Farmasi
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 uppercase font-bold print:border-b print:border-slate-300">
                    <tr>
                      <th className="p-3">No</th>
                      <th className="p-3">Nama Obat / OBHP</th>
                      <th className="p-3 text-right">Kuantitas Keluar (Unit)</th>
                      <th className="p-3 text-right">Subtotal Estimasi Nilai</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {topObatData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                        <td className="p-3 font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-bold text-slate-900">{item.nama}</td>
                        <td className="p-3 text-right font-mono font-bold text-purple-600">{item.jumlah}</td>
                        <td className="p-3 text-right font-mono text-slate-600">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                    {topObatData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <Pill className="w-10 h-10 opacity-20" />
                            <span className="text-sm font-medium">Belum ada data obat tercatat.</span>
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

      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-out duration-300 print:hidden">
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

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button 
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white p-3 rounded-full shadow-xl hover:bg-slate-800 hover:scale-105 transition-all animate-in fade-in slide-in-from-bottom-5 print:hidden"
          title="Kembali ke atas"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}

      <div className="print:hidden">
        <ManajemenFooter />
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        @media print {
          @page { size: landscape; margin: 1cm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
          ::-webkit-scrollbar { display: none; }
          table { page-break-inside: auto; width: 100%; border-collapse: collapse; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: none !important; }
        }
      `}} />
    </div>
  );
}