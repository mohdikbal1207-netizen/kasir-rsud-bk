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
  Copy,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Receipt,
  Clock,
  Radio,
  BarChart3,
  Volume2,
  VolumeX,
  TrendingUp,
  UserCheck,
  Plus,
  Download,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface DetailItem {
  id: number;
  pemeriksaan_id: number;
  tindakan_id: number;
  jumlah_qty: number;
  tarif_satuan: number;
  subtotal: number;
}

interface TransactionItem {
  id: string; // IGD-{id}
  db_id: number;
  no_rm?: string;
  nama_pasien?: string;
  ttl?: string;
  alamat?: string;
  dokter_pemeriksa?: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  status_verifikasi?: string;
  metode_bayar?: string;
  tanggal_transaksi?: string;
  triase?: 'Merah' | 'Kuning' | 'Hijau';
  penjaminan?: 'Umum' | 'BPJS';
  detail_pemeriksaan_igd?: DetailItem[];
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
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  
  // Audio Notification State
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // Pagination states
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // States for selection, detail, receipt, analytics, new entry, & export modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TransactionItem | null>(null);
  const [receiptRecord, setReceiptRecord] = useState<TransactionItem | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState<boolean>(false);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState<boolean>(false);

  // Form states for manual entry
  const [newTx, setNewTx] = useState({
    no_rm: '',
    nama_pasien: '',
    ttl: '',
    alamat: '',
    dokter_pemeriksa: '',
    total_biaya: 0,
    triase: 'Hijau' as 'Merah' | 'Kuning' | 'Hijau',
    penjaminan: 'Umum' as 'Umum' | 'BPJS',
    metode_bayar: 'Tunai / Cash'
  });

  // Date range state for custom export modal
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const playEmergencyBeep = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchData = useCallback(async () => {
  setIsLoading(true);
  setMessage(null);
  try {
    const { data, error } = await supabase
      .from('pemeriksaan_igd_header')
      .select(`
        *,
        detail_pemeriksaan_igd (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    if (data) {
      const mapped: TransactionItem[] = data.map((h: any) => {
        // Toleransi casing & variasi status dari database/kasir
        const statusRaw = String(h.status_bayar || '').toLowerCase();
        const verifikasiRaw = String(h.status_verifikasi || '').toLowerCase();

        const isLunas = verifikasiRaw === 'disetujui' || statusRaw === 'lunas';

        return {
          id: `IGD-${h.id}`,
          db_id: h.id,
          no_rm: h.no_rm || '',
          nama_pasien: h.nama_pasien || '',
          ttl: h.ttl || '',
          alamat: h.alamat || '',
          dokter_pemeriksa: h.dokter_pemeriksa || 'Dokter Jaga IGD',
          total_biaya: Number(h.total_biaya || 0),
          status_bayar: isLunas ? 'lunas' : 'pending',
          status_verifikasi: h.status_verifikasi || 'Menunggu Verifikasi',
          metode_bayar: h.metode_bayar || 'Tunai / Cash',
          tanggal_transaksi: h.tanggal_pemeriksaan || h.created_at || '',
          triase: h.triase || 'Hijau',
          penjaminan: h.penjaminan || 'Umum',
          detail_pemeriksaan_igd: h.detail_pemeriksaan_igd || []
        };
      });

      setTransactions(mapped); // Simpan SELURUH data di state
    } else {
      setTransactions([]);
    }
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
}, []); // Hapus dependency activeTab di sini

  // Real-time Supabase Subscription
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('pemeriksaan_igd_header_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pemeriksaan_igd_header' },
        (payload) => {
          setIsRealtimeActive(true);
          if (payload.new && (payload.new as any).triase === 'Merah') {
            playEmergencyBeep();
          }
          fetchData();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsRealtimeActive(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setIsRealtimeActive(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData, audioEnabled]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const handleApprove = async (tx: TransactionItem) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pemeriksaan_igd_header')
        .update({ status_verifikasi: 'Disetujui', status_bayar: 'Lunas' })
        .eq('id', tx.db_id);

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
        .from('pemeriksaan_igd_header')
        .update({ status_verifikasi: 'Direvisi', status_bayar: 'Dibatalkan' })
        .eq('id', tx.db_id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi ${tx.id} dibatalkan / direvisi.` });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tx: TransactionItem) => {
    if (!confirm(`PERINGATAN: Hapus permanen data kasir ${tx.id} (${tx.nama_pasien}) dari database RSUD Bukit Kerman? Tindakan ini tidak dapat dibatalkan.`)) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pemeriksaan_igd_header')
        .delete()
        .eq('id', tx.db_id);

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

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Setujui ${selectedIds.length} transaksi kasir terpilih menjadi LUNAS secara massal?`)) return;
    setIsSubmitting(true);
    try {
      for (const id of selectedIds) {
        const item = transactions.find(t => t.id === id);
        if (item) {
          await supabase
            .from('pemeriksaan_igd_header')
            .update({ status_verifikasi: 'Disetujui', status_bayar: 'Lunas' })
            .eq('id', item.db_id);
        }
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

  const handleCreateNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.nama_pasien || !newTx.total_biaya) {
      setMessage({ type: 'error', text: 'Nama Pasien dan Total Biaya wajib diisi.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        no_rm: newTx.no_rm,
        nama_pasien: newTx.nama_pasien,
        ttl: newTx.ttl,
        alamat: newTx.alamat,
        tanggal_pemeriksaan: new Date().toISOString().split('T')[0],
        dokter_pemeriksa: newTx.dokter_pemeriksa || 'Dokter Jaga IGD',
        triase: newTx.triase,
        metode_bayar: newTx.metode_bayar,
        penjaminan: newTx.penjaminan,
        total_biaya: newTx.total_biaya,
        status_bayar: 'Lunas',
        status_verifikasi: 'Menunggu Verifikasi'
      };

      const { error } = await supabase.from('pemeriksaan_igd_header').insert([payload]);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi IGD baru untuk pasien ${newTx.nama_pasien} berhasil ditambahkan.` });
      setShowNewEntryModal(false);
      setNewTx({
        no_rm: '',
        nama_pasien: '',
        ttl: '',
        alamat: '',
        dokter_pemeriksa: '',
        total_biaya: 0,
        triase: 'Hijau',
        penjaminan: 'Umum',
        metode_bayar: 'Tunai / Cash'
      });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
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

  const handleCopyRm = (noRm?: string) => {
    if (!noRm) return;
    navigator.clipboard.writeText(noRm);
    setMessage({ type: 'success', text: `No. RM ${noRm} berhasil disalin ke clipboard.` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSendWhatsApp = (tx: TransactionItem) => {
    const text = `Halo RSUD Bukit Kerman, informasi kasir IGD untuk pasien *${tx.nama_pasien}* (No. RM: ${tx.no_rm}) dengan ID Transaksi *${tx.id}* senilai *${formatRupiah(tx.total_biaya)}* status saat ini: *${tx.status_bayar.toUpperCase()}*. Terima kasih.`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFilterToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setFilterTanggal(todayStr);
    setCurrentPage(1);
    setMessage({ type: 'success', text: `Menampilkan transaksi IGD khusus hari ini (${todayStr}).` });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFilterMonth = () => {
    const monthStr = new Date().toISOString().slice(0, 7);
    setFilterTanggal(monthStr);
    setCurrentPage(1);
    setMessage({ type: 'success', text: `Menampilkan transaksi IGD bulan ini (${monthStr}).` });
    setTimeout(() => setMessage(null), 3000);
  };

  const filtered = useMemo(() => {
  let result = transactions.filter(t => {
    // 1. Filter Tab
    const matchTab = activeTab === 'all' || t.status_bayar === activeTab;

    // 2. Filter Pencarian
    const matchSearch = 
      t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());

    // 3. Filter Tanggal, Triase, & Penjaminan
    const matchDate = !filterTanggal || (t.tanggal_transaksi && t.tanggal_transaksi.includes(filterTanggal));
    const matchTriase = triaseFilter === 'all' || t.triase === triaseFilter;
    const matchPenjaminan = penjaminanFilter === 'all' || t.penjaminan === penjaminanFilter;

    return matchTab && matchSearch && matchDate && matchTriase && matchPenjaminan;
  });

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
}, [transactions, activeTab, searchTerm, filterTanggal, triaseFilter, penjaminanFilter, sortBy]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    if (itemsPerPage === 0) return filtered;
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(filtered.length / itemsPerPage);

  const stats = useMemo(() => {
    const allTransactions = transactions;
    const pendingList = allTransactions.filter(t => t.status_bayar === 'pending');
    const lunasList = allTransactions.filter(t => t.status_bayar === 'lunas');

    const totalPending = pendingList.length;
    const totalPendingMerah = pendingList.filter(t => t.triase === 'Merah').length;
    const totalPendingNominal = pendingList.reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    
    const totalLunas = lunasList.length;
    const totalPendapatan = lunasList.reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    const totalAll = allTransactions.length;

    return { totalPending, totalPendingMerah, totalPendingNominal, totalLunas, totalPendapatan, totalAll };
  }, [transactions]);

  // Analytics calculation for modal
  const analyticsData = useMemo(() => {
    const bpjsTxs = filtered.filter(t => t.penjaminan === 'BPJS');
    const umumTxs = filtered.filter(t => t.penjaminan === 'Umum' || !t.penjaminan);
    
    const totalBpjsNominal = bpjsTxs.reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    const totalUmumNominal = umumTxs.reduce((sum, t) => sum + (t.total_biaya || 0), 0);

    const doctorMap: { [key: string]: { count: number; total: number } } = {};
    filtered.forEach(t => {
      const doc = t.dokter_pemeriksa || 'Dokter Jaga IGD';
      if (!doctorMap[doc]) doctorMap[doc] = { count: 0, total: 0 };
      doctorMap[doc].count += 1;
      doctorMap[doc].total += (t.total_biaya || 0);
    });

    return {
      bpjsCount: bpjsTxs.length,
      bpjsTotal: totalBpjsNominal,
      umumCount: umumTxs.length,
      umumTotal: totalUmumNominal,
      doctorBreakdown: Object.entries(doctorMap).map(([name, data]) => ({ name, ...data }))
    };
  }, [filtered]);

  // Export Handler with Filter Options
  const handleExportCustom = () => {
    let dataToExport = filtered;

    if (exportStartDate || exportEndDate) {
      dataToExport = dataToExport.filter(t => {
        if (!t.tanggal_transaksi) return false;
        const txDate = t.tanggal_transaksi.slice(0, 10);
        if (exportStartDate && txDate < exportStartDate) return false;
        if (exportEndDate && txDate > exportEndDate) return false;
        return true;
      });
    }

    if (dataToExport.length === 0) {
      setMessage({ type: 'error', text: 'Tidak ada data dalam rentang tanggal yang dipilih.' });
      return;
    }

    if (exportFormat === 'csv') {
      const headers = ['ID Transaksi', 'No RM', 'Nama Pasien', 'Triase', 'Penjaminan', 'Total Biaya (IDR)', 'Status Pembayaran', 'Tanggal Transaksi'];
      const rows = dataToExport.map(t => [
        t.id,
        t.no_rm || '',
        `"${t.nama_pasien || ''}"`,
        t.triase || 'Hijau',
        t.penjaminan || 'Umum',
        t.total_biaya,
        t.status_bayar,
        t.tanggal_transaksi || ''
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `laporan_kasir_igd_kustom_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const jsonContent = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
      const link = document.createElement('a');
      link.setAttribute('href', jsonContent);
      link.setAttribute('download', `laporan_kasir_igd_kustom_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setShowExportModal(false);
    setMessage({ type: 'success', text: `Berhasil mengunduh ${dataToExport.length} data laporan kasir IGD.` });
  };

  const handleExportCSV = () => {
    setShowExportModal(true);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => selectedIds.includes(t.id));
  }, [transactions, selectedIds]);

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
        
        {/* CRITICAL EMERGENCY ALERT BANNER (TRIASE MERAH) */}
        {stats.totalPendingMerah > 0 && activeTab === 'pending' && (
          <div className="bg-rose-600 text-white p-4 sm:p-5 rounded-3xl shadow-xl shadow-rose-600/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden animate-pulse">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-white/20 rounded-2xl flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">PERINGATAN DARURAT MEDIS (TRIASE MERAH)</h4>
                <p className="text-xs text-rose-100 mt-0.5">Terdapat <strong>{stats.totalPendingMerah} pasien IGD</strong> dengan kondisi kritis/merah yang menunggu verifikasi tagihan dari kasir.</p>
              </div>
            </div>
            <button
              onClick={() => setTriaseFilter('Merah')}
              className="px-4 py-2 bg-white text-rose-700 hover:bg-rose-50 rounded-2xl text-xs font-bold transition shadow cursor-pointer whitespace-nowrap"
            >
              Filter Kasus Merah Saja
            </button>
          </div>
        )}

        {/* HEADER & NAVIGATION */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <button 
                onClick={() => router.push('/admin')}
                className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Dashboard Admin</span>
              </button>
              <span className="text-slate-300">•</span>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-emerald-800">
                <Radio className={`w-3 h-3 text-emerald-600 ${isRealtimeActive ? 'animate-pulse' : ''}`} />
                <span>{isRealtimeActive ? 'Live Real-Time Sync' : 'Reconnecting...'}</span>
              </div>
              <button
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer border transition ${
                  audioEnabled ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
                title="Aktifkan Suara Peringatan Triase Merah"
              >
                {audioEnabled ? <Volume2 className="w-3 h-3 text-amber-600" /> : <VolumeX className="w-3 h-3 text-slate-400" />}
                <span>{audioEnabled ? 'Alarm Suara Aktif' : 'Alarm Mute'}</span>
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2 pt-1">
              <Activity className="w-6 h-6 text-amber-600" />
              <span>Verifikasi Pembayaran Kasir IGD</span>
            </h1>
            <p className="text-xs text-slate-500">Pusat audit dan persetujuan data penagihan medis gawat darurat dari kasir (Sinkronisasi Real-Time).</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowNewEntryModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2.5 rounded-2xl transition shadow-md flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Tambah Transaksi
            </button>
            <button
              onClick={() => setShowAnalyticsModal(true)}
              className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-indigo-600" /> Rekap Pendapatan
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Cetak Laporan
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Opsi Ekspor
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
                onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Pending Kasir ({stats.totalPending})
              </button>
              <button
                onClick={() => { setActiveTab('lunas'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'lunas' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Lunas ({stats.totalLunas})
              </button>
              <button
                onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua Data ({stats.totalAll})
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

              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowBatchPrintModal(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Massal ({selectedIds.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* QUICK DATE RANGE BUTTONS */}
              <button
                onClick={handleFilterToday}
                className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 px-3 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Filter Transaksi Hari Ini"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Hari Ini
              </button>
              <button
                onClick={handleFilterMonth}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-2xl text-xs font-bold transition cursor-pointer"
                title="Filter Bulan Ini"
              >
                Bulan Ini
              </button>

              {/* ITEMS PER PAGE SELECTOR */}
              <div className="relative">
                <select
                  value={itemsPerPage}
                  onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
                >
                  <option value={10}>10 per hal</option>
                  <option value={12}>12 per hal</option>
                  <option value={25}>25 per hal</option>
                  <option value={50}>50 per hal</option>
                  <option value={0}>Semua</option>
                </select>
              </div>

              {/* VIEW MODE TOGGLE (GRID vs TABLE) */}
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Tampilan Kartu Grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-xl transition cursor-pointer ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Tampilan Tabel Ringkas"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

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

              <div className="relative w-full sm:w-40">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari pasien, No RM..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none font-medium"
                />
              </div>
              <div className="relative w-full sm:w-32">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Filter tgl..." 
                  value={filterTanggal}
                  onChange={(e) => { setFilterTanggal(e.target.value); setCurrentPage(1); }}
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
                onClick={() => { setTriaseFilter(t); setCurrentPage(1); }}
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
                onClick={() => { setPenjaminanFilter(p); setCurrentPage(1); }}
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
              <span>Pilih Semua di Hasil Saring ({filtered.length} Pasien Kasir)</span>
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
        ) : viewMode === 'grid' ? (
          /* GRID CARDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedData.map((tx) => {
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
                      <p>Dokter: <strong className="text-slate-800">{tx.dokter_pemeriksa || 'Dokter Jaga IGD'}</strong></p>
                      <p>Metode Pembayaran: <strong className="text-slate-800">{tx.metode_bayar || 'Tunai'}</strong></p>
                      <p className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">Jumlah Tindakan: {tx.detail_pemeriksaan_igd?.length || 0} Item</p>
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
                      onClick={() => setReceiptRecord(tx)}
                      className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-2xl transition cursor-pointer"
                      title="Pratinjau Kuitansi Resmi"
                    >
                      <Receipt className="w-4 h-4" />
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
        ) : (
          /* COMPACT TABLE VIEW */
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider font-extrabold text-[10px] border-b border-slate-200">
                    <th className="p-4 w-10 text-center">#</th>
                    <th className="p-4">ID / Tanggal</th>
                    <th className="p-4">Pasien & No. RM</th>
                    <th className="p-4">Triase & Penjaminan</th>
                    <th className="p-4">Dokter & Metode</th>
                    <th className="p-4 text-right">Total Tagihan</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginatedData.map((tx, idx) => {
                    const absoluteIndex = itemsPerPage === 0 ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-4 text-center text-slate-400 font-bold">{absoluteIndex}</td>
                        <td className="p-4">
                          <span className="font-mono font-bold text-slate-900 block">{tx.id}</span>
                          <span className="text-[10px] text-slate-400">{tx.tanggal_transaksi ? new Date(tx.tanggal_transaksi).toLocaleDateString('id-ID') : '-'}</span>
                        </td>
                        <td className="p-4">
                          <strong className="text-slate-900 block">{tx.nama_pasien || 'Tanpa Nama'}</strong>
                          <span 
                            onClick={() => handleCopyRm(tx.no_rm)}
                            className="font-mono text-amber-700 cursor-pointer hover:underline text-[11px] flex items-center gap-1"
                          >
                            {tx.no_rm || '-'} <Copy className="w-2.5 h-2.5" />
                          </span>
                        </td>
                        <td className="p-4 space-x-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.triase === 'Merah' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                            tx.triase === 'Kuning' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {tx.triase || 'Hijau'}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-sky-100 text-sky-800">
                            {tx.penjaminan || 'Umum'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="block text-slate-900">{tx.dokter_pemeriksa || 'dr. Jaga IGD'}</span>
                          <span className="text-[10px] text-slate-400">{tx.metode_bayar}</span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-slate-900">{formatRupiah(tx.total_biaya)}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {tx.status_bayar === 'lunas' ? 'Lunas' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedDetailRecord(tx)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                              title="Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setReceiptRecord(tx)}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition cursor-pointer"
                              title="Kuitansi"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleSendWhatsApp(tx)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition cursor-pointer"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            {tx.status_bayar === 'pending' && (
                              <button
                                onClick={() => handleApprove(tx)}
                                className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl transition cursor-pointer"
                                title="Setujui Lunas"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(tx)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                              title="Hapus"
                            >
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
        )}

        {/* PAGINATION CONTROLS */}
        {totalPages > 1 && itemsPerPage > 0 && (
          <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
            <p className="text-xs text-slate-500">
              Menampilkan halaman <strong className="text-slate-800">{currentPage}</strong> dari <strong className="text-slate-800">{totalPages}</strong> (Total {filtered.length} data)
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-slate-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl text-slate-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL ENTRI BARU KASIR */}
      {showNewEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black uppercase text-slate-900">Input Tagihan Kasir IGD Baru</h3>
              </div>
              <button onClick={() => setShowNewEntryModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTransaction} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. RM Pasien</label>
                  <input
                    type="text"
                    placeholder="Contoh: RM-998822"
                    value={newTx.no_rm}
                    onChange={(e) => setNewTx({ ...newTx, no_rm: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Pasien *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Lengkap Pasien"
                    value={newTx.nama_pasien}
                    onChange={(e) => setNewTx({ ...newTx, nama_pasien: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Triase Pasien</label>
                  <select
                    value={newTx.triase}
                    onChange={(e) => setNewTx({ ...newTx, triase: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="Hijau">Hijau (Non-Darurat)</option>
                    <option value="Kuning">Kuning (Mendesak)</option>
                    <option value="Merah">Merah (Darurat Kritis)</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Penjaminan</label>
                  <select
                    value={newTx.penjaminan}
                    onChange={(e) => setNewTx({ ...newTx, penjaminan: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  >
                    <option value="Umum">Umum / Tunai</option>
                    <option value="BPJS">BPJS Kesehatan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dokter Pemeriksa</label>
                  <input
                    type="text"
                    placeholder="dr. Jaga IGD"
                    value={newTx.dokter_pemeriksa}
                    onChange={(e) => setNewTx({ ...newTx, dokter_pemeriksa: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Biaya (IDR) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0"
                    value={newTx.total_biaya}
                    onChange={(e) => setNewTx({ ...newTx, total_biaya: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Alamat Domisili</label>
                <input
                  type="text"
                  placeholder="Alamat pasien..."
                  value={newTx.alamat}
                  onChange={(e) => setNewTx({ ...newTx, alamat: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewEntryModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow cursor-pointer disabled:opacity-50"
                >
                  Simpan Transaksi Kasir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OPSI EKSPOR */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase text-slate-900">Opsi Ekspor Laporan Kasir IGD</h3>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Format Unduhan</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 rounded-2xl border text-center font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      exportFormat === 'csv' ? 'bg-emerald-50 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Format CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('json')}
                    className={`p-3 rounded-2xl border text-center font-bold flex items-center justify-center gap-2 cursor-pointer ${
                      exportFormat === 'json' ? 'bg-indigo-50 border-indigo-500 text-indigo-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-indigo-600" /> Format JSON
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dari Tanggal</label>
                  <input
                    type="date"
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sampai Tanggal</label>
                  <input
                    type="date"
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Biarkan tanggal kosong untuk mengunduh seluruh data yang sedang disaring ({filtered.length} data).</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExportCustom}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Unduh Laporan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK MASSAL */}
      {showBatchPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0 print:bg-white print:static">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 print:border-0 print:shadow-none print:max-w-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-sky-600" />
                <h3 className="text-sm font-black uppercase text-slate-900">Ringkasan Cetak Massal Kuitansi</h3>
              </div>
              <button onClick={() => setShowBatchPrintModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto print:max-h-none print:overflow-visible">
              <div className="text-center pb-2 border-b border-slate-200">
                <h2 className="text-base font-black uppercase text-slate-900">RSUD BUKIT KERMAN</h2>
                <p className="text-xs text-slate-500">Laporan Ringkasan Kuitansi Kasir IGD Terpilih</p>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                    <th className="p-2">ID</th>
                    <th className="p-2">Pasien / RM</th>
                    <th className="p-2">Triase/Jaminan</th>
                    <th className="p-2 text-right">Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedTransactions.map((t) => (
                    <tr key={t.id}>
                      <td className="p-2 font-mono font-bold">{t.id}</td>
                      <td className="p-2">
                        <strong className="block text-slate-900">{t.nama_pasien}</strong>
                        <span className="text-[10px] text-slate-400">{t.no_rm}</span>
                      </td>
                      <td className="p-2">{t.triase || 'Hijau'} / {t.penjaminan || 'Umum'}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatRupiah(t.total_biaya)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2 border-t border-slate-300 font-bold text-xs">
                <span>Total akumulasi kuitansi terpilih ({selectedTransactions.length} item):</span>
                <span className="font-mono text-emerald-700 text-sm">
                  {formatRupiah(selectedTransactions.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 print:hidden">
              <button
                onClick={() => setShowBatchPrintModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Halaman Ringkasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYTICS SUMMARY MODAL */}
      {showAnalyticsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Rekapitulasi Pendapatan Kasir IGD</h3>
              </div>
              <button onClick={() => setShowAnalyticsModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-sky-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Pasien BPJS ({analyticsData.bpjsCount})
                </p>
                <p className="text-lg font-black font-mono text-slate-900">{formatRupiah(analyticsData.bpjsTotal)}</p>
                <p className="text-[10px] text-slate-500">Estimasi Klaim Penjaminan</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
                <p className="text-[10px] font-extrabold uppercase text-emerald-700 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Pasien Umum/Tunai ({analyticsData.umumCount})
                </p>
                <p className="text-lg font-black font-mono text-slate-900">{formatRupiah(analyticsData.umumTotal)}</p>
                <p className="text-[10px] text-slate-500">Penerimaan Langsung</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-amber-600" /> Beban Kunjungan Berdasarkan Dokter Pemeriksa:
              </h4>
              <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2 text-xs">
                {analyticsData.doctorBreakdown.map((doc, i) => (
                  <div key={i} className="flex justify-between items-center border-b border-slate-100 pb-1.5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-bold text-slate-800">{doc.name}</p>
                      <p className="text-[10px] text-slate-400">{doc.count} Pasien Ditangani</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{formatRupiah(doc.total)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAnalyticsModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup Rekap
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p><span className="font-bold text-slate-500">Dokter Pemeriksa:</span> {selectedDetailRecord.dokter_pemeriksa || 'Dokter Jaga IGD'}</p>
              <p><span className="font-bold text-slate-500">Jumlah Tindakan Medis:</span> {selectedDetailRecord.detail_pemeriksaan_igd?.length || 0} Item</p>
              
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm">
                <span>Total Biaya Kasir:</span>
                <span className="font-mono text-emerald-700">{formatRupiah(selectedDetailRecord.total_biaya)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setSelectedDetailRecord(null);
                  setReceiptRecord(selectedDetailRecord);
                }}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5 text-sky-600" /> Pratinjau Kuitansi
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

      {/* OFFICIAL RECEIPT PREVIEW MODAL */}
      {receiptRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">Kuitansi Resmi Pembayaran IGD</h3>
              </div>
              <button onClick={() => setReceiptRecord(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* RECEIPT PAPER CONTAINER */}
            <div className="bg-amber-50/40 border border-amber-200/80 rounded-2xl p-5 space-y-3 font-mono text-xs text-slate-800">
              <div className="text-center space-y-0.5 border-b border-dashed border-amber-300 pb-3">
                <h4 className="font-black text-sm uppercase text-slate-900 tracking-wide">RSUD BUKIT KERMAN</h4>
                <p className="text-[10px] text-slate-500 font-sans">Instalasi Gawat Darurat (IGD) — Kerinci</p>
                <p className="text-[10px] text-amber-700 font-bold pt-1">ID Transaksi: {receiptRecord.id}</p>
              </div>

              <div className="space-y-1 text-[11px] font-sans">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama Pasien:</span>
                  <strong className="text-slate-900">{receiptRecord.nama_pasien || '-'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Rekam Medis:</span>
                  <strong className="text-slate-900">{receiptRecord.no_rm || '-'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Triase / Jaminan:</span>
                  <strong className="text-slate-900">{receiptRecord.triase || 'Hijau'} / {receiptRecord.penjaminan || 'Umum'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dokter Pemeriksa:</span>
                  <strong className="text-slate-900">{receiptRecord.dokter_pemeriksa || 'Dokter Jaga IGD'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="text-slate-900">{receiptRecord.tanggal_transaksi ? new Date(receiptRecord.tanggal_transaksi).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-amber-300 pt-3 flex justify-between items-center text-sm font-black font-sans">
                <span className="text-slate-700">Total Pembayaran:</span>
                <span className="text-emerald-700 font-mono text-base">{formatRupiah(receiptRecord.total_biaya)}</span>
              </div>

              <div className="pt-2 text-center">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase font-sans ${
                  receiptRecord.status_bayar === 'lunas' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  Status: {receiptRecord.status_bayar === 'lunas' ? 'LUNAS (TERVERIFIKASI)' : 'PENDING KASIR'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setReceiptRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer font-sans"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow flex items-center gap-1.5 font-sans"
              >
                <Printer className="w-3.5 h-3.5" /> Cetak Kuitansi
              </button>
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