'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
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
  Clock,
  ShieldCheck,
  Activity,
  ArrowLeft,
  AlertTriangle,
  CheckSquare,
  Square,
  Eye,
  MapPin,
  Camera,
  Check,
  PieChart,
  Navigation,
  RefreshCw,
  Layers,
  Sliders,
  Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface AbsensiRecord {
  id: number;
  uuid: string;
  user_id?: string;
  email_user?: string;
  nama_pegawai: string;
  jabatan: string;
  unit_kerja?: string;
  shift: string;
  status_kehadiran: string;
  keterangan: string;
  status_verifikasi: string;
  catatan_penolakan?: string;
  foto_selfie?: string;
  latitude?: number;
  longitude?: number;
  jarak_meter?: number;
  status_radius?: string;
  is_locked: boolean;
  created_at: string;
}

interface AbsensiSetting {
  id: number;
  hari: string;
  nama_shift: string;
  jam_masuk: string;
  jam_pulang: string;
  batas_awal_masuk: string;
  batas_akhir_masuk: string;
  batas_awal_pulang: string;
  batas_akhir_pulang: string;
  radius_meter: number;
  is_active: boolean;
}

export default function AdminAbsensiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rekap' | 'pengaturan'>('rekap');
  
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [settings, setSettings] = useState<AbsensiSetting[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [filterDate, setFilterDate] = useState<string>('');
  const [shiftFilter, setShiftFilter] = useState<string>('semua');
  const [radiusFilter, setRadiusFilter] = useState<string>('semua');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [lastSynced, setLastSynced] = useState<string>('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Session Activity Logs State
  const [activityLogs, setActivityLogs] = useState<string[]>([]);
   
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Rejection, Edit, & Inspection Modal State
  const [rejectModalId, setRejectModalId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [editingRecord, setEditingRecord] = useState<AbsensiRecord | null>(null);
  const [inspectRecord, setInspectRecord] = useState<AbsensiRecord | null>(null);

  // Settings Modal State
  const [settingModal, setSettingModal] = useState<boolean>(false);
  const [editingSetting, setEditingSetting] = useState<AbsensiSetting | null>(null);

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
        .from('absensi_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as AbsensiRecord[]);
        setLastSynced(new Date().toLocaleTimeString('id-ID'));
      }
    } catch (err) {
      console.error('Gagal memuat rekap absensi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('absensi_settings')
        .select('*')
        .order('id', { ascending: true });

      if (!error && data) {
        setSettings(data as AbsensiSetting[]);
      }
    } catch (err) {
      console.error('Gagal memuat pengaturan absensi:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    fetchSettings();
    addLog('Panel Super Admin Master Absensi terhubung.');
    
    const channel = supabase
      .channel('admin_realtime_absensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_records' }, () => {
        fetchRecords();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_settings' }, () => {
        fetchSettings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords, fetchSettings]);

  // Shortcut Keyboard '/' untuk fokus pencarian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('search-admin-absensi')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApprove = async (id: number) => {
    await supabase.from('absensi_records').update({ status_verifikasi: 'Disetujui' }).eq('id', id);
    showToast('Absensi pegawai berhasil disetujui.', 'success');
    addLog(`Menyetujui absensi ID: ${id}`);
    fetchRecords();
  };

  const handleSaveRejection = async () => {
    if (rejectModalId === null) return;
    try {
      await supabase.from('absensi_records').update({ 
        status_verifikasi: 'Ditolak',
        catatan_penolakan: rejectionReason || 'Absensi perlu dikonfirmasi ulang.'
      }).eq('id', rejectModalId);

      showToast('Absensi ditolak dengan catatan.', 'error');
      addLog(`Menolak absensi ID: ${rejectModalId}`);
      setRejectModalId(null);
      setRejectionReason('');
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menolak: ${err.message}`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('PERINGATAN: Hapus permanen data absensi ini?')) {
      await supabase.from('absensi_records').delete().eq('id', id);
      showToast('Data absensi berhasil dihapus permanen.', 'error');
      addLog(`Menghapus permanen absensi ID: ${id}`);
      fetchRecords();
    }
  };

  // Bulk Actions Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredRecords.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(item => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Setujui ${selectedIds.length} data absensi yang dipilih?`)) {
      for (const id of selectedIds) {
        await supabase.from('absensi_records').update({ status_verifikasi: 'Disetujui' }).eq('id', id);
      }
      showToast(`Berhasil menyetujui ${selectedIds.length} data absensi.`, 'success');
      addLog(`Bulk approve ${selectedIds.length} data absensi.`);
      setSelectedIds([]);
      fetchRecords();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`PERINGATAN: Hapus permanen ${selectedIds.length} data absensi yang dipilih?`)) {
      for (const id of selectedIds) {
        await supabase.from('absensi_records').delete().eq('id', id);
      }
      showToast(`Berhasil menghapus ${selectedIds.length} data absensi.`, 'error');
      addLog(`Bulk delete ${selectedIds.length} data absensi.`);
      setSelectedIds([]);
      fetchRecords();
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    try {
      await supabase.from('absensi_records').update({
        nama_pegawai: editingRecord.nama_pegawai,
        jabatan: editingRecord.jabatan,
        shift: editingRecord.shift,
        status_kehadiran: editingRecord.status_kehadiran,
        keterangan: editingRecord.keterangan
      }).eq('id', editingRecord.id);

      showToast('Data absensi berhasil diperbarui!', 'success');
      addLog(`Memperbarui data absensi pegawai: ${editingRecord.nama_pegawai}`);
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal memperbarui: ${err.message}`, 'error');
    }
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;
    try {
      if (editingSetting.id) {
        await supabase.from('absensi_settings').update({
          hari: editingSetting.hari,
          nama_shift: editingSetting.nama_shift,
          jam_masuk: editingSetting.jam_masuk,
          jam_pulang: editingSetting.jam_pulang,
          batas_awal_masuk: editingSetting.batas_awal_masuk,
          batas_akhir_masuk: editingSetting.batas_akhir_masuk,
          batas_awal_pulang: editingSetting.batas_awal_pulang,
          batas_akhir_pulang: editingSetting.batas_akhir_pulang,
          radius_meter: Number(editingSetting.radius_meter),
          is_active: editingSetting.is_active
        }).eq('id', editingSetting.id);
      } else {
        await supabase.from('absensi_settings').insert([{
          hari: editingSetting.hari,
          nama_shift: editingSetting.nama_shift,
          jam_masuk: editingSetting.jam_masuk,
          jam_pulang: editingSetting.jam_pulang,
          batas_awal_masuk: editingSetting.batas_awal_masuk,
          batas_akhir_masuk: editingSetting.batas_akhir_masuk,
          batas_awal_pulang: editingSetting.batas_awal_pulang,
          batas_akhir_pulang: editingSetting.batas_akhir_pulang,
          radius_meter: Number(editingSetting.radius_meter),
          is_active: editingSetting.is_active
        }]);
      }
      showToast('Pengaturan shift & radius berhasil disimpan!', 'success');
      addLog(`Memperbarui pengaturan shift: ${editingSetting.nama_shift}`);
      setSettingModal(false);
      setEditingSetting(null);
      fetchSettings();
    } catch (err: any) {
      showToast(`Gagal menyimpan pengaturan: ${err.message}`, 'error');
    }
  };

  const handleDeleteSetting = async (id: number) => {
    if (confirm('Hapus pengaturan shift ini?')) {
      await supabase.from('absensi_settings').delete().eq('id', id);
      showToast('Pengaturan shift berhasil dihapus.', 'error');
      addLog(`Menghapus pengaturan shift ID: ${id}`);
      fetchSettings();
    }
  };

  const handleExportCSV = () => {
    if (records.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ["Nama Pegawai", "Jabatan", "Shift", "Kehadiran", "Jarak GPS (m)", "Keterangan", "Status", "Tanggal"];
    const rows = records.map(r => [`"${r.nama_pegawai}"`, `"${r.jabatan}"`, r.shift, r.status_kehadiran, r.jarak_meter || 0, `"${r.keterangan}"`, r.status_verifikasi, r.created_at]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Rekap_Absensi_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Laporan rekap CSV berhasil diunduh.', 'success');
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.nama_pegawai || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.jabatan || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true : r.status_verifikasi.toLowerCase() === statusFilter.toLowerCase();
    const matchDate = filterDate ? r.created_at?.slice(0, 10) === filterDate : true;
    const matchShift = shiftFilter === 'semua' ? true : r.shift === shiftFilter;
    
    let matchRadius = true;
    if (radiusFilter === 'valid') {
      matchRadius = (r.jarak_meter ?? 999) <= 150;
    } else if (radiusFilter === 'invalid') {
      matchRadius = (r.jarak_meter ?? 0) > 150;
    }

    return matchSearch && matchStatus && matchDate && matchShift && matchRadius;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalHadir = records.filter(r => r.status_kehadiran === 'Hadir').length;
  const totalSakit = records.filter(r => r.status_kehadiran === 'Sakit').length;
  const totalIzin = records.filter(r => r.status_kehadiran === 'Izin').length;
  const totalApproved = records.filter(r => r.status_verifikasi === 'Disetujui').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* KOP CETAK RESMI RSUD BUKIT KERMAN */}
      <div className="hidden print:block p-8 text-center border-b-4 border-slate-900 mb-6 font-serif">
        <h2 className="text-sm font-bold tracking-widest uppercase">PEMERINTAH KABUPATEN KERINCI</h2>
        <h1 className="text-xl font-black uppercase tracking-wide mt-1">RUMAH SAKIT UMUM DAERAH BUKIT KERMAN</h1>
        <p className="text-[11px] text-slate-700 mt-0.5">Jl. Lintas Kerinci - Sungai Penuh, Kab. Kerinci, Jambi 37172</p>
        <hr className="my-3 border-slate-900 border-t-2" />
        <h3 className="text-sm font-bold uppercase underline mt-2">LAPORAN RESMI REKAPITULASI KEHADIRAN PEGAWAI</h3>
        <p className="text-[11px] mt-1">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <AdminHeader title="RSUD BUKIT KERMAN" subtitle="Master Absensi — Super Admin Control & Verifikasi" badgeText="Super Admin" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* JUDUL DAN TOMBOL KEMBALI */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200 shadow-sm"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-purple-600" /> Master Rekap Absensi &amp; Pengaturan
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Kelola rekapitulasi kehadiran, verifikasi, serta pengaturan shift &amp; radius geofencing RSUD Bukit Kerman.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={fetchRecords} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer" title="Sinkronisasi Data">
              <RefreshCw className={`w-4 h-4 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} /> Sinkronkan {lastSynced && `(${lastSynced})`}
            </button>
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer">
              <Printer className="w-4 h-4 text-purple-600" /> Cetak Rekap
            </button>
            <button onClick={handleExportCSV} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet className="w-4 h-4 text-purple-600" /> Ekspor CSV
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION UTAMA */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'rekap' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" /> Rekap &amp; Verifikasi Absensi ({records.length})
          </button>
          <button
            onClick={() => setActiveTab('pengaturan')}
            className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'pengaturan' ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20' : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> Pengaturan Shift &amp; Radius (`absensi_settings`) ({settings.length})
          </button>
        </div>

        {/* KONTEN TAB 1: REKAP & VERIFIKASI */}
        {activeTab === 'rekap' && (
          <div className="space-y-6 animate-in fade-in">
            {/* KARTU STATISTIK ANALITIK MENDALAM */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 print:hidden">
              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Pending Verifikasi</span>
                  <h3 className="text-base font-black text-amber-600">{totalPending} Berkas</h3>
                </div>
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Disetujui</span>
                  <h3 className="text-base font-black text-emerald-600">{totalApproved} Berkas</h3>
                </div>
                <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Hadir</span>
                  <h3 className="text-base font-black text-slate-900">{totalHadir} Orang</h3>
                </div>
                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Sakit</span>
                  <h3 className="text-base font-black text-amber-600">{totalSakit} Orang</h3>
                </div>
                <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Izin / Lainnya</span>
                  <h3 className="text-base font-black text-sky-600">{totalIzin} Orang</h3>
                </div>
                <div className="w-9 h-9 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* TOOLBAR & TABEL */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto flex-wrap">
                  <div className="relative flex-1 max-w-xs w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      id="search-admin-absensi"
                      type="text"
                      placeholder="Cari nama pegawai, jabatan... (Tekan '/' untuk fokus)"
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                    />
                  </div>

                  <select
                    value={shiftFilter}
                    onChange={(e) => { setShiftFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    <option value="semua">Semua Shift</option>
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>

                  <select
                    value={radiusFilter}
                    onChange={(e) => { setRadiusFilter(e.target.value); setCurrentPage(1); }}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                  >
                    <option value="semua">Semua Radius GPS</option>
                    <option value="valid">Dalam Radius (≤ 150m)</option>
                    <option value="invalid">Di Luar Radius (&gt; 150m)</option>
                  </select>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                      className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                    />
                    {filterDate && <button onClick={() => setFilterDate('')} className="text-xs text-rose-600 font-bold hover:underline">Reset</button>}
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold bg-slate-100 p-1 rounded-2xl">
                  <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
                  <button onClick={() => setStatusFilter('Menunggu Verifikasi')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Menunggu Verifikasi' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
                  <button onClick={() => setStatusFilter('Disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
                  <button onClick={() => setStatusFilter('Ditolak')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Ditolak' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Ditolak</button>
                </div>
              </div>

              {/* BULK ACTIONS FLOATING TOOLBAR */}
              {selectedIds.length > 0 && (
                <div className="bg-purple-900 text-white p-3 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                  <span className="font-bold flex items-center gap-2">
                    <span className="w-5 h-5 bg-white text-purple-900 rounded-full flex items-center justify-center font-black text-[10px]">{selectedIds.length}</span>
                    Data terpilih untuk tindakan massal:
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={handleBulkApprove} className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl cursor-pointer transition flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Setujui Terpilih
                    </button>
                    <button onClick={handleBulkDelete} className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl cursor-pointer transition flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Terpilih
                    </button>
                    <button onClick={() => setSelectedIds([])} className="text-slate-300 hover:text-white px-2 py-1 font-bold">Batal</button>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                      <th className="p-3 w-10 text-center print:hidden">
                        <input 
                          type="checkbox" 
                          onChange={handleSelectAll} 
                          checked={selectedIds.length > 0 && selectedIds.length === filteredRecords.length}
                          className="rounded border-slate-300 cursor-pointer text-purple-600 focus:ring-purple-500"
                        />
                      </th>
                      <th className="p-3.5">Nama Pegawai &amp; Jabatan</th>
                      <th className="p-3.5">Shift</th>
                      <th className="p-3.5 text-center">Kehadiran</th>
                      <th className="p-3.5 text-center">GPS Jarak</th>
                      <th className="p-3.5">Keterangan</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-center print:hidden">Aksi Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {isLoading ? (
                      <tr><td colSpan={8} className="text-center py-8 text-slate-400">Memuat rekap absensi...</td></tr>
                    ) : paginatedRecords.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-slate-400">Tidak ada data absensi ditemukan.</td></tr>
                    ) : (
                      paginatedRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 text-center print:hidden">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.includes(r.id)} 
                              onChange={() => handleSelectOne(r.id)}
                              className="rounded border-slate-300 cursor-pointer text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              {r.foto_selfie && (
                                <img src={r.foto_selfie} alt="Selfie" className="w-8 h-8 rounded-xl object-cover border border-slate-200 shrink-0 print:hidden" />
                              )}
                              <div>
                                {r.nama_pegawai}
                                <span className="block text-[10px] text-slate-400 font-normal">{r.jabatan}</span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-purple-700">{r.shift}</td>
                          <td className="p-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              r.status_kehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' :
                              r.status_kehadiran === 'Sakit' ? 'bg-amber-100 text-amber-800' : 'bg-sky-100 text-sky-800'
                            }`}>
                              {r.status_kehadiran}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <span className={`font-mono font-bold px-2 py-0.5 rounded-lg text-[11px] ${
                              (r.jarak_meter ?? 0) <= 150 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`} title={(r.jarak_meter ?? 0) <= 150 ? 'Valid Dalam Radius' : 'Di Luar Radius Resmi'}>
                              {r.jarak_meter !== undefined ? `${r.jarak_meter} m` : 'N/A'}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.keterangan || '-'}</td>
                          <td className="p-3.5 text-center">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                              r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                              r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`} title={r.status_verifikasi === 'Ditolak' && r.catatan_penolakan ? `Alasan: ${r.catatan_penolakan}` : ''}>
                              {r.status_verifikasi} {r.status_verifikasi === 'Ditolak' && r.catatan_penolakan && ' ℹ️'}
                            </span>
                          </td>
                          <td className="p-3.5 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setInspectRecord(r)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer" title="Inspeksi Selfie & GPS"><Eye className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleApprove(r.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer" title="Setujui"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setRejectModalId(r.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl cursor-pointer" title="Tolak"><XCircle className="w-3.5 h-3.5" /></button>
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

              {/* KOTAK TANDA TANGAN CETAK (HANYA MUNCUL SAAT PRINT) */}
              <div className="hidden print:flex justify-between items-start pt-16 text-xs text-slate-900 font-serif">
                <div className="text-center space-y-16">
                  <p>Mengetahui,<br /><strong>Direktur RSUD Bukit Kerman</strong></p>
                  <div className="pt-4">
                    <p className="underline font-bold">Dr. H. Pejabat Rumah Sakit, M.Kes</p>
                    <p>NIP. 19700101 200012 1 001</p>
                  </div>
                </div>
                <div className="text-center space-y-16">
                  <p>Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br /><strong>Kasubbag Kepegawaian &amp; Umum</strong></p>
                  <div className="pt-4">
                    <p className="underline font-bold">Administrator IT / Sanitarian</p>
                    <p>NIP. 19850505 201001 2 005</p>
                  </div>
                </div>
              </div>

              {/* PAGINATION */}
              {filteredRecords.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 gap-3 print:hidden">
                  <span>Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredRecords.length} total data)</span>
                  <div className="flex items-center gap-1">
                    <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition">Sebelumnya</button>
                    <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition">Selanjutnya</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* KONTEN TAB 2: PENGATURAN SHIFT & RADIUS (absensi_settings) */}
        {activeTab === 'pengaturan' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-purple-600" /> Konfigurasi Shift &amp; Radius Geofencing
                </h3>
                <p className="text-xs text-slate-500">Kelola jam kerja, batas toleransi presensi, dan radius maksimum lokasi RSUD Bukit Kerman.</p>
              </div>
              <button
                onClick={() => {
                  setEditingSetting({
                    id: 0,
                    hari: 'Setiap Hari',
                    nama_shift: 'Pagi',
                    jam_masuk: '07:30',
                    jam_pulang: '14:00',
                    batas_awal_masuk: '06:00',
                    batas_akhir_masuk: '08:00',
                    batas_awal_pulang: '14:00',
                    batas_akhir_pulang: '18:00',
                    radius_meter: 150,
                    is_active: true
                  });
                  setSettingModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" /> Tambah Shift Baru
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                    <th className="p-3.5">Hari &amp; Shift</th>
                    <th className="p-3.5 text-center">Jam Kerja</th>
                    <th className="p-3.5 text-center">Batas Absen Masuk</th>
                    <th className="p-3.5 text-center">Batas Absen Pulang</th>
                    <th className="p-3.5 text-center">Radius GPS</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {settings.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-400">Belum ada pengaturan shift di tabel `absensi_settings`.</td></tr>
                  ) : (
                    settings.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">
                          {s.nama_shift}
                          <span className="block text-[10px] text-slate-400 font-normal">{s.hari}</span>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-purple-700">{s.jam_masuk} - {s.jam_pulang}</td>
                        <td className="p-3.5 text-center font-mono text-slate-600">{s.batas_awal_masuk} s/d {s.batas_akhir_masuk}</td>
                        <td className="p-3.5 text-center font-mono text-slate-600">{s.batas_awal_pulang} s/d {s.batas_akhir_pulang}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-900">{s.radius_meter} meter</td>
                        <td className="p-3.5 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                            {s.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => { setEditingSetting(s); setSettingModal(true); }} className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl cursor-pointer" title="Edit Shift"><Edit3 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteSetting(s.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl cursor-pointer" title="Hapus Shift"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* LOG AKTIVITAS */}
        <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-purple-400 shrink-0 border border-slate-700">
              <Activity className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Log Aktivitas Super Admin</h4>
              <p className="text-[11px] text-slate-400">Pencatatan kontrol verifikasi dan penguncian rekap absensi RSUD Bukit Kerman.</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-300 space-y-1 w-full md:w-auto bg-slate-950 p-3 rounded-2xl border border-slate-800">
            {activityLogs.length === 0 ? <span className="text-slate-500 italic">Belum ada aktivitas tercatat.</span> : activityLogs.map((log, index) => <div key={index} className="truncate max-w-md">{log}</div>)}
          </div>
        </div>
      </main>

      {/* MODAL PENGATURAN SHIFT (ABSENSI_SETTINGS) */}
      {settingModal && editingSetting && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">{editingSetting.id ? 'Edit Pengaturan Shift' : 'Tambah Shift Baru'}</h3>
              <button onClick={() => setSettingModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Shift</label>
                  <input type="text" value={editingSetting.nama_shift} onChange={(e) => setEditingSetting({ ...editingSetting, nama_shift: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hari</label>
                  <input type="text" value={editingSetting.hari} onChange={(e) => setEditingSetting({ ...editingSetting, hari: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Masuk</label>
                  <input type="text" value={editingSetting.jam_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, jam_masuk: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jam Pulang</label>
                  <input type="text" value={editingSetting.jam_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, jam_pulang: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Awal Masuk</label>
                  <input type="text" value={editingSetting.batas_awal_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, batas_awal_masuk: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Akhir Masuk</label>
                  <input type="text" value={editingSetting.batas_akhir_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, batas_akhir_masuk: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Awal Pulang</label>
                  <input type="text" value={editingSetting.batas_awal_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, batas_awal_pulang: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Batas Akhir Pulang</label>
                  <input type="text" value={editingSetting.batas_akhir_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, batas_akhir_pulang: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Radius Meter GPS</label>
                  <input type="number" value={editingSetting.radius_meter} onChange={(e) => setEditingSetting({ ...editingSetting, radius_meter: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Keaktifan</label>
                  <select value={editingSetting.is_active ? 'true' : 'false'} onChange={(e) => setEditingSetting({ ...editingSetting, is_active: e.target.value === 'true' })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setSettingModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer">Batal</button>
              <button onClick={handleSaveSetting} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1">
                <Save className="w-4 h-4" /> Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INSPEKSI BUKTI (SELFIE & GPS) */}
      {inspectRecord && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" /> Inspeksi Bukti Absensi
              </h3>
              <button onClick={() => setInspectRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {inspectRecord.foto_selfie ? (
              <div className="w-full h-56 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <img src={inspectRecord.foto_selfie} alt="Live Selfie" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-full h-32 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">Tidak ada foto selfie</div>
            )}

            <div className="space-y-2 pt-2 divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Nama Pegawai</span>
                <span className="font-bold text-slate-900">{inspectRecord.nama_pegawai}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Jabatan / Unit</span>
                <span className="font-bold text-slate-700">{inspectRecord.jabatan}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Shift &amp; Kehadiran</span>
                <span className="font-bold text-purple-700">{inspectRecord.shift} ({inspectRecord.status_kehadiran})</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400">Jarak GPS dari RSUD</span>
                <span className="font-mono font-bold text-slate-900">{inspectRecord.jarak_meter !== undefined ? `${inspectRecord.jarak_meter} meter` : 'N/A'}</span>
              </div>
              {inspectRecord.latitude && inspectRecord.longitude && (
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-400">Koordinat Lng/Lat</span>
                  <span className="font-mono text-[10px] text-slate-600">{inspectRecord.latitude.toFixed(6)}, {inspectRecord.longitude.toFixed(6)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <button onClick={() => setInspectRecord(null)} className="px-5 py-2.5 bg-slate-900 text-white font-bold rounded-xl cursor-pointer hover:bg-slate-800">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK */}
      {rejectModalId !== null && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-sm font-black uppercase text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Alasan Penolakan Absensi
            </h3>
            <textarea rows={3} placeholder="Masukkan catatan atau alasan perbaikan..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-3 text-xs uppercase focus:outline-none" />
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setRejectModalId(null)} className="px-4 py-2 bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer">Batal</button>
              <button onClick={handleSaveRejection} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow cursor-pointer">Kirim Penolakan</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {editingRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in fade-in">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Edit Absensi — Super Admin Access</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Pegawai</label>
                <input type="text" value={editingRecord.nama_pegawai} onChange={(e) => setEditingRecord({ ...editingRecord, nama_pegawai: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jabatan / Unit</label>
                  <input type="text" value={editingRecord.jabatan} onChange={(e) => setEditingRecord({ ...editingRecord, jabatan: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift</label>
                  <select value={editingRecord.shift} onChange={(e) => setEditingRecord({ ...editingRecord, shift: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold">
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Kehadiran</label>
                  <select value={editingRecord.status_kehadiran} onChange={(e) => setEditingRecord({ ...editingRecord, status_kehadiran: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold">
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                    <option value="Cuti">Cuti</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Keterangan</label>
                  <input type="text" value={editingRecord.keterangan} onChange={(e) => setEditingRecord({ ...editingRecord, keterangan: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer">Batal</button>
              <button onClick={handleSaveEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1">
                <Save className="w-4 h-4" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}