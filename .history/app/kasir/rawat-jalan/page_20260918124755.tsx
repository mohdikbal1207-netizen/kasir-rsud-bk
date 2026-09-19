'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  Stethoscope,
  Eye,
  X,
  Printer,
  Clock,
  DollarSign,
  UserCheck,
  Users,
  FileText,
  Trash2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Calendar,
  CreditCard,
  Zap,
  LayoutGrid,
  List,
  BarChart3,
  Building2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface TransactionItem {
  id: string;
  no_rm?: string;
  nama_pasien?: string;
  nik?: string;
  alamat?: string;
  jenis_penjaminan?: string;
  no_kartu_bpjs?: string;
  no_sep?: string;
  metode_pembayaran?: string;
  poli_tujuan?: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  catatan_admin?: string;
  tanggal_transaksi?: string;
  petugas_input_nama?: string;
  petugas_input_nip?: string;
  ttd_petugas_url?: string;
  rincian_layanan?: any;
}

interface PasienItem {
  no_rm: string;
  nama_pasien: string;
  nik?: string;
  alamat?: string;
  jenis_penjaminan?: string;
  no_kartu_bpjs?: string;
  created_at?: string;
}

export default function AdminRawatJalanVerification() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'dibatalkan' | 'pasien' | 'semua'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [patients, setPatients] = useState<PasienItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<TransactionItem | null>(null);

  // State Peningkatan UX: Mode Tampilan (Grid vs Tabel Dense) & Modal Statistik Poli
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showStatsModal, setShowStatsModal] = useState<boolean>(false);
  const [isPrintingSummary, setIsPrintingSummary] = useState<boolean>(false);

  // State Filter Tambahan untuk Audit
  const [filterMetode, setFilterMetode] = useState<string>('ALL');
  const [filterTanggal, setFilterTanggal] = useState<string>('');

  // State Batch Selection (Pilih Banyak untuk Verifikasi Massal)
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);

  // State Modal Pembatalan / Penolakan Transaksi
  const [rejectingTx, setRejectingTx] = useState<TransactionItem | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'pasien') {
        const { data: dataPasien, error: errPasien } = await supabase
          .from('pasien')
          .select('*')
          .order('created_at', { ascending: false });

        if (!errPasien && dataPasien) {
          setPatients(dataPasien);
        } else {
          setPatients([]);
        }
      } else {
        let query = supabase
          .from('transaksi_pasien')
          .select('*')
          .eq('jenis_layanan', 'rawat_jalan')
          .order('tanggal_transaksi', { ascending: false });

        if (activeTab !== 'semua') {
          query = query.eq('status_bayar', activeTab);
        }

        const { data, error } = await query;

        if (!error && data) {
          setTransactions(data);
        } else {
          setTransactions([]);
        }
      }
    } catch (err) {
      console.error('Gagal memuat data dari Supabase:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();

    // Real-time Supabase subscription untuk sinkronisasi instan antar loket kasir & admin
    const channel = supabase
      .channel('realtime_admin_verifikasi_rajal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_pasien' }, () => {
        fetchData();
      })
      .subscribe();

    // Tambahan Fitur UX: Keyboard Shortcuts (Ctrl+K untuk fokus pencarian, Esc untuk tutup modal)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (searchInputRef.current) searchInputRef.current.focus();
      }
      if (e.key === 'Escape') {
        setSelectedDetail(null);
        setRejectingTx(null);
        setShowStatsModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchData]);

  // Fitur Verifikasi LUNAS Tunggal
  const handleApprove = async (tx: TransactionItem) => {
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ 
          status_bayar: 'lunas', 
          metode_pembayaran: tx.metode_pembayaran || 'verifikasi_admin_pusat' 
        })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      alert(`Tagihan ${tx.id} (${tx.nama_pasien}) berhasil diverifikasi LUNAS.`);
      fetchData();
      setSelectedDetail(null);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  // Fitur Verifikasi Massal (Batch Approve)
  const handleBatchApprove = async () => {
    if (selectedTxIds.length === 0) return;
    const confirmed = confirm(`Apakah Anda yakin ingin menyetujui ${selectedTxIds.length} transaksi terpilih menjadi LUNAS secara massal?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'lunas' })
        .in('id', selectedTxIds);

      if (error) throw new Error(error.message);
      alert(`Berhasil memverifikasi ${selectedTxIds.length} transaksi menjadi LUNAS.`);
      setSelectedTxIds([]);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Fitur Menolak / Batalkan Transaksi dengan Catatan Admin
  const handleRejectSubmit = async () => {
    if (!rejectingTx) return;
    if (!adminNoteInput.trim()) {
      alert('Harap isi alasan pembatalan/penolakan transaksi!');
      return;
    }

    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({
          status_bayar: 'dibatalkan',
          catatan_admin: adminNoteInput.trim()
        })
        .eq('id', rejectingTx.id);

      if (error) throw new Error(error.message);
      alert(`Transaksi ${rejectingTx.id} telah dibatalkan dengan catatan: "${adminNoteInput}"`);
      setRejectingTx(null);
      setAdminNoteInput('');
      setSelectedDetail(null);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  // Fitur Hapus Data Transaksi Keuangan Secara Permanen
  const handleDeletePermanent = async (tx: TransactionItem) => {
    const confirmed = confirm(
      `PERINGATAN AUDIT KEUANGAN!\nApakah Anda yakin ingin MENGHAPUS PERMANEN data transaksi ${tx.id} (${tx.nama_pasien})?\n\nData yang dihapus tidak dapat dikembalikan lagi.`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .delete()
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      alert(`Data transaksi ${tx.id} berhasil dihapus permanen dari database.`);
      setSelectedDetail(null);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const handlePrint = (tx: TransactionItem) => {
    setIsPrintingSummary(false);
    setSelectedDetail(tx);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Cetak Rekap Laporan Keuangan Harian / Filtered
  const handlePrintSummaryReport = () => {
    setIsPrintingSummary(true);
    setSelectedDetail(null);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Fitur Ekspor ke CSV / Excel untuk Admin
  const handleExportCSV = () => {
    const listToExport = filteredTransactions;
    if (listToExport.length === 0) return;

    const headers = ['ID Transaksi', 'No RM', 'Nama Pasien', 'NIK', 'Poli Tujuan', 'Penjaminan', 'Metode Bayar', 'Tanggal', 'Total Biaya (Rp)', 'Status', 'Catatan Admin'];
    const rows = listToExport.map(t => [
      t.id,
      t.no_rm,
      `"${t.nama_pasien}"`,
      `"${t.nik || '-'}"`,
      `"${t.poli_tujuan}"`,
      t.jenis_penjaminan || 'UMUM',
      t.metode_pembayaran || 'Tunai',
      new Date(t.tanggal_transaksi || '').toLocaleDateString('id-ID'),
      t.total_biaya,
      t.status_bayar,
      `"${t.catatan_admin || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Audit_Rajal_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const formatRupiahTanpaSimbol = (num: number) => {
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num || 0);
  };

  // Filter multi-kriteria (Pencarian, Metode Pembayaran, Tanggal)
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchMetode = filterMetode === 'ALL' || (t.metode_pembayaran || 'Tunai') === filterMetode;
    const matchTanggal = !filterTanggal || (t.tanggal_transaksi && t.tanggal_transaksi.startsWith(filterTanggal));

    return matchSearch && matchMetode && matchTanggal;
  });

  const filteredPatients = patients.filter(p =>
    p.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.nik?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = transactions.filter(t => t.status_bayar === 'pending').length;
  const totalLunas = transactions.filter(t => t.status_bayar === 'lunas').length;
  const totalDibatalkan = transactions.filter(t => t.status_bayar === 'dibatalkan').length;
  
  // Total nominal hanya menghitung transaksi yang aktif (non-dibatalkan)
  const totalNominal = filteredTransactions
    .filter(t => t.status_bayar !== 'dibatalkan')
    .reduce((acc, curr) => acc + Number(curr.total_biaya || 0), 0);

  // Kalkulasi Statistik Poli untuk Rekap / Analytics
  const poliStats = filteredTransactions.reduce((acc: Record<string, { count: number, revenue: number }>, curr) => {
    const poli = curr.poli_tujuan || 'Poli Umum';
    if (!acc[poli]) {
      acc[poli] = { count: 0, revenue: 0 };
    }
    acc[poli].count += 1;
    if (curr.status_bayar !== 'dibatalkan') {
      acc[poli].revenue += Number(curr.total_biaya || 0);
    }
    return acc;
  }, {});

  const handleToggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAllTx = () => {
    if (selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map(t => t.id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-200/30 rounded-full blur-[140px] pointer-events-none -z-10 print:hidden"></div>
      
      <div className="print:hidden">
        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Verifikasi Admin Pusat & Master Data Pasien Rawat Jalan"
          badgeText="Admin Pusat"
          showBackButton={true}
        />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24 print:p-0 print:m-0 print:max-w-none">
        
        {/* BAR HEADER & NAVIGASI TAB */}
        <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <button 
              onClick={() => router.push('/admin')}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Admin</span>
            </button>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Stethoscope className="w-6 h-6 text-teal-600" />
              <span>Audit &amp; Data Pasien Rawat Jalan</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => { setActiveTab('pending'); setSelectedTxIds([]); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending ({totalPending})</span>
            </button>

            <button
              onClick={() => { setActiveTab('lunas'); setSelectedTxIds([]); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'lunas' ? 'bg-teal-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Lunas ({totalLunas})</span>
            </button>

            <button
              onClick={() => { setActiveTab('dibatalkan'); setSelectedTxIds([]); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'dibatalkan' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Dibatalkan ({totalDibatalkan})</span>
            </button>

            <button
              onClick={() => { setActiveTab('pasien'); setSelectedTxIds([]); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'pasien' ? 'bg-emerald-700 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Data Pasien</span>
            </button>

            <button
              onClick={() => { setActiveTab('semua'); setSelectedTxIds([]); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'semua' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* SEARCH BAR, ADVANCED FILTERS & SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex items-center space-x-3">
            <Search className="w-5 h-5 text-slate-400 pl-1" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder={activeTab === 'pasien' ? "Cari No. RM, Nama Pasien, NIK... (Ctrl+K)" : "Cari Nama, No. RM, ID Transaksi... (Ctrl+K)"}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-xs font-medium focus:outline-none"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold pr-2">
                Clear
              </button>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">{activeTab === 'pasien' ? 'Pasien Terdaftar' : 'Jumlah Transaksi'}</p>
              <p className="text-base font-black text-slate-800">
                {activeTab === 'pasien' ? filteredPatients.length : filteredTransactions.length} Data
              </p>
            </div>
            <UserCheck className="w-6 h-6 text-teal-600" />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Akumulasi Nominal</p>
              <p className="text-sm font-black text-emerald-700 font-mono">{formatRupiah(totalNominal)}</p>
            </div>
            <DollarSign className="w-6 h-6 text-emerald-600" />
          </div>
        </div>

        {/* TOOLBAR TAMBAHAN: FILTER, VIEW TOGGLE, STATISTIK & EKSPOR */}
        {activeTab !== 'pasien' && (
          <div className="bg-white/80 border border-slate-200 rounded-2xl p-3.5 shadow-sm backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterMetode}
                  onChange={e => setFilterMetode(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Semua Metode Pembayaran</option>
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Online">Online / Transfer / QRIS</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <input
                  type="date"
                  value={filterTanggal}
                  onChange={e => setFilterTanggal(e.target.value)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none"
                />
                {filterTanggal && (
                  <button type="button" onClick={() => setFilterTanggal('')} className="text-slate-400 hover:text-slate-700 font-bold">×</button>
                )}
              </div>

              {filteredTransactions.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllTx}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0 ? (
                    <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                  ) : (
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Pilih Semua</span>
                </button>
              )}

              {/* TOGGLE TAMPILAN GRID VS TABEL */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Tampilan Kartu (Grid)"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                  title="Tampilan Tabel (Dense)"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
              <button
                type="button"
                onClick={() => setShowStatsModal(true)}
                className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <BarChart3 className="w-4 h-4 text-teal-600" />
                <span>Statistik Poli</span>
              </button>

              <button
                type="button"
                onClick={handlePrintSummaryReport}
                className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center space-x-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {isLoading && (
          <div className="text-center py-16 text-slate-400 font-medium flex flex-col items-center space-y-2 print:hidden">
            <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
            <span>Memuat data real-time dari database...</span>
          </div>
        )}

        {/* TABEL MASTER DATA PASIEN */}
        {!isLoading && activeTab === 'pasien' && (
          filteredPatients.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm print:hidden">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h2 className="text-sm font-bold text-slate-700">Tidak ada data di tabel `pasien`.</h2>
              <p className="text-xs text-slate-400">Data otomatis bertambah ketika ada input transaksi perincian biaya pasien dari kasir.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden print:hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-12 text-center">NO</th>
                      <th className="p-4">NO. REKAM MEDIS</th>
                      <th className="p-4">NAMA PASIEN</th>
                      <th className="p-4">NIK PASIEN</th>
                      <th className="p-4">ALAMAT DOMISILI</th>
                      <th className="p-4 text-center">PENJAMINAN</th>
                      <th className="p-4">NO. BPJS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredPatients.map((p, idx) => (
                      <tr key={p.no_rm} className="hover:bg-slate-50 transition">
                        <td className="p-4 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-4 font-mono font-bold text-teal-700">{p.no_rm}</td>
                        <td className="p-4 font-bold text-slate-900">{p.nama_pasien}</td>
                        <td className="p-4 font-mono text-slate-600">{p.nik || '-'}</td>
                        <td className="p-4 text-slate-600">{p.alamat || '-'}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            p.jenis_penjaminan === 'BPJS' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {p.jenis_penjaminan || 'UMUM'}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-slate-600">{p.no_kartu_bpjs || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

        {/* TRANSAKSI: TAMPILAN GRID ATAU TABEL (DENSE VIEW) */}
        {!isLoading && activeTab !== 'pasien' && (
          filteredTransactions.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm print:hidden">
              <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
              <h2 className="text-sm font-bold text-slate-700">Tidak ada data tagihan ({activeTab}).</h2>
              <p className="text-xs text-slate-400">Belum ada transaksi baru yang diinput dari modul kasir rawat jalan.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
              {filteredTransactions.map(tx => {
                let parsedRincian: any = null;
                try {
                  parsedRincian = typeof tx.rincian_layanan === 'string' ? JSON.parse(tx.rincian_layanan) : tx.rincian_layanan;
                } catch {
                  parsedRincian = null;
                }

                const isSelected = selectedTxIds.includes(tx.id);

                return (
                  <div 
                    key={tx.id} 
                    className={`bg-white border rounded-3xl p-6 shadow-md hover:shadow-xl transition space-y-4 flex flex-col justify-between ${
                      tx.status_bayar === 'dibatalkan' 
                        ? 'border-rose-200 bg-rose-50/20' 
                        : isSelected 
                          ? 'border-2 border-teal-500 bg-teal-50/10' 
                          : 'border-slate-200/90'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <button type="button" onClick={() => handleToggleSelectTx(tx.id)} className="cursor-pointer">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                            )}
                          </button>
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-mono border border-slate-200">{tx.id}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          tx.status_bayar === 'lunas' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : tx.status_bayar === 'dibatalkan'
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {tx.status_bayar === 'lunas' ? 'LUNAS' : tx.status_bayar === 'dibatalkan' ? 'DIBATALKAN' : 'PENDING'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-slate-900">{tx.nama_pasien}</h3>
                        <p className="text-xs text-teal-700 font-mono font-semibold">No. RM: {tx.no_rm} | {tx.poli_tujuan}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Penjamin: <strong>{tx.jenis_penjaminan || 'UMUM'}</strong> ({tx.metode_pembayaran || 'Tunai'})</p>
                      </div>

                      {/* TAMPILKAN CATATAN ADMIN JIKA DIBATALKAN */}
                      {tx.status_bayar === 'dibatalkan' && tx.catatan_admin && (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 space-y-1">
                          <span className="font-bold flex items-center gap-1 text-[11px]">
                            <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                            Alasan Pembatalan:
                          </span>
                          <p className="italic text-[11px] font-medium">{tx.catatan_admin}</p>
                        </div>
                      )}

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1 font-mono">
                        <div className="flex justify-between text-slate-600"><span>Karcis:</span> <span>{formatRupiah(parsedRincian?.karcis || 0)}</span></div>
                        <div className="flex justify-between text-slate-600"><span>Konsultasi:</span> <span>{formatRupiah((parsedRincian?.konsultasi_umum || 0) + (parsedRincian?.konsultasi_spesialis || 0))}</span></div>
                        <div className="flex justify-between text-slate-600"><span>Apotek:</span> <span>{formatRupiah(parsedRincian?.apotek || 0)}</span></div>
                        <div className="flex justify-between font-bold pt-1 border-t border-slate-200 text-slate-900">
                          <span>Total Tagihan:</span>
                          <span className={`font-black ${tx.status_bayar === 'dibatalkan' ? 'line-through text-slate-400' : 'text-teal-700'}`}>
                            {formatRupiah(tx.total_biaya)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDetail(tx)}
                        className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1 cursor-pointer"
                        title="Audit Rincian Biaya Lengkap"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                        <span>Audit</span>
                      </button>

                      {tx.status_bayar === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(tx)}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            <span>Verifikasi</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingTx(tx);
                              setAdminNoteInput('');
                            }}
                            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs rounded-xl transition cursor-pointer"
                            title="Tolak / Batalkan Transaksi"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {tx.status_bayar === 'lunas' && (
                        <button
                          onClick={() => handlePrint(tx)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Printer className="w-4 h-4" />
                          <span>Cetak Dokumen</span>
                        </button>
                      )}

                      {/* Tombol Hapus Permanen */}
                      <button
                        onClick={() => handleDeletePermanent(tx)}
                        className="p-2.5 bg-slate-100 hover:bg-rose-600 hover:text-white text-slate-400 font-bold text-xs rounded-xl transition cursor-pointer"
                        title="Hapus Permanen Data Keuangan Ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* TAMPILAN TABEL DENSE */
            <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden print:hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-4 w-12 text-center">PILIH</th>
                      <th className="p-4">ID / TANGGAL</th>
                      <th className="p-4">PASIEN &amp; NO. RM</th>
                      <th className="p-4">POLI TUJUAN</th>
                      <th className="p-4">PENJAMIN &amp; METODE</th>
                      <th className="p-4 text-right">TOTAL BIAYA</th>
                      <th className="p-4 text-center">STATUS</th>
                      <th className="p-4 text-center">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredTransactions.map(tx => {
                      const isSelected = selectedTxIds.includes(tx.id);
                      return (
                        <tr key={tx.id} className={`hover:bg-slate-50 transition ${isSelected ? 'bg-teal-50/20' : ''}`}>
                          <td className="p-4 text-center">
                            <button type="button" onClick={() => handleToggleSelectTx(tx.id)} className="cursor-pointer">
                              {isSelected ? <CheckSquare className="w-4 h-4 text-teal-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                            </button>
                          </td>
                          <td className="p-4 font-mono">
                            <span className="font-bold text-slate-900">{tx.id}</span>
                            <p className="text-[10px] text-slate-400">{new Date(tx.tanggal_transaksi || '').toLocaleDateString('id-ID')}</p>
                          </td>
                          <td className="p-4">
                            <span className="font-bold text-slate-900 block">{tx.nama_pasien}</span>
                            <span className="font-mono text-teal-700 text-[11px]">RM: {tx.no_rm}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">{tx.poli_tujuan}</td>
                          <td className="p-4">
                            <span className="font-bold text-slate-800">{tx.jenis_penjaminan || 'UMUM'}</span>
                            <p className="text-[10px] text-slate-500">{tx.metode_pembayaran || 'Tunai'}</p>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-teal-700">
                            {formatRupiah(tx.total_biaya)}
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              tx.status_bayar === 'lunas' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : tx.status_bayar === 'dibatalkan'
                                ? 'bg-rose-100 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {tx.status_bayar}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => setSelectedDetail(tx)} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl" title="Audit">
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {tx.status_bayar === 'pending' && (
                                <button onClick={() => handleApprove(tx)} className="p-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl" title="Verifikasi Lunas">
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {tx.status_bayar === 'lunas' && (
                                <button onClick={() => handlePrint(tx)} className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl" title="Cetak">
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button onClick={() => handleDeletePermanent(tx)} className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl" title="Hapus Permanen">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

      </main>

      {/* FLOATING ACTION BAR UNTUK VERIFIKASI MASSAL */}
      {selectedTxIds.length > 0 && activeTab !== 'pasien' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-700 flex items-center justify-between gap-6 z-50 w-11/12 max-w-xl backdrop-blur-lg print:hidden">
          <div>
            <p className="text-xs text-slate-400">{selectedTxIds.length} Transaksi Dipilih</p>
            <p className="text-xs font-bold text-teal-300">Siap untuk verifikasi massal</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSelectedTxIds([])}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleBatchApprove}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-2xl font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-lg"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Setujui Lunas Massal ({selectedTxIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL STATISTIK POLI (ANALYTICS) */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2 text-teal-700 font-bold text-base">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                <h2>Statistik Kunjungan &amp; Pendapatan Poli</h2>
              </div>
              <button onClick={() => setShowStatsModal(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {Object.keys(poliStats).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">Belum ada data transaksi untuk dihitung statistiknya.</p>
              ) : (
                Object.entries(poliStats).map(([poli, stat]: [string, any]) => (
                  <div key={poli} className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-teal-600" />
                        {poli}
                      </h4>
                      <p className="text-[11px] text-slate-500">{stat.count} Pasien / Transaksi</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs font-black text-emerald-700">{formatRupiah(stat.revenue)}</p>
                      <p className="text-[10px] text-slate-400">Akumulasi</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowStatsModal(false)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PENOLAKAN / PEMBATALAN TRANSAKSI */}
      {rejectingTx && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-rose-600 font-bold text-base">
              <AlertTriangle className="w-6 h-6" />
              <h2>Tolak / Batalkan Transaksi</h2>
            </div>

            <p className="text-xs text-slate-600">
              Anda akan membatalkan transaksi <strong className="text-slate-900">{rejectingTx.id}</strong> atas nama pasien <strong className="text-slate-900">{rejectingTx.nama_pasien}</strong>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Catatan Admin / Alasan Pembatalan:</label>
              <textarea
                rows={3}
                placeholder="Contoh: Salah input nominal / Pasien batal berobat / Pembayaran ganda..."
                value={adminNoteInput}
                onChange={e => setAdminNoteInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setRejectingTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleRejectSubmit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition cursor-pointer flex items-center space-x-1"
              >
                <XCircle className="w-4 h-4" />
                <span>Konfirmasi Pembatalan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AUDIT DETAIL PASIEN */}
      {selectedDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-6 h-6 text-teal-600" />
                <h2 className="text-base font-bold text-slate-900">Audit Transaksi ({selectedDetail.id})</h2>
              </div>
              <button 
                onClick={() => setSelectedDetail(null)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2 font-medium">
                <p><span className="text-slate-400">Nama Pasien:</span> <strong className="text-slate-900">{selectedDetail.nama_pasien}</strong></p>
                <p><span className="text-slate-400 font-mono">No. RM:</span> <strong className="font-mono text-slate-900">{selectedDetail.no_rm}</strong></p>
                <p><span className="text-slate-400">Poli Tujuan:</span> <strong className="text-teal-700">{selectedDetail.poli_tujuan}</strong></p>
                <p><span className="text-slate-400">Penjaminan:</span> <strong className="text-slate-900">{selectedDetail.jenis_penjaminan || 'UMUM'}</strong></p>
                <p><span className="text-slate-400">Metode Bayar:</span> <strong className="text-slate-900">{selectedDetail.metode_pembayaran || 'Tunai'}</strong></p>
                <p><span className="text-slate-400">Petugas Input:</span> <strong className="text-slate-900">{selectedDetail.petugas_input_nama || '-'}</strong></p>
              </div>

              {selectedDetail.catatan_admin && (
                <div className="pt-2 border-t border-slate-200 text-rose-800">
                  <span className="font-bold">Catatan Admin Pembatalan:</span> {selectedDetail.catatan_admin}
                </div>
              )}
            </div>

            {(() => {
              let rincian: any = {};
              try {
                rincian = typeof selectedDetail.rincian_layanan === 'string' ? JSON.parse(selectedDetail.rincian_layanan) : selectedDetail.rincian_layanan;
              } catch {
                rincian = {};
              }

              const tindakanArr: any[] = rincian?.tindakan || [];
              const penunjangObj: any = rincian?.penunjang || {};
              const penunjangLainnya: any[] = penunjangObj?.lainnya || [];

              return (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Breakdown Komponen Biaya:</h3>
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-100 font-bold text-slate-700">
                      <tr>
                        <th className="p-2.5 w-10 text-center">NO</th>
                        <th className="p-2.5">URAIAN BIAYA</th>
                        <th className="p-2.5 text-right w-36">JUMLAH (RP)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      <tr>
                        <td className="p-2 text-center font-bold text-slate-400">1.</td>
                        <td className="p-2 font-semibold">Karcis Pendaftaran</td>
                        <td className="p-2 text-right font-mono font-bold">{formatRupiahTanpaSimbol(rincian?.karcis)}</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-center font-bold text-slate-400">2.</td>
                        <td className="p-2 font-semibold">Konsultasi Dokter</td>
                        <td className="p-2 text-right font-mono">{formatRupiahTanpaSimbol((rincian?.konsultasi_umum || 0) + (rincian?.konsultasi_spesialis || 0))}</td>
                      </tr>
                      {tindakanArr.map((t: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 text-center font-mono text-slate-400">3.{idx+1}</td>
                          <td className="p-2 pl-6">Tindakan: {t?.nama || '-'}</td>
                          <td className="p-2 text-right font-mono">{formatRupiahTanpaSimbol(t?.biaya)}</td>
                        </tr>
                      ))}
                      <tr>
                        <td className="p-2 text-center font-bold text-slate-400">4.</td>
                        <td className="p-2 font-semibold">Apotek / Resep Obat Jalan</td>
                        <td className="p-2 text-right font-mono">{formatRupiahTanpaSimbol(rincian?.apotek)}</td>
                      </tr>
                      {['lab', 'usg', 'ekg', 'rontgen', 'fisioterapi'].map((k, idx) => (
                        <tr key={k}>
                          <td className="p-2 text-center font-mono text-slate-400">5.{idx+1}</td>
                          <td className="p-2 pl-6">Penunjang: {k.toUpperCase()}</td>
                          <td className="p-2 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj[k])}</td>
                        </tr>
                      ))}
                      {penunjangLainnya.map((pl: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 text-center font-mono text-slate-400">5.{idx+6}</td>
                          <td className="p-2 pl-6">Penunjang Lainnya: {pl?.nama}</td>
                          <td className="p-2 text-right font-mono">{formatRupiahTanpaSimbol(pl?.biaya)}</td>
                        </tr>
                      ))}
                      <tr className="bg-emerald-50 border-t-2 border-emerald-500 font-bold">
                        <td colSpan={2} className="p-3 text-right text-emerald-900 uppercase">TOTAL BIAYA:</td>
                        <td className="p-3 text-right text-emerald-800 font-mono text-sm">{formatRupiah(selectedDetail.total_biaya)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <button
                onClick={() => handleDeletePermanent(selectedDetail)}
                className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Permanen</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePrint(selectedDetail)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Dokumen</span>
                </button>

                {selectedDetail.status_bayar === 'pending' && (
                  <button
                    onClick={() => handleApprove(selectedDetail)}
                    className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md transition cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Setujui Status Lunas</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* LAYOUT DOKUMEN CETAK (SINGLE INVOICE / REKAP LAPORAN) */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-0 font-serif text-[11pt] leading-snug">
        {isPrintingSummary ? (
          /* REKAP LAPORAN KEUANGAN HARIAN / FILTERED */
          <div className="p-8 max-w-4xl mx-auto space-y-4">
            <div className="border-b-4 border-double border-black pb-2 flex items-center justify-between gap-4">
              <div className="w-16 h-16 flex-shrink-0">
                <img src="/logo-kerinci.png" alt="Logo Kerinci" className="w-full h-full object-contain" />
              </div>
              <div className="text-center flex-1 space-y-0.5">
                <h3 className="text-xs font-bold tracking-wide">PEMERINTAH KABUPATEN KERINCI</h3>
                <h2 className="text-sm font-bold tracking-wide">DINAS KESEHATAN</h2>
                <h1 className="text-base font-black uppercase">RSUD KELAS D BUKIT KERMAN</h1>
                <p className="text-[9pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
              </div>
              <div className="w-16 h-16 flex-shrink-0">
                <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-full h-full object-contain" />
              </div>
            </div>

            <div className="text-center font-bold py-2">
              <p className="underline tracking-wider uppercase text-sm">REKAPITULASI LAPORAN KEUANGAN RAWAT JALAN</p>
              <p className="text-xs font-normal">Kategori Status: {activeTab.toUpperCase()} | Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
            </div>

            <table className="w-full border-collapse border border-black text-[10pt]">
              <thead>
                <tr className="bg-slate-100 font-bold">
                  <th className="border border-black p-1.5 text-center w-10">NO</th>
                  <th className="border border-black p-1.5">ID &amp; TANGGAL</th>
                  <th className="border border-black p-1.5">NAMA PASIEN / RM</th>
                  <th className="border border-black p-1.5">POLI</th>
                  <th className="border border-black p-1.5">PENJAMIN</th>
                  <th className="border border-black p-1.5 text-right">TOTAL (RP)</th>
                  <th className="border border-black p-1.5 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id}>
                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                    <td className="border border-black p-1 font-mono">{tx.id}</td>
                    <td className="border border-black p-1">{tx.nama_pasien} ({tx.no_rm})</td>
                    <td className="border border-black p-1">{tx.poli_tujuan}</td>
                    <td className="border border-black p-1">{tx.jenis_penjaminan || 'UMUM'}</td>
                    <td className="border border-black p-1 text-right font-mono">{formatRupiahTanpaSimbol(tx.total_biaya)}</td>
                    <td className="border border-black p-1 text-center uppercase text-[9pt] font-bold">{tx.status_bayar}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-slate-100">
                  <td colSpan={5} className="border border-black p-2 text-right uppercase">AKUMULASI TOTAL PENDAPATAN:</td>
                  <td colSpan={2} className="border border-black p-2 text-right font-mono text-sm">{formatRupiah(totalNominal)}</td>
                </tr>
              </tbody>
            </table>

            <div className="grid grid-cols-2 text-center text-xs pt-12">
              <div></div>
              <div className="space-y-16">
                <p className="font-bold">Kerinci, {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Mengetahui,<br />Penanggung Jawab / Admin Pusat</p>
                <p className="font-bold pt-8">( __________________________ )</p>
              </div>
            </div>
          </div>
        ) : selectedDetail ? (() => {
          let rincian: any = {};
          try {
            rincian = typeof selectedDetail.rincian_layanan === 'string' ? JSON.parse(selectedDetail.rincian_layanan) : selectedDetail.rincian_layanan;
          } catch {
            rincian = {};
          }

          const tindakanArr: any[] = rincian?.tindakan || [];
          const penunjangObj: any = rincian?.penunjang || {};
          const penunjangLainnya: any[] = penunjangObj?.lainnya || [];

          return (
            <div className="p-8 max-w-3xl mx-auto space-y-4">
              <div className="border-b-4 border-double border-black pb-2 flex items-center justify-between gap-4">
                <div className="w-16 h-16 flex-shrink-0">
                  <img src="/logo-kerinci.png" alt="Logo Kerinci" className="w-full h-full object-contain" />
                </div>
                <div className="text-center flex-1 space-y-0.5">
                  <h3 className="text-xs font-bold tracking-wide">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-bold tracking-wide">DINAS KESEHATAN</h2>
                  <h1 className="text-base font-black uppercase">RSUD KELAS D BUKIT KERMAN</h1>
                  <p className="text-[9pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[8pt]">Website : https://rsudbukitkerman.kerincikab.go.id &nbsp;&nbsp; e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-16 h-16 flex-shrink-0">
                  <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="text-center font-bold py-1">
                <p className="underline tracking-wider uppercase text-sm">PERINCIAN BIAYA PELAYANAN RAWAT JALAN</p>
              </div>

              <div className="text-xs space-y-1 font-mono font-bold w-full max-w-lg">
                <div className="grid grid-cols-12"><span className="col-span-3">NAMA</span><span className="col-span-9">: {selectedDetail.nama_pasien}</span></div>
                <div className="grid grid-cols-12"><span className="col-span-3">NO.MR</span><span className="col-span-9">: {selectedDetail.no_rm}</span></div>
                <div className="grid grid-cols-12"><span className="col-span-3">UMUR</span><span className="col-span-9">: {rincian?.umur || '-'}</span></div>
                <div className="grid grid-cols-12"><span className="col-span-3">RUANG/POLI</span><span className="col-span-9">: {selectedDetail.poli_tujuan}</span></div>
                <div className="grid grid-cols-12"><span className="col-span-3">TANGGAL</span><span className="col-span-9">: {new Date(selectedDetail.tanggal_transaksi || new Date()).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
              </div>

              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="border-b border-black bg-slate-100 font-bold">
                    <th className="border-r border-black p-1.5 w-10 text-center">NO</th>
                    <th className="border-r border-black p-1.5 text-left">URAIAN BIAYA</th>
                    <th className="p-1.5 w-44 text-right">JUMLAH (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-sans">
                  <tr>
                    <td className="border-r border-black p-1 text-center font-bold">1.</td>
                    <td className="border-r border-black p-1 font-semibold">Karcis</td>
                    <td className="p-1 text-right font-mono font-bold">{formatRupiahTanpaSimbol(rincian?.karcis)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 text-center font-bold">2.</td>
                    <td className="border-r border-black p-1 font-semibold">Konsultasi</td>
                    <td className="border-r border-black p-1"></td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">a. Dokter Umum</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(rincian?.konsultasi_umum)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">b. Dokter Spesialis</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(rincian?.konsultasi_spesialis)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 text-center font-bold">3.</td>
                    <td className="border-r border-black p-1 font-semibold">Tindakan</td>
                    <td className="border-r border-black p-1"></td>
                  </tr>
                  {[0, 1, 2, 3, 4].map((i) => {
                    const item = tindakanArr[i];
                    return (
                      <tr key={i}>
                        <td className="border-r border-black p-1"></td>
                        <td className="border-r border-black p-1 pl-6">{i + 1}. {item?.nama || ''}</td>
                        <td className="p-1 text-right font-mono">{item?.biaya ? formatRupiahTanpaSimbol(item.biaya) : ''}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <td className="border-r border-black p-1 text-center font-bold">4.</td>
                    <td className="border-r border-black p-1 font-semibold">Apotek</td>
                    <td className="p-1 text-right font-mono font-bold">{formatRupiahTanpaSimbol(rincian?.apotek)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1 text-center font-bold">5.</td>
                    <td className="border-r border-black p-1 font-semibold">Penunjang Medik</td>
                    <td className="border-r border-black p-1"></td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">1. Laboratorium</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.lab)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">2. USG</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.usg)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">3. EKG</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.ekg)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">4. Rontgen</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.rontgen)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-1"></td>
                    <td className="border-r border-black p-1 pl-6">5. Fisiotherapy</td>
                    <td className="p-1 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.fisioterapi)}</td>
                  </tr>
                  {penunjangLainnya.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border-r border-black p-1"></td>
                      <td className="border-r border-black p-1 pl-6">{idx + 6}. {item?.nama || ''}</td>
                      <td className="p-1 text-right font-mono">{item?.biaya ? formatRupiahTanpaSimbol(item.biaya) : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-black">
                    <td colSpan={2} className="border-r border-black p-2 text-center uppercase">TOTAL</td>
                    <td className="p-2 text-right font-mono text-sm">{formatRupiahTanpaSimbol(selectedDetail.total_biaya)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="grid grid-cols-2 text-center text-xs pt-8">
                <div className="space-y-16">
                  <p className="font-bold">Dokter Poli Klinik</p>
                  <p className="font-bold">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
                </div>
                <div className="space-y-4">
                  <p className="font-bold">Penanggung Jawab</p>
                  {selectedDetail.ttd_petugas_url ? (
                    <div className="h-14 flex items-center justify-center">
                      <img src={selectedDetail.ttd_petugas_url} alt="TTD" className="max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-14"></div>
                  )}
                  <p className="font-bold">( {selectedDetail.petugas_input_nama || 'Petugas Admin'} )</p>
                </div>
              </div>
            </div>
          );
        })() : null}
      </div>

      <div className="print:hidden">
        <AdminFooter />
      </div>
    </div>
  );
}