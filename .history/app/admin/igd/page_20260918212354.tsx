'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  Ban,
  Activity,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Printer,
  Calendar,
  X,
  CheckSquare,
  Square,
  MessageSquare,
  Filter,
  Trash2,
  ArrowUpDown,
  Copy
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface TransactionItem {
  id: string;
  no_rm?: string;
  nama_pasien?: string;
  poli_tujuan?: string;
  dokter_penanggung_jawab?: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  metode_bayar?: string;
  tanggal_transaksi?: string;
  rincian_layanan?: string;
  jenis_layanan?: string;
  diskon?: number;
  catatan_klinis?: string;
  triase?: 'Merah' | 'Kuning' | 'Hijau';
  penjaminan?: 'Umum' | 'BPJS';
}

export default function AdminIGDPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'all'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterTanggal, setFilterTanggal] = useState<string>('');
  const [triaseFilter, setTriaseFilter] = useState<string>('all');
  const [penjaminanFilter, setPenjaminanFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'terbaru' | 'terlama' | 'tertinggi' | 'terendah'>('terbaru');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // States for selection & detail modal
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TransactionItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      let query = supabase
        .from('transaksi_pasien')
        .select('*')
        .eq('jenis_layanan', 'igd');

      if (activeTab === 'pending') {
        query = query.eq('status_bayar', 'pending');
      } else if (activeTab === 'lunas') {
        query = query.eq('status_bayar', 'lunas');
      }

      const { data, error } = await query.order('tanggal_transaksi', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      setTransactions(data || []);
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memuat data kasir IGD: ${err.message}` });
      } else {
        setMessage({ type: 'error', text: 'Gagal memuat data kasir IGD dari database.' });
      }
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  // Real-time Supabase Subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('transaksi_pasien_igd_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaksi_pasien', filter: 'jenis_layanan=eq.igd' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const handleApprove = async (tx: TransactionItem) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'lunas', metode_bayar: 'verifikasi_admin' })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi IGD ${tx.id} (${tx.nama_pasien}) berhasil disetujui LUNAS.` });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (tx: TransactionItem) => {
    if (!confirm(`Batalkan transaksi ${tx.id}?`)) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'dibatalkan' })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi ${tx.id} dibatalkan.` });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Professional Delete Handler for erroneous cashier entries
  const handleDelete = async (tx: TransactionItem) => {
    if (!confirm(`PERINGATAN: Hapus permanen data kasir ${tx.id} (${tx.nama_pasien}) dari database RSUD Bukit Kerman? Tindakan ini tidak dapat dibatalkan.`)) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .delete()
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Data kasir ${tx.id} berhasil dihapus dari sistem.` });
      setSelectedIds(selectedIds.filter(id => id !== tx.id));
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Batch Approval Handler
  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Setujui ${selectedIds.length} transaksi kasir terpilih menjadi LUNAS secara massal?`)) return;
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        await supabase
          .from('transaksi_pasien')
          .update({ status_bayar: 'lunas', metode_bayar: 'verifikasi_admin_batch' })
          .eq('id', id);
      }
      setMessage({ type: 'success', text: `Berhasil memverifikasi ${selectedIds.length} transaksi kasir secara massal.` });
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Gagal melakukan verifikasi massal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(t => t.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Quick Copy No. RM Handler
  const handleCopyRm = (noRm?: string) => {
    if (!noRm) return;
    navigator.clipboard.writeText(noRm);
    setMessage({ type: 'success', text: `No. RM ${noRm} berhasil disalin ke clipboard.` });
    setTimeout(() => setMessage(null), 3000);
  };

  // WhatsApp Notification Handler
  const handleSendWhatsApp = (tx: TransactionItem) => {
    const text = `Halo RSUD Bukit Kerman, informasi kasir IGD untuk pasien *${tx.nama_pasien}* (No. RM: ${tx.no_rm}) dengan ID Transaksi *${tx.id}* senilai *${formatRupiah(tx.total_biaya)}* status saat ini: *${tx.status_bayar.toUpperCase()}*. Terima kasih.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      const matchSearch = t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDate = !filterTanggal || (t.tanggal_transaksi && t.tanggal_transaksi.includes(filterTanggal));
      const matchTriase = triaseFilter === 'all' || t.triase === triaseFilter;
      const matchPenjaminan = penjaminanFilter === 'all' || t.penjaminan === penjaminanFilter;
      return matchSearch && matchDate && matchTriase && matchPenjaminan;
    });

    // Sorting logic
    return result.sort((a, b) => {
      if (sortBy === 'terbaru') {
        return new Date(b.tanggal_transaksi || 0).getTime() - new Date(a.tanggal_transaksi || 0).getTime();
      } else if (sortBy === 'terlama') {
        return new Date(a.tanggal_transaksi || 0).getTime() - new Date(b.tanggal_transaksi || 0).getTime();
      } else if (sortBy === 'tertinggi') {
        return (b.total_biaya || 0) - (a.total_biaya || 0);
      } else {
        return (a.total_biaya || 0) - (b.total_biaya || 0);
      }
    });
  }, [transactions, searchTerm, filterTanggal, triaseFilter, penjaminanFilter, sortBy]);

  // Statistics calculation with Triase breakdown
  const stats = useMemo(() => {
    const totalPending = transactions.filter(t => t.status_bayar === 'pending').length;
    const totalPendingMerah = transactions.filter(t => t.status_bayar === 'pending' && t.triase === 'Merah').length;
    const totalPendingNominal = transactions
      .filter(t => t.status_bayar === 'pending')
      .reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    const totalLunas = transactions.filter(t => t.status_bayar === 'lunas').length;
    const totalPendapatan = transactions
      .filter(t => t.status_bayar === 'lunas')
      .reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    return { totalPending, totalPendingMerah, totalPendingNominal, totalLunas, totalPendapatan };
  }, [transactions]);

  const handleExportExcel = () => {
    setMessage({ type: 'success', text: `Berhasil mengekspor ${filtered.length} data kasir IGD ke Excel.` });
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <div className="print:hidden">
        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Verifikasi Admin — IGD (Gawat Darurat)"
          badgeText="Admin Pusat"
          showBackButton={true}
        />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24 print:p-0 print:max-w-none">
        
        {/* HEADER & NAVIGATION */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <button 
              onClick={() => router.push('/admin')}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Admin</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Activity className="w-6 h-6 text-amber-600" />
              <span>Verifikasi Pembayaran Kasir IGD</span>
            </h1>
            <p className="text-xs text-slate-500">Pusat audit dan persetujuan data penagihan medis gawat darurat dari kasir (Sinkronisasi Real-Time).</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintReport}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Cetak Laporan
            </button>
            <button
              onClick={handleExportExcel}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Export Excel
            </button>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* STATS METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Kasir</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-2xl font-black text-amber-600">{stats.totalPending} Pasien</p>
                {stats.totalPendingMerah > 0 && (
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded-full">
                    {stats.totalPendingMerah} Darurat Merah
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-1">Potensi: {formatRupiah(stats.totalPendingNominal)}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Telah Diverifikasi Lunas</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.totalLunas} Pasien</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Pendapatan Kasir Lunas</p>
              <p className="text-xl font-black text-slate-900 mt-0.5 font-mono">{formatRupiah(stats.totalPendapatan)}</p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* FILTER & TABS BAR */}
        <div className="bg-white/90 border border-slate-200 rounded-3xl p-4 shadow-sm backdrop-blur-md space-y-3 print:hidden">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending Kasir
              </button>
              <button
                onClick={() => setActiveTab('lunas')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'lunas' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Lunas (Diverifikasi)
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Data Kasir
              </button>

              {selectedIds.length > 0 && activeTab === 'pending' && (
                <button
                  onClick={handleBatchApprove}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Verifikasi Terpilih ({selectedIds.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* SORTING DROPDOWN */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="terbaru">Urutkan: Terbaru</option>
                  <option value="terlama">Urutkan: Terlama</option>
                  <option value="tertinggi">Urutkan: Tagihan Tertinggi</option>
                  <option value="terendah">Urutkan: Tagihan Terendah</option>
                </select>
              </div>

              <div className="relative w-full sm:w-48">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari pasien, No RM..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none font-medium"
                />
              </div>
              <div className="relative w-full sm:w-32">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Filter tgl..." 
                  value={filterTanggal}
                  onChange={(e) => setFilterTanggal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* ADVANCED TRIASE & PENJAMINAN FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-bold flex items-center gap-1"><Filter className="w-3.5 h-3.5" /> Filter Triase:</span>
            {['all', 'Merah', 'Kuning', 'Hijau'].map((t) => (
              <button
                key={t}
                onClick={() => setTriaseFilter(t)}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  triaseFilter === t ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t === 'all' ? 'Semua Triase' : `Triase ${t}`}
              </button>
            ))}

            <span className="text-slate-300 mx-1">|</span>
            <span className="text-slate-400 font-bold">Penjaminan:</span>
            {['all', 'Umum', 'BPJS'].map((p) => (
              <button
                key={p}
                onClick={() => setPenjaminanFilter(p)}
                className={`px-3 py-1 rounded-xl font-bold transition cursor-pointer ${
                  penjaminanFilter === p ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p === 'all' ? 'Semua' : p}
              </button>
            ))}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs flex items-start space-x-2.5 border shadow-sm print:hidden ${
            message.type === 'success' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* SELECT ALL BAR FOR PENDING */}
        {activeTab === 'pending' && filtered.length > 0 && (
          <div className="flex items-center px-4 py-2 bg-slate-100/80 rounded-2xl text-xs font-bold text-slate-700 print:hidden">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              {selectedIds.length === filtered.length ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Pilih Semua di Halaman Ini ({filtered.length} Pasien Kasir)</span>
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-sm font-bold text-slate-700">Belum ada data transaksi kasir IGD yang masuk.</h2>
            <p className="text-xs text-slate-400">Data akan otomatis muncul secara real-time setelah kasir melakukan input tagihan pasien IGD.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tx) => {
              const isSelected = selectedIds.includes(tx.id);
              return (
                <div key={tx.id} className={`bg-white border rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-4 transition ${
                  isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/90'
                }`}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {tx.status_bayar === 'pending' && (
                          <button onClick={() => toggleSelectOne(tx.id)} className="cursor-pointer text-slate-400 hover:text-amber-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4" />}
                          </button>
                        )}
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {tx.status_bayar === 'lunas' ? 'Sudah Diverifikasi' : 'Pending Kasir'}
                        </span>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                        {tx.id}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between items-start gap-1">
                        <h2 className="text-sm font-bold text-slate-900 leading-tight">{tx.nama_pasien || 'Tanpa Nama'}</h2>
                        <div className="flex items-center gap-1">
                          {tx.penjaminan && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 uppercase">
                              {tx.penjaminan}
                            </span>
                          )}
                          {tx.triase && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              tx.triase === 'Merah' ? 'bg-rose-100 text-rose-800 font-extrabold animate-pulse' :
                              tx.triase === 'Kuning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {tx.triase}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <p 
                          onClick={() => handleCopyRm(tx.no_rm)}
                          className="text-xs text-amber-700 font-mono font-semibold cursor-pointer hover:underline flex items-center gap-1"
                          title="Klik untuk salin No. RM"
                        >
                          <span>No. RM: {tx.no_rm || '-'}</span>
                          <Copy className="w-3 h-3 text-amber-500" />
                        </p>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1 text-slate-600">
                      <p>Unit: <strong className="text-slate-800">{tx.poli_tujuan || 'Instalasi Gawat Darurat (IGD)'}</strong></p>
                      <p>Dokter: <strong className="text-slate-800">{tx.dokter_penanggung_jawab || 'Dokter Jaga IGD'}</strong></p>
                      <p className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">{tx.rincian_layanan || 'Pemeriksaan Darurat IGD'}</p>
                      {tx.catatan_klinis && (
                        <p className="text-[10px] text-sky-800 font-medium italic mt-1">Catatan: {tx.catatan_klinis}</p>
                      )}
                    </div>

                    <div className="flex justify-between items-center font-bold text-xs">
                      <span className="text-slate-500">Total Tagihan Kasir:</span>
                      <span className="text-base font-black text-slate-900 font-mono">{formatRupiah(tx.total_biaya)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center gap-1.5">
                    <button
                      onClick={() => setSelectedDetailRecord(tx)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition cursor-pointer"
                      title="Lihat Detail Rincian"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSendWhatsApp(tx)}
                      className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-2xl transition cursor-pointer"
                      title="Kirim Info WhatsApp"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>

                    {tx.status_bayar === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleApprove(tx)}
                          disabled={isSubmitting}
                          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition shadow-md flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4" />
                          <span>Lunas</span>
                        </button>
                        <button
                          onClick={() => handleReject(tx)}
                          disabled={isSubmitting}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-2 rounded-2xl transition flex items-center justify-center cursor-pointer border border-rose-200"
                          title="Batalkan Transaksi"
                        >
                          <Ban className="w-4 h-4 text-rose-500" />
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 text-center py-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-600" />
                        <span>Diverifikasi</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(tx)}
                      disabled={isSubmitting}
                      className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-2xl transition cursor-pointer border border-slate-200"
                      title="Hapus Data Kasir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* DETAIL MODAL */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Rincian Kasir & Verifikasi IGD</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: {selectedDetailRecord.id}</p>
              </div>
              <button onClick={() => setSelectedDetailRecord(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
              <p><span className="font-bold text-slate-500">Nama Pasien:</span> {selectedDetailRecord.nama_pasien}</p>
              <p className="flex items-center gap-2">
                <span className="font-bold text-slate-500">No RM:</span> {selectedDetailRecord.no_rm}
                <button onClick={() => handleCopyRm(selectedDetailRecord.no_rm)} className="text-amber-600 hover:underline font-bold flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Salin
                </button>
              </p>
              <p><span className="font-bold text-slate-500">Triase & Penjaminan:</span> Triase <strong className="text-amber-700">{selectedDetailRecord.triase || 'Hijau'}</strong> ({selectedDetailRecord.penjaminan || 'Umum'})</p>
              <p><span className="font-bold text-slate-500">Dokter Penanggung Jawab:</span> {selectedDetailRecord.dokter_penanggung_jawab || 'Dokter Jaga IGD'}</p>
              <p><span className="font-bold text-slate-500">Rincian Layanan:</span> {selectedDetailRecord.rincian_layanan}</p>
              {selectedDetailRecord.catatan_klinis && (
                <p><span className="font-bold text-slate-500">Catatan Klinis:</span> {selectedDetailRecord.catatan_klinis}</p>
              )}
              {selectedDetailRecord.diskon && selectedDetailRecord.diskon > 0 ? (
                <p><span className="font-bold text-slate-500">Diskon / Potongan Kasir:</span> {formatRupiah(selectedDetailRecord.diskon)}</p>
              ) : null}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                <span>Total Biaya Kasir:</span>
                <span className="font-mono text-emerald-700">{formatRupiah(selectedDetailRecord.total_biaya)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => handleSendWhatsApp(selectedDetailRecord)}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Kirim Info WA
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDetailRecord(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
                {selectedDetailRecord.status_bayar === 'pending' && (
                  <button
                    onClick={() => {
                      handleApprove(selectedDetailRecord);
                      setSelectedDetailRecord(null);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow"
                  >
                    Setujui Lunas Sekarang
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="print:hidden">
        <AdminFooter />
      </div>
    </div>
  );
}