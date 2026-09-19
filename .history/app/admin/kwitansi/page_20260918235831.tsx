'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  Printer, 
  FileSpreadsheet, 
  X, 
  Save,
  Calendar,
  CheckSquare,
  Square,
  TrendingUp,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface KwitansiRecord {
  id: number;
  nomor_bukti: string;
  kode_akun: string;
  sudah_terima_dari: string;
  banyaknya_uang: string;
  untuk_pembayaran: string;
  jumlah: number;
  keterangan_lembar: string;
  status_verifikasi: string;
  catatan_penolakan?: string;
  is_locked: boolean;
  created_at: string;
}

export default function AdminKwitansiPage() {
  const [records, setRecords] = useState<KwitansiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [filterDate, setFilterDate] = useState<string>('');
  const [accountCodeFilter, setAccountCodeFilter] = useState<string>('semua');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Admin Session Activity Logs State
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Rejection Modal State
  const [rejectModalRecordId, setRejectModalRecordId] = useState<number | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');

  const [editingRecord, setEditingRecord] = useState<KwitansiRecord | null>(null);
  const [printRecord, setPrintRecord] = useState<KwitansiRecord | null>(null);

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLogs(prev => [`[${timeStr}] ${message}`, ...prev.slice(0, 4)]);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kwitansi_header')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as KwitansiRecord[]);
      }
    } catch (err) {
      console.error('Gagal memuat rekap master kwitansi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    addLog('Panel Super Admin Master Kwitansi terhubung.');
    const channel = supabase
      .channel('admin_realtime_kwitansi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kwitansi_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  const handleApprove = async (id: number) => {
    await supabase.from('kwitansi_header').update({ status_verifikasi: 'Disetujui' }).eq('id', id);
    showToast('Kwitansi berhasil diverifikasi & disetujui.', 'success');
    addLog(`Menyetujui kwitansi ID: ${id}`);
    fetchRecords();
  };

  // Fungsi Proses Penolakan dengan Catatan
  const handleSaveRejection = async () => {
    if (rejectModalRecordId === null) return;
    try {
      await supabase.from('kwitansi_header').update({ 
        status_verifikasi: 'Ditolak',
        catatan_penolakan: rejectionReasonInput || 'Berkas perlu diperbaiki.'
      }).eq('id', rejectModalRecordId);

      showToast('Kwitansi berhasil ditolak dengan catatan.', 'error');
      addLog(`Menolak kwitansi ID: ${rejectModalRecordId} dengan alasan: ${rejectionReasonInput}`);
      setRejectModalRecordId(null);
      setRejectionReasonInput('');
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menolak kwitansi: ${err.message}`, 'error');
    }
  };

  // Bulk Actions: Setujui Terpilih
  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      await supabase.from('kwitansi_header').update({ status_verifikasi: 'Disetujui' }).in('id', selectedIds);
      showToast(`${selectedIds.length} kwitansi terpilih berhasil disetujui massal!`, 'success');
      addLog(`Persetujuan massal untuk ${selectedIds.length} berkas.`);
      setSelectedIds([]);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menyetujui massal: ${err.message}`, 'error');
    }
  };

  // Bulk Actions: Kunci / Buka Kunci Massal
  const handleBulkLockToggle = async (lockState: boolean) => {
    if (selectedIds.length === 0) return;
    try {
      await supabase.from('kwitansi_header').update({ is_locked: lockState }).in('id', selectedIds);
      showToast(`${selectedIds.length} berkas berhasil di-${lockState ? 'kunci' : 'buka kunci'} massal!`, 'info');
      addLog(`Mengubah status kunci massal (${lockState ? 'Locked' : 'Unlocked'}) untuk ${selectedIds.length} berkas.`);
      setSelectedIds([]);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal mengubah status kunci massal: ${err.message}`, 'error');
    }
  };

  const handleToggleLock = async (id: number, currentLocked: boolean) => {
    await supabase.from('kwitansi_header').update({ is_locked: !currentLocked }).eq('id', id);
    showToast(`Status kunci diubah menjadi ${!currentLocked ? 'Locked' : 'Unlocked'}.`, 'info');
    addLog(`Mengubah status kunci ID ${id} menjadi ${!currentLocked ? 'Locked' : 'Unlocked'}`);
    fetchRecords();
  };

  const handleDelete = async (id: number) => {
    if (confirm('PERINGATAN SUPER ADMIN: Hapus permanen data kwitansi ini?')) {
      await supabase.from('kwitansi_header').delete().eq('id', id);
      showToast('Kwitansi berhasil dihapus permanen.', 'error');
      addLog(`Menghapus permanen kwitansi ID: ${id}`);
      fetchRecords();
    }
  };

  const handleSaveSuperAdminEdit = async () => {
    if (!editingRecord) return;
    try {
      await supabase.from('kwitansi_header').update({
        sudah_terima_dari: editingRecord.sudah_terima_dari,
        untuk_pembayaran: editingRecord.untuk_pembayaran,
        jumlah: editingRecord.jumlah,
        banyaknya_uang: editingRecord.banyaknya_uang,
        kode_akun: editingRecord.kode_akun,
        keterangan_lembar: editingRecord.keterangan_lembar
      }).eq('id', editingRecord.id);

      showToast('Kwitansi berhasil diperbarui oleh Super Admin!', 'success');
      addLog(`Memperbarui data master kwitansi No. Bukti: ${editingRecord.nomor_bukti}`);
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal memperbarui: ${err.message}`, 'error');
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ["Nomor Bukti", "Kode Akun", "Sudah Terima Dari", "Untuk Pembayaran", "Jumlah", "Lembar", "Status Verifikasi", "Tanggal"];
    const rows = records.map(r => [r.nomor_bukti, r.kode_akun, `"${r.sudah_terima_dari}"`, `"${r.untuk_pembayaran}"`, r.jumlah, `"${r.keterangan_lembar}"`, r.status_verifikasi, r.created_at]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Kwitansi_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan CSV berhasil diunduh.', 'success');
    addLog('Mengunduh laporan rekapitulasi CSV.');
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.sudah_terima_dari || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.nomor_bukti || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true :
      statusFilter === 'pending' ? r.status_verifikasi === 'Menunggu Verifikasi' :
      statusFilter === 'disetujui' ? r.status_verifikasi === 'Disetujui' :
      statusFilter === 'ditolak' ? r.status_verifikasi === 'Ditolak' : true;
    const matchDate = filterDate ? r.created_at?.slice(0, 10) === filterDate : true;
    const matchAccount = accountCodeFilter === 'semua' ? true : r.kode_akun === accountCodeFilter;

    return matchSearch && matchStatus && matchDate && matchAccount;
  });

  // Statistik Ringkas Admin
  const totalApprovedNominal = records.filter(r => r.status_verifikasi === 'Disetujui').reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
  const totalPendingCount = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalApprovedCount = records.filter(r => r.status_verifikasi === 'Disetujui').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* HEADER KOP CETAK LAPORAN REKAP */}
      <div className="hidden print:block p-6 text-center border-b-2 border-slate-900 mb-6">
        <h2 className="text-lg font-black uppercase">PEMERINTAH KABUPATEN KERINCI</h2>
        <h1 className="text-xl font-black uppercase">RUMAH SAKIT UMUM DAERAH BUKIT KERMAN</h1>
        <p className="text-xs">Jl. Lintas Kerinci - Sungai Penuh, Kab. Kerinci, Jambi</p>
        <hr className="my-2 border-slate-400" />
        <h3 className="text-sm font-bold uppercase mt-2">LAPORAN MASTER REKAPITULASI KWITANSI PEMBAYARAN</h3>
      </div>

      <AdminHeader title="RSUD BUKIT KERMAN" subtitle="Master Kwitansi — Super Admin Control & Verifikasi" badgeText="Super Admin" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-purple-600" /> Master Arsip Kwitansi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola, verifikasi, ubah, buka kunci, dan cetak seluruh arsip kwitansi kasir.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-4 h-4 text-purple-600" /> Cetak Rekap
            </button>
            <button onClick={handleExportCSV} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Ekspor CSV
            </button>
          </div>
        </div>

        {/* KARTU STATISTIK ADMIN */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Menunggu Verifikasi</span>
              <h3 className="text-lg font-black text-amber-600">{totalPendingCount} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Disetujui</span>
              <h3 className="text-lg font-black text-emerald-600">{totalApprovedCount} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Akumulasi Disetujui</span>
              <h3 className="text-sm font-black font-mono text-slate-900">{formatRupiah(totalApprovedNominal)}</h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TOOLBAR BULK ACTION & FILTER */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari Nomor Bukti, Penerima..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* FILTER KODE AKUN */}
              <div className="relative w-full sm:w-auto flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={accountCodeFilter}
                  onChange={(e) => setAccountCodeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                >
                  <option value="semua">Semua Kode Akun</option>
                  <option value="5.2.2.01.01">5.2.2.01.01 (ATK)</option>
                  <option value="5.2.2.02.01">5.2.2.02.01 (Bahan/Obat)</option>
                  <option value="5.2.2.03.01">5.2.2.03.01 (Jasa Medis)</option>
                </select>
              </div>

              {/* FILTER TANGGAL ADMIN */}
              <div className="relative w-full sm:w-auto flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                />
                {filterDate && (
                  <button onClick={() => setFilterDate('')} className="text-xs text-rose-600 font-bold hover:underline">Reset</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedIds.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={handleBulkApprove}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Setujui ({selectedIds.length})
                  </button>
                  <button
                    onClick={() => handleBulkLockToggle(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" /> Kunci ({selectedIds.length})
                  </button>
                  <button
                    onClick={() => handleBulkLockToggle(false)}
                    className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-xl shadow transition cursor-pointer flex items-center gap-1"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Buka Kunci ({selectedIds.length})
                  </button>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
                <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
                <button onClick={() => setStatusFilter('disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
                <button onClick={() => setStatusFilter('ditolak')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'ditolak' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Ditolak</button>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(filteredRecords.map(r => r.id));
                        } else {
                          setSelectedIds([]);
                        }
                      }}
                      checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                      className="rounded cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">Nomor Bukti &amp; Akun</th>
                  <th className="p-3.5">Sudah Terima Dari</th>
                  <th className="p-3.5">Untuk Pembayaran</th>
                  <th className="p-3.5 text-right">Jumlah</th>
                  <th className="p-3.5 text-center">Lembar</th>
                  <th className="p-3.5 text-center">Kunci</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">Memuat data master...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-12 text-slate-400">Tidak ada data kwitansi ditemukan.</td></tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, r.id]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== r.id));
                            }
                          }}
                          className="rounded cursor-pointer"
                        />
                      </td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {r.nomor_bukti}
                        <span className="block text-[10px] text-slate-400 font-normal">Akun: {r.kode_akun}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{r.sudah_terima_dari}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.untuk_pembayaran}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatRupiah(r.jumlah)}</td>
                      <td className="p-3.5 text-center font-bold text-purple-700">{r.keterangan_lembar?.split(':')[0]}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleToggleLock(r.id, r.is_locked)}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer ${
                            r.is_locked ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {r.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{r.is_locked ? 'Locked' : 'Unlocked'}</span>
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status_verifikasi}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setPrintRecord(r)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer" title="Cetak Blangko Resmi"><Printer className="w-3.5 h-3.5 text-purple-600" /></button>
                          <button onClick={() => handleApprove(r.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer" title="Setujui"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setRejectModalRecordId(r.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl cursor-pointer" title="Tolak"><XCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingRecord(r)} className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ADMIN SESSION ACTIVITY TICKER */}
        <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-purple-400 shrink-0 border border-slate-700">
              <Activity className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Log Aktivitas Super Admin</h4>
              <p className="text-[11px] text-slate-400">Pencatatan kontrol verifikasi dan penguncian arsip keuangan RSUD Bukit Kerman.</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-300 space-y-1 w-full md:w-auto bg-slate-950 p-3 rounded-2xl border border-slate-800">
            {activityLogs.length === 0 ? (
              <span className="text-slate-500 italic">Belum ada aktivitas tercatat.</span>
            ) : (
              activityLogs.map((log, index) => (
                <div key={index} className="truncate max-w-md">{log}</div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL ALASAN PENOLAKAN ADMIN */}
      {rejectModalRecordId !== null && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Alasan Penolakan Kwitansi
              </h3>
              <button onClick={() => setRejectModalRecordId(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-2 text-xs">
              <label className="font-bold text-slate-700 block">Masukkan catatan atau alasan perbaikan untuk kasir *</label>
              <textarea
                rows={3}
                placeholder="Contoh: Nominal terbilang tidak sesuai dengan jumlah angka."
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 uppercase focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setRejectModalRecordId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Batal</button>
              <button onClick={handleSaveRejection} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow">Kirim Penolakan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT SUPER ADMIN */}
      {editingRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Edit Kwitansi — Super Admin Access</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Akun</label>
                  <input type="text" value={editingRecord.kode_akun} onChange={(e) => setEditingRecord({ ...editingRecord, kode_akun: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pilih Keterangan Lembar</label>
                  <select value={editingRecord.keterangan_lembar} onChange={(e) => setEditingRecord({ ...editingRecord, keterangan_lembar: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold">
                    <option value="Lembar 1 : Pembukuan">Lembar 1 : Pembukuan</option>
                    <option value="Lembar 2 : Penerimaan">Lembar 2 : Penerimaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sudah terima dari</label>
                <input type="text" value={editingRecord.sudah_terima_dari} onChange={(e) => setEditingRecord({ ...editingRecord, sudah_terima_dari: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold uppercase" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Untuk Pembayaran</label>
                <textarea rows={2} value={editingRecord.untuk_pembayaran} onChange={(e) => setEditingRecord({ ...editingRecord, untuk_pembayaran: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 uppercase" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah (Rp)</label>
                  <input type="number" value={editingRecord.jumlah} onChange={(e) => setEditingRecord({ ...editingRecord, jumlah: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono font-bold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Banyaknya Uang (Terbilang)</label>
                  <input type="text" value={editingRecord.banyaknya_uang} onChange={(e) => setEditingRecord({ ...editingRecord, banyaknya_uang: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 uppercase" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
              <button onClick={handleSaveSuperAdminEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow cursor-pointer flex items-center gap-1">
                <Save className="w-4 h-4" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW CETAK BLANGKO RESMI DI ADMIN */}
      {printRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <h3 className="text-sm font-black uppercase text-slate-900">Cetak Arsip Kwitansi Resmi</h3>
              <button onClick={() => setPrintRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {/* FORMAT BLANGKO RESMI RSUD BUKIT KERMAN */}
            <div className="p-8 border-2 border-slate-900 rounded-xl space-y-4 bg-white text-slate-900 font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-center border">Logo Kab.</div>
                <div className="text-center flex-1 px-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-black uppercase tracking-wide">DINAS KESEHATAN</h2>
                  <h1 className="text-base font-black uppercase tracking-wider">RSUD BUKIT KERMAN</h1>
                  <p className="text-[10px] text-slate-700 mt-0.5">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[9px] text-blue-600 underline">Website: https://rsudbukitkerman.kerincikab.go.id &nbsp;&nbsp;|&nbsp;&nbsp; e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-center border text-emerald-700">Logo RSUD</div>
              </div>

              <div className="grid grid-cols-2 text-xs font-mono font-bold pt-2">
                <div>NOMOR BUKTI &nbsp;&nbsp;: &nbsp;&nbsp;{printRecord.nomor_bukti}</div>
                <div>KODE AKUN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;{printRecord.kode_akun}</div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-base font-black uppercase underline tracking-widest">KWITANSI</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Sudah terima dari</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 font-black uppercase">{printRecord.sudah_terima_dari}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Banyaknya Uang</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 font-bold italic uppercase bg-slate-50 p-1 border rounded">{printRecord.banyaknya_uang}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Untuk Pembayaran</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 uppercase leading-relaxed">{printRecord.untuk_pembayaran}</span>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <div className="border-t-2 border-b-2 border-slate-900 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-black italic uppercase tracking-wider">JUMLAH &nbsp;&nbsp;:</span>
                  <span className="text-lg font-black font-mono">{formatRupiah(printRecord.jumlah)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-4 text-xs">
                <div className="space-y-1 text-[11px] text-slate-800">
                  <p className="font-bold">Keterangan :</p>
                  <p className={printRecord.keterangan_lembar?.includes('Lembar 1') ? 'font-black text-purple-900 underline' : 'text-slate-500'}>
                    &nbsp;&nbsp;&nbsp;&nbsp;Lembar 1 &nbsp;&nbsp;: Pembukuan
                  </p>
                  <p className={printRecord.keterangan_lembar?.includes('Lembar 2') ? 'font-black text-purple-900 underline' : 'text-slate-500'}>
                    &nbsp;&nbsp;&nbsp;&nbsp;Lembar 2 &nbsp;&nbsp;: Penerimaan
                  </p>
                </div>
                <div className="text-center space-y-1">
                  <p>Bukit Kerman, {new Date(printRecord.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                  <div className="h-14"></div>
                  <p className="font-bold uppercase">dr. SYAFRIAL</p>
                  <p className="font-mono text-[11px]">NIP. 197004162001121001</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                <Printer className="w-4 h-4" /> Cetak Kwitansi Resmi
              </button>
              <button onClick={() => setPrintRecord(null)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}