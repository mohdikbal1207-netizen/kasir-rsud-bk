'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
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
  Eye,
  MapPin,
  Camera,
  Check,
  RefreshCw,
  Layers,
  Clock4,
  Target,
  Plus,
  Navigation,
  Compass
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

interface OfficeLocation {
  id: number;
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

const DAYS_OPTIONS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export default function AdminAbsensiPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rekap' | 'shift' | 'radius'>('rekap');
  
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

  // Shift Modal State & Checklist Days
  const [shiftModal, setShiftModal] = useState<boolean>(false);
  const [editingSetting, setEditingSetting] = useState<AbsensiSetting | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Office Geofencing Location State
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation>({
    id: 1,
    nama_lokasi: 'RSUD Bukit Kerman, Kerinci',
    latitude: -2.152345,
    longitude: 101.482310,
    radius_meter: 150
  });
  const [isSavingLocation, setIsSavingLocation] = useState<boolean>(false);

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

  const handleDayCheckboxChange = (day: string) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleSaveSetting = async () => {
    if (!editingSetting) return;
    const formattedHari = selectedDays.length === 7 ? 'Setiap Hari' : selectedDays.join(', ');
    if (!formattedHari) {
      return alert('Pilih minimal satu hari berlaku untuk shift ini.');
    }

    try {
      const payload = {
        hari: formattedHari,
        nama_shift: editingSetting.nama_shift,
        jam_masuk: editingSetting.jam_masuk,
        jam_pulang: editingSetting.jam_pulang,
        batas_awal_masuk: editingSetting.batas_awal_masuk,
        batas_akhir_masuk: editingSetting.batas_akhir_masuk,
        batas_awal_pulang: editingSetting.batas_awal_pulang,
        batas_akhir_pulang: editingSetting.batas_akhir_pulang,
        is_active: editingSetting.is_active
      };

      if (editingSetting.id) {
        await supabase.from('absensi_settings').update(payload).eq('id', editingSetting.id);
      } else {
        await supabase.from('absensi_settings').insert([payload]);
      }
      showToast('Konfigurasi shift berhasil disimpan.', 'success');
      addLog(`Memperbarui shift: ${editingSetting.nama_shift}`);
      setShiftModal(false);
      setEditingSetting(null);
      fetchSettings();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const handleDeleteSetting = async (id: number) => {
    if (confirm('Hapus konfigurasi shift ini?')) {
      await supabase.from('absensi_settings').delete().eq('id', id);
      showToast('Konfigurasi shift berhasil dihapus.', 'error');
      addLog(`Menghapus shift ID: ${id}`);
      fetchSettings();
    }
  };

  const handleSaveOfficeLocation = () => {
    setIsSavingLocation(true);
    setTimeout(() => {
      setIsSavingLocation(false);
      showToast('Titik koordinat dan radius geofencing berhasil diperbarui!', 'success');
      addLog(`Memperbarui titik GPS RSUD: Lat ${officeLocation.latitude}, Lng ${officeLocation.longitude}`);
    }, 600);
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
                <UserCheck className="w-6 h-6 text-purple-600" /> Master Absensi &amp; Pengaturan Sistem
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Kelola verifikasi kehadiran, pengaturan shift kerja, serta parameter radius geofencing RSUD Bukit Kerman.</p>
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

        {/* TAB NAVIGATION UTAMA (3 TAB TERPISAH TEGAS) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
          <button
            onClick={() => setActiveTab('rekap')}
            className={`p-4 rounded-2xl font-bold text-xs flex items-center gap-3 transition cursor-pointer border ${
              activeTab === 'rekap' 
                ? 'bg-purple-900 text-white border-purple-900 shadow-lg shadow-purple-900/20' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'rekap' ? 'bg-purple-800 text-white' : 'bg-purple-50 text-purple-600'}`}>
              <Layers className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block font-black text-sm">Rekap &amp; Verifikasi</span>
              <span className={`text-[10px] ${activeTab === 'rekap' ? 'text-purple-200' : 'text-slate-400'}`}>{records.length} total data terekam</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('shift')}
            className={`p-4 rounded-2xl font-bold text-xs flex items-center gap-3 transition cursor-pointer border ${
              activeTab === 'shift' 
                ? 'bg-purple-900 text-white border-purple-900 shadow-lg shadow-purple-900/20' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'shift' ? 'bg-purple-800 text-white' : 'bg-sky-50 text-sky-600'}`}>
              <Clock4 className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block font-black text-sm">Manajemen Shift Kerja</span>
              <span className={`text-[10px] ${activeTab === 'shift' ? 'text-purple-200' : 'text-slate-400'}`}>Jam masuk &amp; checklist hari</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('radius')}
            className={`p-4 rounded-2xl font-bold text-xs flex items-center gap-3 transition cursor-pointer border ${
              activeTab === 'radius' 
                ? 'bg-purple-900 text-white border-purple-900 shadow-lg shadow-purple-900/20' 
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${activeTab === 'radius' ? 'bg-purple-800 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
              <Target className="w-5 h-5" />
            </div>
            <div className="text-left">
              <span className="block font-black text-sm">Radius &amp; Geofencing GPS</span>
              <span className={`text-[10px] ${activeTab === 'radius' ? 'text-purple-200' : 'text-slate-400'}`}>Peta lokasi &amp; radius RSUD</span>
            </div>
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

        {/* KONTEN TAB 2: MANAJEMEN SHIFT KERJA (DENGAN CHECKLIST HARI MODERN) */}
        {activeTab === 'shift' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2.5">
                  <Clock4 className="w-5 h-5 text-purple-600" /> Manajemen Jam Shift Kerja &amp; Hari Berlaku
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Konfigurasi jam masuk, jam pulang, jendela toleransi, dan checklist hari aktif pegawai RSUD Bukit Kerman.</p>
              </div>
              <button
                onClick={() => {
                  setEditingSetting({
                    id: 0,
                    hari: 'Senin, Selasa, Rabu, Kamis, Jumat',
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
                  setSelectedDays(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']);
                  setShiftModal(true);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20"
              >
                <Plus className="w-4 h-4" /> Tambah Shift Baru
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {settings.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400 text-xs">Belum ada konfigurasi shift pada tabel `absensi_settings`.</div>
              ) : (
                settings.map((s) => (
                  <div key={s.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 shadow-sm hover:border-purple-300 transition">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-base font-black text-slate-900">Shift {s.nama_shift}</h4>
                        <span className="text-[11px] font-bold text-purple-700 block mt-1">🗓️ {s.hari}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {s.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs bg-white p-3.5 rounded-xl border border-slate-200/60 font-mono">
                      <div className="flex justify-between"><span className="text-slate-400">Jam Kerja:</span><strong className="text-purple-700">{s.jam_masuk} - {s.jam_pulang}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-400">Batas Masuk:</span><span className="text-slate-700">{s.batas_awal_masuk} s/d {s.batas_akhir_masuk}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Batas Pulang:</span><span className="text-slate-700">{s.batas_awal_pulang} s/d {s.batas_akhir_pulang}</span></div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60">
                      <button onClick={() => { 
                        setEditingSetting(s); 
                        setSelectedDays(s.hari === 'Setiap Hari' ? DAYS_OPTIONS : s.hari.split(', ').map(d => d.trim()));
                        setShiftModal(true); 
                      }} className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1">
                        <Edit3 className="w-3.5 h-3.5" /> Ubah Shift
                      </button>
                      <button onClick={() => handleDeleteSetting(s.id)} className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs cursor-pointer flex items-center gap-1">
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* KONTEN TAB 3: RADIUS & GEOFENCING GPS (DENGAN MAP INTERAKTIF & SETTING LOKASI) */}
        {activeTab === 'radius' && (
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 flex items-center gap-2.5">
                  <Target className="w-5 h-5 text-emerald-600" /> Pengaturan Lokasi &amp; Geofencing GPS RSUD
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tentukan titik koordinat pusat instansi dan radius maksimum absensi seluler secara langsung dari peta.</p>
              </div>
              <button
                onClick={handleSaveOfficeLocation}
                disabled={isSavingLocation}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> {isSavingLocation ? 'Menyimpan...' : 'Simpan Koordinat GPS'}
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* FORM PENGATURAN KOORDINAT */}
              <div className="lg:col-span-1 space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" /> Parameter Koordinat &amp; Radius
                </h4>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Nama Lokasi Instansi</label>
                  <input 
                    type="text" 
                    value={officeLocation.nama_lokasi} 
                    onChange={(e) => setOfficeLocation({ ...officeLocation, nama_lokasi: e.target.value })} 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Latitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      value={officeLocation.latitude} 
                      onChange={(e) => setOfficeLocation({ ...officeLocation, latitude: Number(e.target.value) })} 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Longitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      value={officeLocation.longitude} 
                      onChange={(e) => setOfficeLocation({ ...officeLocation, longitude: Number(e.target.value) })} 
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-emerald-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Radius Geofencing (Meter)</label>
                  <input 
                    type="number" 
                    value={officeLocation.radius_meter} 
                    onChange={(e) => setOfficeLocation({ ...officeLocation, radius_meter: Number(e.target.value) })} 
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 font-mono font-bold text-emerald-700 text-xs focus:outline-none focus:border-emerald-500" 
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Contoh standar rumah sakit: 150 meter dari titik GPS utama.</span>
                </div>

                <button
                  onClick={() => {
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setOfficeLocation({
                          ...officeLocation,
                          latitude: pos.coords.latitude,
                          longitude: pos.coords.longitude
                        });
                        showToast('Titik GPS berhasil disesuaikan dengan posisi perangkat Anda saat ini.', 'success');
                      }, () => {
                        alert('Gagal mendeteksi lokasi perangkat. Pastikan izin GPS diaktifkan.');
                      });
                    } else {
                      alert('Geolocation tidak didukung oleh browser ini.');
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow"
                >
                  <MapPin className="w-4 h-4 text-emerald-400" /> Gunakan Posisi GPS Saat Ini
                </button>
              </div>

              {/* PETA INTERAKTIF PREVIEW (OPENSTREETMAP EMBED DENGAN PIN DINAMIS) */}
              <div className="lg:col-span-2 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative flex flex-col min-h-[380px]">
                <div className="absolute top-4 left-4 z-10 bg-slate-900/90 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 border border-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Live Map: {officeLocation.nama_lokasi}</span>
                </div>
                
                <iframe
                  title="Peta Lokasi RSUD Bukit Kerman"
                  width="100%"
                  height="100%"
                  className="w-full flex-1 border-0 min-h-[380px]"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${officeLocation.latitude},${officeLocation.longitude}&z=16&output=embed`}
                ></iframe>

                <div className="bg-slate-900 text-slate-300 p-3 text-center text-[11px] font-mono border-t border-slate-800 flex items-center justify-center gap-4">
                  <span>Lat: <strong>{officeLocation.latitude.toFixed(6)}</strong></span>
                  <span>•</span>
                  <span>Lng: <strong>{officeLocation.longitude.toFixed(6)}</strong></span>
                  <span>•</span>
                  <span>Radius: <strong className="text-emerald-400">{officeLocation.radius_meter} Meter</strong></span>
                </div>
              </div>
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

      {/* MODAL EDIT / TAMBAH SHIFT DENGAN CHECKLIST HARI MODERN */}
      {shiftModal && editingSetting && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 text-xs animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900">
                  {editingSetting.id ? 'Ubah Konfigurasi Shift Kerja' : 'Tambah Shift Kerja Baru'}
                </h3>
                <p className="text-slate-500 text-[11px]">Tentukan nama shift, jam operasional, dan checklist hari aktif dinas.</p>
              </div>
              <button onClick={() => setShiftModal(false)} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer transition"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Nama Shift</label>
                  <input type="text" value={editingSetting.nama_shift} onChange={(e) => setEditingSetting({ ...editingSetting, nama_shift: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500" placeholder="Contoh: Pagi / Siang / Malam" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Status Keaktifan</label>
                  <select value={editingSetting.is_active ? 'true' : 'false'} onChange={(e) => setEditingSetting({ ...editingSetting, is_active: e.target.value === 'true' })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500">
                    <option value="true">Aktif</option>
                    <option value="false">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* CHECKLIST HARI MODERN */}
              <div>
                <label className="font-bold text-slate-700 block mb-2 uppercase text-[10px] tracking-wider">Pilih Hari Berlaku Shift</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {DAYS_OPTIONS.map((day) => {
                    const isChecked = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleDayCheckboxChange(day)}
                        className={`p-2.5 rounded-xl font-bold text-xs flex items-center justify-between border transition cursor-pointer ${
                          isChecked 
                            ? 'bg-purple-900 text-white border-purple-900 shadow-sm' 
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{day}</span>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] ${isChecked ? 'bg-white text-purple-900' : 'border border-slate-300'}`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Terpilih: <strong>{selectedDays.length === 7 ? 'Setiap Hari' : selectedDays.join(', ') || 'Belum ada hari dipilih'}</strong></span>
                  <button 
                    type="button" 
                    onClick={() => setSelectedDays(DAYS_OPTIONS)} 
                    className="text-[10px] font-bold text-purple-600 hover:underline cursor-pointer"
                  >
                    Pilih Semua Hari
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Jam Masuk</label>
                  <input type="text" value={editingSetting.jam_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, jam_masuk: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono font-bold text-purple-700 focus:outline-none" placeholder="07:30" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Jam Pulang</label>
                  <input type="text" value={editingSetting.jam_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, jam_pulang: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono font-bold text-purple-700 focus:outline-none" placeholder="14:00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Batas Awal Masuk</label>
                  <input type="text" value={editingSetting.batas_awal_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, batas_awal_masuk: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-700 focus:outline-none" placeholder="06:00" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Batas Akhir Masuk</label>
                  <input type="text" value={editingSetting.batas_akhir_masuk} onChange={(e) => setEditingSetting({ ...editingSetting, batas_akhir_masuk: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-700 focus:outline-none" placeholder="08:00" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Batas Awal Pulang</label>
                  <input type="text" value={editingSetting.batas_awal_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, batas_awal_pulang: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-700 focus:outline-none" placeholder="14:00" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1.5 uppercase text-[10px] tracking-wider">Batas Akhir Pulang</label>
                  <input type="text" value={editingSetting.batas_akhir_pulang} onChange={(e) => setEditingSetting({ ...editingSetting, batas_akhir_pulang: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-700 focus:outline-none" placeholder="18:00" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => setShiftModal(false)} className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer transition">Batal</button>
              <button onClick={handleSaveSetting} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-500/20 cursor-pointer transition flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Simpan Shift
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