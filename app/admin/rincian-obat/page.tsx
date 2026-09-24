'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Pill, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  Printer, 
  Download, 
  X, 
  Save,
  Eye,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  ShieldCheck,
  Filter,
  FileText,
  Calendar,
  Percent,
  CheckSquare,
  Square,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  PieChart,
  Copy,
  Stamp,
  Activity,
  Maximize2,
  Minimize2,
  ListFilter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface DetailItem {
  id?: number;
  nama_obat_obhp: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
}

interface RincianObatRecord {
  id: number;
  no_transaksi: string;
  no_rm: string;
  nama_pasien: string;
  jenis_layanan: string;
  penanggung_jawab_apotek: string;
  total_biaya: number;
  diskon?: number;
  penjamin?: string;
  status_verifikasi: string;
  is_locked: boolean;
  created_at: string;
  rincian_obat_detail?: DetailItem[];
}

export default function AdminRincianObatPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RincianObatRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State Filter & Tab Admin
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [serviceFilter, setServiceFilter] = useState<string>('semua');
  const [penjaminFilter, setPenjaminFilter] = useState<string>('semua');
  const [dateFilter, setDateFilter] = useState<string>('semua');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // State Table Density (Compact / Normal)
  const [isCompact, setIsCompact] = useState<boolean>(false);

  // State Modal Ringkasan Klaim Penjamin
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);

  // State Cetak Massal / Rekapitulasi (Cetak Terpilih & Cetak Semua)
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState<boolean>(false);
  const [bulkPrintMode, setBulkPrintMode] = useState<'selected' | 'all'>('selected');

  // State Cetak Slip Individual (Single Slip Print Modal)
  const [slipPrintRecord, setSlipPrintRecord] = useState<RincianObatRecord | null>(null);

  // State Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // State Sorting Tabel
  const [sortField, setSortField] = useState<'created_at' | 'nama_pasien' | 'total_biaya'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // State Pilih Massal (Bulk Actions)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // State Modal Detail Inspeksi
  const [detailModalRecord, setDetailModalRecord] = useState<RincianObatRecord | null>(null);

  // Super Admin Edit State
  const [editingRecord, setEditingRecord] = useState<RincianObatRecord | null>(null);
  const [editItems, setEditItems] = useState<DetailItem[]>([]);

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('rincian_obat_header')
        .select(`
          *,
          rincian_obat_detail (*)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as RincianObatRecord[]);
      }
    } catch (err) {
      console.error('Gagal memuat data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();

    const channel = supabase
      .channel('admin_realtime_rincian_obat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rincian_obat_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  // Listener Pintasan Keyboard (Tekan '/' untuk fokus pencarian)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        const searchInput = document.getElementById('search-audit-input');
        searchInput?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, serviceFilter, penjaminFilter, dateFilter, startDateFilter, endDateFilter]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('semua');
    setServiceFilter('semua');
    setPenjaminFilter('semua');
    setDateFilter('semua');
    setStartDateFilter('');
    setEndDateFilter('');
    showToast('Filter berhasil direset ke kondisi awal.', 'info');
  };

  const handleCopyNoTransaksi = (noTransaksi: string) => {
    navigator.clipboard.writeText(noTransaksi);
    showToast(`No. Transaksi ${noTransaksi} berhasil disalin ke clipboard!`, 'success');
  };

  const handleApprove = async (id: number) => {
    await supabase.from('rincian_obat_header').update({ status_verifikasi: 'Disetujui' }).eq('id', id);
    showToast('Berkas rincian obat berhasil disetujui.', 'success');
    fetchRecords();
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Masukkan alasan penolakan berkas rincian obat:");
    if (reason === null) return;
    await supabase.from('rincian_obat_header').update({ status_verifikasi: 'Ditolak' }).eq('id', id);
    showToast(`Berkas rincian obat ditolak. Catatan: ${reason}`, 'error');
    fetchRecords();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Setujui ${selectedIds.length} berkas rincian obat terpilih?`)) {
      await supabase.from('rincian_obat_header').update({ status_verifikasi: 'Disetujui' }).in('id', selectedIds);
      setSelectedIds([]);
      showToast(`${selectedIds.length} berkas berhasil disetujui secara massal.`, 'success');
      fetchRecords();
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Tolak ${selectedIds.length} berkas rincian obat terpilih?`)) {
      await supabase.from('rincian_obat_header').update({ status_verifikasi: 'Ditolak' }).in('id', selectedIds);
      setSelectedIds([]);
      showToast(`${selectedIds.length} berkas ditolak secara massal.`, 'error');
      fetchRecords();
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedRecords.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedRecords.map(r => r.id));
    }
  };

  const handleToggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleToggleLock = async (id: number, currentLocked: boolean) => {
    await supabase.from('rincian_obat_header').update({ is_locked: !currentLocked }).eq('id', id);
    showToast(`Status kunci kasir berhasil diubah menjadi ${!currentLocked ? 'Locked' : 'Unlocked'}.`, 'warning');
    fetchRecords();
  };

  const handleDelete = async (id: number) => {
    if (confirm('PERINGATAN SUPER ADMIN: Hapus permanen data rincian obat ini?')) {
      await supabase.from('rincian_obat_header').delete().eq('id', id);
      showToast('Data rincian obat berhasil dihapus permanen.', 'error');
      fetchRecords();
    }
  };

  const handleOpenEditModal = (rec: RincianObatRecord) => {
    setEditingRecord(rec);
    setEditItems(rec.rincian_obat_detail || []);
  };

  const handleSaveSuperAdminEdit = async () => {
    if (!editingRecord) return;
    try {
      const totalKotor = editItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const totalBaru = Math.max(0, totalKotor - (editingRecord.diskon || 0));

      await supabase.from('rincian_obat_header').update({
        nama_pasien: editingRecord.nama_pasien,
        no_rm: editingRecord.no_rm,
        jenis_layanan: editingRecord.jenis_layanan,
        total_biaya: totalBaru
      }).eq('id', editingRecord.id);

      await supabase.from('rincian_obat_detail').delete().eq('header_id', editingRecord.id);
      const detailsPayload = editItems.map(item => ({
        header_id: editingRecord.id,
        nama_obat_obhp: item.nama_obat_obhp,
        jumlah: item.jumlah,
        harga_satuan: item.harga_satuan,
        subtotal: item.subtotal
      }));
      await supabase.from('rincian_obat_detail').insert(detailsPayload);

      showToast('Data berhasil diperbarui oleh Super Admin!', 'success');
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menyimpan perubahan: ${err.message}`, 'error');
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ["No Transaksi", "No RM", "Nama Pasien", "Layanan", "Penjamin", "Total Biaya", "Status Verifikasi"];
    const rows = records.map(r => [
      r.no_transaksi,
      r.no_rm,
      `"${r.nama_pasien}"`,
      r.jenis_layanan,
      r.penjamin || 'Umum',
      r.total_biaya,
      r.status_verifikasi
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Rincian_Obat_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV audit berhasil diunduh.', 'success');
  };

  const handleExportSelectedCSV = () => {
    if (selectedIds.length === 0) return alert('Pilih minimal satu berkas untuk diekspor.');
    const selectedRecords = records.filter(r => selectedIds.includes(r.id));
    const headers = ["No Transaksi", "No RM", "Nama Pasien", "Layanan", "Penjamin", "Total Biaya", "Status Verifikasi"];
    const rows = selectedRecords.map(r => [
      r.no_transaksi,
      r.no_rm,
      `"${r.nama_pasien}"`,
      r.jenis_layanan,
      r.penjamin || 'Umum',
      r.total_biaya,
      r.status_verifikasi
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Terpilih_Rincian_Obat_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Berhasil mengunduh ${selectedRecords.length} data terpilih.`, 'success');
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const handleSort = (field: 'created_at' | 'nama_pasien' | 'total_biaya') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = r.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.no_rm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.no_transaksi.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = 
      statusFilter === 'semua' ? true :
      statusFilter === 'pending' ? r.status_verifikasi === 'Menunggu Verifikasi' :
      statusFilter === 'disetujui' ? r.status_verifikasi === 'Disetujui' :
      statusFilter === 'ditolak' ? r.status_verifikasi === 'Ditolak' : true;

    const matchService = 
      serviceFilter === 'semua' ? true :
      r.jenis_layanan.toLowerCase() === serviceFilter.toLowerCase();

    const matchPenjamin =
      penjaminFilter === 'semua' ? true :
      (r.penjamin || 'Umum').toLowerCase() === penjaminFilter.toLowerCase();

    let matchDate = true;
    const recordDateObj = new Date(r.created_at);
    const recordDateStr = recordDateObj.toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (dateFilter === 'hari_ini') {
      matchDate = recordDateStr === todayStr;
    } else if (dateFilter === 'minggu_ini') {
      const now = new Date();
      const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
      matchDate = recordDateObj >= startOfWeek;
    } else if (dateFilter === 'bulan_ini') {
      const now = new Date();
      matchDate = recordDateObj.getMonth() === now.getMonth() && recordDateObj.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'custom' && startDateFilter && endDateFilter) {
      matchDate = recordDateStr >= startDateFilter && recordDateStr <= endDateFilter;
    }

    return matchSearch && matchStatus && matchService && matchPenjamin && matchDate;
  });

  const sortedRecords = [...filteredRecords].sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage) || 1;
  const paginatedRecords = sortedRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalDisetujui = records.filter(r => r.status_verifikasi === 'Disetujui').length;
  const totalNominal = records.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const selectedTotalNominal = records
    .filter(r => selectedIds.includes(r.id))
    .reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);

  const totalBpjsNominal = records.filter(r => (r.penjamin || 'Umum') === 'BPJS Kesehatan').reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const totalUmumNominal = records.filter(r => (r.penjamin || 'Umum') !== 'BPJS Kesehatan').reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const countBpjs = records.filter(r => (r.penjamin || 'Umum') === 'BPJS Kesehatan').length;
  const countUmum = records.filter(r => (r.penjamin || 'Umum') !== 'BPJS Kesehatan').length;

  const countRajal = records.filter(r => r.jenis_layanan === 'Rawat Jalan').length;
  const countRanap = records.filter(r => r.jenis_layanan === 'Rawat Inap').length;
  const countIgd = records.filter(r => r.jenis_layanan === 'IGD').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-purple-500 selection:text-white print:min-h-0 print:block print:bg-white print:justify-start">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 backdrop-blur-md text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 border border-slate-700/80 animate-in fade-in slide-in-from-bottom-5 duration-300 min-w-[300px] max-w-md print:hidden">
          <div className="flex items-center gap-3">
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />}
            {toast.type === 'info' && <Activity className="w-5 h-5 text-sky-400 shrink-0" />}
            <span className="text-xs font-semibold leading-relaxed">{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="print:hidden">
        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Control & Super Admin Verification Rincian Obat"
          badgeText="Super Admin"
          showBackButton={true}
        />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 print:p-0 print:max-w-none">
        
        {/* TOP BAR ACTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-6 h-6 text-purple-600" /> Audit &amp; Kontrol Rincian Obat (Super Admin)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Super Admin memiliki wewenang penuh untuk mengubah, menyetujui, menolak, dan membuka kunci transaksi kasir.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              disabled={selectedIds.length === 0}
              onClick={() => { setBulkPrintMode('selected'); setIsBulkPrintModalOpen(true); }}
              className="bg-purple-50 hover:bg-purple-100 disabled:opacity-40 text-purple-800 border border-purple-300 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Cetak berkas audit yang dicentang di tabel"
            >
              <Printer className="w-4 h-4" /> Cetak Terpilih ({selectedIds.length})
            </button>
            <button
              onClick={() => { setBulkPrintMode('all'); setIsBulkPrintModalOpen(true); }}
              className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Cetak seluruh rekapan data audit"
            >
              <Printer className="w-4 h-4 text-purple-300" /> Cetak Semua Rekapan
            </button>
            <button
              onClick={() => setShowSummaryModal(true)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <PieChart className="w-4 h-4 text-purple-600" /> Ringkasan Penjamin
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Ekspor Audit
            </button>
          </div>
        </div>

        {/* METRIK STATISTIK AUDIT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <div onClick={() => setStatusFilter('semua')} className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:border-purple-400 hover:shadow transition">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Berkas</span>
              <h3 className="text-lg font-black text-slate-900">{records.length} Transaksi</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div onClick={() => setStatusFilter('pending')} className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-400 hover:shadow transition">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Menunggu Verifikasi</span>
              <h3 className="text-lg font-black text-amber-600">{totalPending} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div onClick={() => setStatusFilter('disetujui')} className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-400 hover:shadow transition">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Disetujui Auditor</span>
              <h3 className="text-lg font-black text-emerald-600">{totalDisetujui} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Akumulasi Finansial</span>
              <h3 className="text-sm font-black font-mono text-slate-900">{formatRupiah(totalNominal)}</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* DISTRIBUSI BEBAN INSTALASI */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs font-bold print:hidden">
          <div className="flex items-center gap-2 text-slate-700">
            <Activity className="w-4 h-4 text-purple-600" />
            <span>Distribusi Beban Instalasi:</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-xl border border-purple-200">Rawat Jalan: <strong>{countRajal}</strong></span>
            <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-xl border border-indigo-200">Rawat Inap: <strong>{countRanap}</strong></span>
            <span className="bg-rose-50 text-rose-700 px-3 py-1 rounded-xl border border-rose-200">IGD: <strong>{countIgd}</strong></span>
          </div>
        </div>

        {/* KONTEN TABEL & FILTER */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 print:border-none print:p-0">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 print:hidden">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-audit-input"
                type="text"
                placeholder="Cari transaksi, RM, pasien... (Tekan '/' untuk fokus)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-9 py-2 text-xs focus:outline-none"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleResetFilters} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5 text-purple-600" /> Reset
              </button>

              <button
                onClick={() => setIsCompact(!isCompact)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                  isCompact ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                }`}
              >
                {isCompact ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                <span>{isCompact ? 'Padat' : 'Normal'}</span>
              </button>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button onClick={() => setServiceFilter('semua')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Layanan</button>
                <button onClick={() => setServiceFilter('Rawat Jalan')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'Rawat Jalan' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-500'}`}>Rajal</button>
                <button onClick={() => setServiceFilter('Rawat Inap')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'Rawat Inap' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-500'}`}>Ranap</button>
                <button onClick={() => setServiceFilter('IGD')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'IGD' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-500'}`}>IGD</button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button onClick={() => setPenjaminFilter('semua')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${penjaminFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Penjamin</button>
                <button onClick={() => setPenjaminFilter('Umum')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${penjaminFilter === 'Umum' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-500'}`}>Umum</button>
                <button onClick={() => setPenjaminFilter('BPJS Kesehatan')} className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${penjaminFilter === 'BPJS Kesehatan' ? 'bg-white text-purple-800 shadow-sm' : 'text-slate-500'}`}>BPJS</button>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Status ({records.length})</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending ({totalPending})</button>
                <button onClick={() => setStatusFilter('disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui ({totalDisetujui})</button>
              </div>
            </div>
          </div>

          {selectedIds.length > 0 && (
            <div className="bg-purple-600 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-bold shadow-lg print:hidden">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="bg-purple-700 px-3 py-1 rounded-xl text-white">{selectedIds.length} Berkas Dipilih</span>
                <span className="font-mono text-purple-100 font-bold">Total Nilai: {formatRupiah(selectedTotalNominal)}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={handleExportSelectedCSV} className="bg-sky-600 hover:bg-sky-700 px-3 py-1.5 rounded-xl transition cursor-pointer shadow flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Ekspor Terpilih
                </button>
                <button onClick={handleBulkApprove} className="bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow">
                  ✓ Setujui Terpilih
                </button>
                <button onClick={handleBulkReject} className="bg-rose-600 hover:bg-rose-700 px-3.5 py-1.5 rounded-xl transition cursor-pointer shadow">
                  ✕ Tolak Terpilih
                </button>
                <button onClick={() => setSelectedIds([])} className="bg-purple-800 hover:bg-purple-900 px-3 py-1.5 rounded-xl transition cursor-pointer">
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="border border-slate-200 rounded-2xl overflow-hidden print:border-none">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px] print:bg-slate-200 print:text-black">
                  <th className={`w-10 text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>
                    <button onClick={handleToggleSelectAll} className="cursor-pointer">
                      {selectedIds.length > 0 && selectedIds.length === sortedRecords.length ? (
                        <CheckSquare className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th onClick={() => handleSort('created_at')} className={`cursor-pointer hover:bg-slate-200 transition ${isCompact ? 'p-2' : 'p-3.5'}`}>
                    <div className="flex items-center gap-1">ID / Transaksi <ArrowUpDown className="w-3 h-3 text-slate-400 print:hidden" /></div>
                  </th>
                  <th onClick={() => handleSort('nama_pasien')} className={`cursor-pointer hover:bg-slate-200 transition ${isCompact ? 'p-2' : 'p-3.5'}`}>
                    <div className="flex items-center gap-1">Pasien &amp; RM <ArrowUpDown className="w-3 h-3 text-slate-400 print:hidden" /></div>
                  </th>
                  <th className={isCompact ? 'p-2' : 'p-3.5'}>Layanan &amp; Penjamin</th>
                  <th onClick={() => handleSort('total_biaya')} className={`text-right cursor-pointer hover:bg-slate-200 transition ${isCompact ? 'p-2' : 'p-3.5'}`}>
                    <div className="flex items-center justify-end gap-1">Total Biaya <ArrowUpDown className="w-3 h-3 text-slate-400 print:hidden" /></div>
                  </th>
                  <th className={`text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>Akses Kunci</th>
                  <th className={`text-center ${isCompact ? 'p-2' : 'p-3.5'}`}>Status Verifikasi</th>
                  <th className={`text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>Aksi Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={8} className="text-center py-8 text-slate-400">Memuat data audit...</td></tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-8 h-8 text-slate-300" />
                        <p className="text-xs font-bold text-slate-600">Tidak ada data rincian obat ditemukan.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className={`text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>
                        <button onClick={() => handleToggleSelectOne(r.id)} className="cursor-pointer">
                          {selectedIds.includes(r.id) ? (
                            <CheckSquare className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                      </td>
                      <td className={`font-mono font-bold text-slate-900 ${isCompact ? 'p-2' : 'p-3.5'}`}>
                        <div className="flex items-center gap-1.5 group">
                          <span onClick={() => handleCopyNoTransaksi(r.no_transaksi)} className="cursor-pointer hover:text-purple-600 transition" title="Klik untuk salin no transaksi">
                            {r.no_transaksi}
                          </span>
                          <Copy className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition cursor-pointer" onClick={() => handleCopyNoTransaksi(r.no_transaksi)} />
                        </div>
                        <span className="block text-[10px] text-slate-400 font-normal">{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                      </td>
                      <td className={isCompact ? 'p-2' : 'p-3.5'}>
                        <strong className="block text-slate-800">{r.nama_pasien}</strong>
                        <span className="text-[10px] text-amber-700 font-mono">{r.no_rm}</span>
                      </td>
                      <td className={isCompact ? 'p-2' : 'p-3.5'}>
                        <span className="block font-bold text-slate-700">{r.jenis_layanan}</span>
                        <span className="text-[10px] text-slate-500">{r.penjamin || 'Umum'}</span>
                      </td>
                      <td className={`text-right font-mono font-black text-slate-900 ${isCompact ? 'p-2' : 'p-3.5'}`}>{formatRupiah(r.total_biaya)}</td>
                      <td className={`text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>
                        <button
                          onClick={() => handleToggleLock(r.id, r.is_locked)}
                          className={`p-1.5 rounded-xl border transition cursor-pointer text-[10px] font-bold flex items-center gap-1 mx-auto ${
                            r.is_locked ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {r.is_locked ? <Lock className="w-3.5 h-3.5 text-amber-600" /> : <Unlock className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{r.is_locked ? 'Locked' : 'Unlocked'}</span>
                        </button>
                      </td>
                      <td className={`text-center ${isCompact ? 'p-2' : 'p-3.5'}`}>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status_verifikasi}
                        </span>
                      </td>
                      <td className={`text-center print:hidden ${isCompact ? 'p-2' : 'p-3.5'}`}>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setDetailModalRecord(r)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer" title="Inspeksi Rincian">
                            <Eye className="w-3.5 h-3.5 text-purple-600" />
                          </button>
                          <button onClick={() => handleApprove(r.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer" title="Setujui">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleReject(r.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl transition cursor-pointer" title="Tolak">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleOpenEditModal(r)} className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl transition cursor-pointer" title="Edit Data">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl transition cursor-pointer" title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINASI KONTROL */}
          {sortedRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-xs print:hidden">
              <span className="text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-900 font-bold">{Math.min((currentPage - 1) * itemsPerPage + 1, sortedRecords.length)}</strong> - <strong className="text-slate-900 font-bold">{Math.min(currentPage * itemsPerPage, sortedRecords.length)}</strong> dari <strong className="text-slate-900 font-bold">{sortedRecords.length}</strong> data audit
              </span>
              <div className="flex items-center gap-2 mt-3 sm:mt-0">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-bold cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>
                <span className="px-3 py-1.5 bg-purple-50 text-purple-700 font-bold rounded-xl border border-purple-200">
                  Hal. {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 font-bold cursor-pointer"
                >
                  Selanjutnya <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL BULK PRINT (CETAK REKAPAN TERPILIH / SEMUA DENGAN KOP RESMI RSUD) */}
      {isBulkPrintModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-50 print:block">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] flex flex-col print:border-0 print:shadow-none print:max-w-none print:p-4 print:max-h-none print:rounded-none">
            
            {/* KOP SURAT RESMI RSUD BUKIT KERMAN */}
            <div className="border-b-4 border-black pb-3 text-center relative font-serif">
              <div className="flex items-center justify-between">
                <img src="/logo-pemkab.png" alt="Logo Kab Kerinci" className="w-16 h-16 object-contain" />
                <div className="text-center flex-1 mx-2">
                  <h3 className="text-xs font-bold tracking-wide uppercase">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-black tracking-wide uppercase">DINAS KESEHATAN</h2>
                  <h1 className="text-lg font-black tracking-wider uppercase">RSUD BUKIT KERMAN</h1>
                  <p className="text-[9px] font-sans">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                </div>
                <img src="/logo-rsud.png" alt="Logo RSUD" className="w-16 h-16 object-contain" />
              </div>
            </div>

            <div className="text-center font-black text-xs uppercase underline tracking-wider font-sans pt-1">
              {bulkPrintMode === 'selected' ? 'REKAPITULASI AUDIT BIAYA OBAT & OBHP (DATA TERPILIH)' : 'REKAPITULASI KESELURUHAN AUDIT BIAYA OBAT & OBHP'}
            </div>

            <div className="text-[11px] font-mono text-center text-slate-600">
              Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })} &bull; Total Berkas: {bulkPrintMode === 'selected' ? selectedIds.length : filteredRecords.length}
            </div>

            <div className="border-2 border-black overflow-y-auto flex-1 max-h-[50vh] print:max-h-none">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-100 print:bg-slate-200 font-black text-center uppercase text-[10px]">
                    <th className="p-2 border-r border-black w-10">No</th>
                    <th className="p-2 border-r border-black">No. Transaksi</th>
                    <th className="p-2 border-r border-black">Tanggal</th>
                    <th className="p-2 border-r border-black">No. RM &amp; Nama Pasien</th>
                    <th className="p-2 border-r border-black">Layanan / Penjamin</th>
                    <th className="p-2 border-r border-black">Status Verifikasi</th>
                    <th className="p-2 text-right">Total Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-medium text-[11px]">
                  {(() => {
                    const targetData = bulkPrintMode === 'selected'
                      ? records.filter(r => selectedIds.includes(r.id))
                      : filteredRecords;

                    const grandTotal = targetData.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);

                    return (
                      <>
                        {targetData.map((r, i) => (
                          <tr key={r.id} className="border-b border-black">
                            <td className="p-2 border-r border-black text-center font-mono">{i + 1}</td>
                            <td className="p-2 border-r border-black font-mono font-bold">{r.no_transaksi}</td>
                            <td className="p-2 border-r border-black font-mono">{new Date(r.created_at).toLocaleDateString('id-ID')}</td>
                            <td className="p-2 border-r border-black">
                              <strong className="block uppercase">{r.nama_pasien}</strong>
                              <span className="font-mono text-[10px]">RM: {r.no_rm}</span>
                            </td>
                            <td className="p-2 border-r border-black">
                              <span className="block font-bold">{r.jenis_layanan}</span>
                              <span className="text-[10px]">{r.penjamin || 'Umum'}</span>
                            </td>
                            <td className="p-2 border-r border-black text-center uppercase font-bold text-[10px]">{r.status_verifikasi}</td>
                            <td className="p-2 text-right font-mono font-bold">{formatRupiah(r.total_biaya)}</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-black font-black bg-slate-50 print:bg-slate-100">
                          <td colSpan={6} className="p-2.5 border-r border-black text-right uppercase">TOTAL KESELURUHAN AUDIT:</td>
                          <td className="p-2.5 text-right font-mono text-sm">{formatRupiah(grandTotal)}</td>
                        </tr>
                      </>
                    );
                  })()}
                </tbody>
              </table>
            </div>

            {/* BLOK TANDA TANGAN PEJABAT RESMI */}
            <div className="pt-4 flex justify-between items-end font-sans text-xs">
              <div>
                <p className="font-bold text-slate-500">Mengetahui,</p>
                <p className="font-bold">Direktur RSUD Bukit Kerman</p>
                <div className="h-16"></div>
                <p className="font-bold underline">( _______________________________ )</p>
                <p className="text-[10px]">NIP. ...............................................</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-500">Kerinci, {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold">Tim Verifikasi &amp; Auditor</p>
                <div className="h-16"></div>
                <p className="font-bold underline">( _______________________________ )</p>
                <p className="text-[10px]">NIP. ...............................................</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 print:hidden">
              <button onClick={() => setIsBulkPrintModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-4 h-4" /> Cetak Laporan Resmi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CETAK SLIP TRANSAKSI INDIVIDUAL */}
      {slipPrintRecord && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-50 print:block">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] flex flex-col print:border-0 print:shadow-none print:max-w-none print:p-4 print:max-h-none print:rounded-none">
            
            {/* KOP SURAT RESMI RSUD BUKIT KERMAN */}
            <div className="border-b-4 border-black pb-3 text-center relative font-serif">
              <div className="flex items-center justify-between">
                <img src="/logo-pemkab.png" alt="Logo Kab Kerinci" className="w-16 h-16 object-contain" />
                <div className="text-center flex-1 mx-2">
                  <h3 className="text-xs font-bold tracking-wide uppercase">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-black tracking-wide uppercase">DINAS KESEHATAN</h2>
                  <h1 className="text-lg font-black tracking-wider uppercase">RSUD BUKIT KERMAN</h1>
                  <p className="text-[9px] font-sans">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                </div>
                <img src="/logo-rsud.png" alt="Logo RSUD" className="w-16 h-16 object-contain" />
              </div>
            </div>

            <div className="text-center font-black text-xs uppercase underline tracking-wider font-sans pt-1">
              SLIP RINCIAN BIAYA OBAT &amp; OBHP
            </div>

            <div className="bg-slate-50 print:bg-transparent border border-black p-3 rounded-2xl text-xs space-y-1 font-sans">
              <div className="flex justify-between">
                <span>No. Transaksi: <strong className="font-mono">{slipPrintRecord.no_transaksi}</strong></span>
                <span>Tanggal: <strong className="font-mono">{new Date(slipPrintRecord.created_at).toLocaleDateString('id-ID')}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Nama Pasien: <strong className="uppercase">{slipPrintRecord.nama_pasien}</strong> (RM: <span className="font-mono">{slipPrintRecord.no_rm}</span>)</span>
                <span>Layanan: <strong>{slipPrintRecord.jenis_layanan}</strong></span>
              </div>
              <div className="flex justify-between">
                <span>Penjamin: <strong>{slipPrintRecord.penjamin || 'Umum'}</strong></span>
                <span>Status Verifikasi: <strong className="uppercase">{slipPrintRecord.status_verifikasi}</strong></span>
              </div>
            </div>

            <div className="border-2 border-black overflow-y-auto flex-1 max-h-[40vh] print:max-h-none">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="border-b-2 border-black bg-slate-100 print:bg-slate-200 font-black uppercase text-[10px]">
                    <th className="p-2 border-r border-black w-10 text-center">No</th>
                    <th className="p-2 border-r border-black">Nama Obat / OBHP</th>
                    <th className="p-2 border-r border-black w-16 text-center">Qty</th>
                    <th className="p-2 border-r border-black w-24 text-right">Harga Satuan</th>
                    <th className="p-2 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y border-black font-medium text-[11px]">
                  {slipPrintRecord.rincian_obat_detail?.map((item, i) => (
                    <tr key={i} className="border-b border-black">
                      <td className="p-2 border-r border-black text-center font-mono">{i + 1}</td>
                      <td className="p-2 border-r border-black uppercase font-bold">{item.nama_obat_obhp}</td>
                      <td className="p-2 border-r border-black text-center font-mono">{item.jumlah}</td>
                      <td className="p-2 border-r border-black text-right font-mono">{formatRupiah(item.harga_satuan)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatRupiah(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t-2 border-black pt-3 flex justify-between items-center text-xs font-sans">
              <span className="font-bold uppercase">Total Biaya Netto (Setelah Diskon):</span>
              <strong className="font-mono font-black text-sm">{formatRupiah(slipPrintRecord.total_biaya)}</strong>
            </div>

            {/* BLOK TANDA TANGAN */}
            <div className="pt-4 flex justify-between items-end font-sans text-xs">
              <div>
                <p className="font-bold text-slate-500">Pasien / Keluarga Pasien,</p>
                <div className="h-16"></div>
                <p className="font-bold underline">( _______________________________ )</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-500">Kerinci, {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold">Petugas Kasir / Apotek</p>
                <div className="h-16"></div>
                <p className="font-bold underline">( _______________________________ )</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 print:hidden">
              <button onClick={() => setSlipPrintRecord(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
              <button onClick={() => window.print()} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer">
                <Printer className="w-4 h-4" /> Cetak Slip Resmi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RINGKASAN KLAIM PENJAMIN */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                <PieChart className="w-5 h-5 text-purple-600" /> Ringkasan Finansial Klaim Penjamin
              </h3>
              <button onClick={() => setShowSummaryModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-emerald-800 uppercase block">BPJS Kesehatan</span>
                  <span className="text-[11px] text-slate-600">{countBpjs} Berkas Transaksi</span>
                </div>
                <div className="text-right">
                  <h4 className="font-mono font-black text-emerald-900 text-sm">{formatRupiah(totalBpjsNominal)}</h4>
                </div>
              </div>

              <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-sky-800 uppercase block">Pasien Umum / Mandiri</span>
                  <span className="text-[11px] text-slate-600">{countUmum} Berkas Transaksi</span>
                </div>
                <div className="text-right">
                  <h4 className="font-mono font-black text-sky-900 text-sm">{formatRupiah(totalUmumNominal)}</h4>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500">Total Keseluruhan Akumulasi:</span>
              <strong className="font-mono font-black text-slate-900 text-sm">{formatRupiah(totalNominal)}</strong>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setShowSummaryModal(false)} className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow cursor-pointer">
                Tutup Ringkasan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSPEKSI DETAIL */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col relative overflow-hidden">
            {detailModalRecord.status_verifikasi === 'Disetujui' && (
              <div className="absolute right-6 top-16 border-2 border-emerald-600 text-emerald-600 px-3 py-1 rounded-xl rotate-[-12deg] font-black text-[11px] uppercase tracking-wider opacity-20 pointer-events-none select-none">
                TERVERIFIKASI AUDIT
              </div>
            )}
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-purple-600" /> Detail Rincian Obat: {detailModalRecord.nama_pasien}
                </h3>
                <span className="text-xs text-slate-500 font-mono">No. Transaksi: {detailModalRecord.no_transaksi} | RM: {detailModalRecord.no_rm}</span>
              </div>
              <button onClick={() => setDetailModalRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl flex justify-between items-center text-xs">
              <span className="text-slate-600">Penjamin: <strong className="text-slate-900">{detailModalRecord.penjamin || 'Umum'}</strong></span>
              <span className="text-slate-600">Layanan: <strong className="text-slate-900">{detailModalRecord.jenis_layanan}</strong></span>
              <span className="text-slate-600">Diskon: <strong className="text-amber-700 font-mono">{formatRupiah(detailModalRecord.diskon || 0)}</strong></span>
            </div>

            <div className="overflow-y-auto space-y-2 pr-1 flex-1 text-xs">
              <div className="border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[10px]">
                      <th className="p-2.5">Nama Obat / OBHP</th>
                      <th className="p-2.5 w-16 text-center">Qty</th>
                      <th className="p-2.5 w-28 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {detailModalRecord.rincian_obat_detail?.map((item, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-bold uppercase">{item.nama_obat_obhp}</td>
                        <td className="p-2.5 text-center font-mono">{item.jumlah}</td>
                        <td className="p-2.5 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center text-xs">
              <span className="font-bold text-slate-600">Total Biaya Netto: <strong className="font-mono text-slate-900">{formatRupiah(detailModalRecord.total_biaya)}</strong></span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    const rec = detailModalRecord;
                    setDetailModalRecord(null);
                    setSlipPrintRecord(rec);
                  }} 
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Printer className="w-4 h-4" /> Cetak Slip
                </button>
                <button onClick={() => setDetailModalRecord(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SUPER ADMIN */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Edit Rincian Obat — Super Admin Hak Akses</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Pasien</label>
                  <input type="text" value={editingRecord.nama_pasien} onChange={(e) => setEditingRecord({ ...editingRecord, nama_pasien: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No RM</label>
                  <input type="text" value={editingRecord.no_rm} onChange={(e) => setEditingRecord({ ...editingRecord, no_rm: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
              </div>

              <div className="border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase text-[10px]">
                      <th className="p-2">Nama Obat/OBHP</th>
                      <th className="p-2 w-16 text-center">Qty</th>
                      <th className="p-2 w-28 text-right">Harga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-medium">
                    {editItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <input type="text" value={item.nama_obat_obhp} onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].nama_obat_obhp = e.target.value;
                            setEditItems(updated);
                          }} className="w-full border rounded p-1 font-bold" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={item.jumlah} onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].jumlah = Number(e.target.value);
                            updated[idx].subtotal = updated[idx].jumlah * updated[idx].harga_satuan;
                            setEditItems(updated);
                          }} className="w-full border rounded p-1 text-center font-mono" />
                        </td>
                        <td className="p-2">
                          <input type="number" value={item.harga_satuan} onChange={(e) => {
                            const updated = [...editItems];
                            updated[idx].harga_satuan = Number(e.target.value);
                            updated[idx].subtotal = updated[idx].jumlah * updated[idx].harga_satuan;
                            setEditItems(updated);
                          }} className="w-full border rounded p-1 text-right font-mono" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Batal</button>
              <button onClick={handleSaveSuperAdminEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer flex items-center gap-1">
                <Save className="w-4 h-4" /> Simpan Perubahan Super Admin
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