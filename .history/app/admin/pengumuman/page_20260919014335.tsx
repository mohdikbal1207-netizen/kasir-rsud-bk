'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  Megaphone,
  ArrowLeft,
  X,
  Save,
  CheckCircle2,
  Info,
  Flame,
  Search,
  Copy,
  Clock,
  Filter,
  TrendingUp,
  Layers,
  Eye,
  Sparkles,
  CopyPlus,
  CalendarDays,
  Share2,
  AlertOctagon,
  RefreshCw,
  UserCheck,
  ArrowUpDown,
  Pin,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface Pengumuman {
  id: number;
  nomor_pengumuman: string;
  judul: string;
  isi: string;
  kategori: 'MENDESAK' | 'INFORMASI' | 'SISTEM' | 'DOKTER';
  prioritas: 'TINGGI' | 'NORMAL' | 'RENDAH';
  target_role: 'SEMUA' | 'KASIR' | 'ADMIN' | 'DOKTER' | 'FARMASI';
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPengumumanPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Penambahan State Modal Konfirmasi Hapus Modern
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);
  const [deleteModalTitle, setDeleteModalTitle] = useState<string>('');

  // Penambahan State Pin Pengumuman Utama
  const [pinnedId, setPinnedId] = useState<number | null>(null);

  // Penambahan State Live Preview Modal Tab
  const [activeModalTab, setActiveModalTab] = useState<'form' | 'preview'>('form');

  // State Filter, Sort, & Search Lengkap
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterTargetRole, setFilterTargetRole] = useState<string>('SEMUA');
  const [filterTimeState, setFilterTimeState] = useState<'SEMUA' | 'TAYANG' | 'MENDATANG' | 'EXPIRED'>('SEMUA');
  const [sortBy, setSortBy] = useState<'TERBARU' | 'TERLAMA' | 'PRIORITAS' | 'ABJAD'>('TERBARU');

  // Form State Lengkap Sesuai Struktur Tabel SQL Supabase
  const [judul, setJudul] = useState<string>('');
  const [isi, setIsi] = useState<string>('');
  const [kategori, setKategori] = useState<'MENDESAK' | 'INFORMASI' | 'SISTEM' | 'DOKTER'>('INFORMASI');
  const [prioritas, setPrioritas] = useState<'TINGGI' | 'NORMAL' | 'RENDAH'>('NORMAL');
  const [targetRole, setTargetRole] = useState<'SEMUA' | 'KASIR' | 'ADMIN' | 'DOKTER' | 'FARMASI'>('SEMUA');
  const [tanggalMulai, setTanggalMulai] = useState<string>(new Date().toISOString().slice(0, 16));
  const [tanggalSelesai, setTanggalSelesai] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('Admin Pusat');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Efek Suara Ringan untuk Notifikasi Sukses
  const playNotificationSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    if (type === 'success') playNotificationSound();
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pengumuman')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase Error:', error.message);
        showToast(`Gagal memuat: ${error.message}`, 'error');
      } else if (data) {
        setAnnouncements(data as Pengumuman[]);
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('admin_pengumuman_changes_full')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setJudul('');
    setIsi('');
    setKategori('INFORMASI');
    setPrioritas('NORMAL');
    setTargetRole('SEMUA');
    setTanggalMulai(new Date().toISOString().slice(0, 16));
    setTanggalSelesai('');
    setCreatedBy('Admin Pusat');
    setIsActive(true);
    setActiveModalTab('form');
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Pengumuman) => {
    setEditingId(p.id);
    setJudul(p.judul);
    setIsi(p.isi);
    setKategori(p.kategori);
    setPrioritas(p.prioritas || 'NORMAL');
    setTargetRole(p.target_role || 'SEMUA');
    setTanggalMulai(p.tanggal_mulai ? new Date(p.tanggal_mulai).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setTanggalSelesai(p.tanggal_selesai ? new Date(p.tanggal_selesai).toISOString().slice(0, 16) : '');
    setCreatedBy(p.created_by || 'Admin Pusat');
    setIsActive(p.is_active);
    setActiveModalTab('form');
    setShowModal(true);
  };

  // Fitur Duplikat Pengumuman
  const handleDuplicate = (p: Pengumuman) => {
    setEditingId(null);
    setJudul(`${p.judul} (SALINAN)`);
    setIsi(p.isi);
    setKategori(p.kategori);
    setPrioritas(p.prioritas || 'NORMAL');
    setTargetRole(p.target_role || 'SEMUA');
    setTanggalMulai(new Date().toISOString().slice(0, 16));
    setTanggalSelesai('');
    setCreatedBy('Admin Pusat');
    setIsActive(true);
    setActiveModalTab('form');
    setShowModal(true);
    showToast('Berhasil menduplikasi draf pengumuman!', 'success');
  };

  // Template Cepat / Quick Preset
  const applyPreset = (type: 'maintenance' | 'tarif' | 'shift') => {
    if (type === 'maintenance') {
      setJudul('PEMELIHARAAN SISTEM & BRIDGING BPJS');
      setIsi('Diberitahukan kepada seluruh staf & kasir, akan dilakukan sinkronisasi sistem dan perbaikan jaringan bridging BPJS. Dimohon menyelesaikan transaksi sebelum jadwal.');
      setKategori('MENDESAK');
      setPrioritas('TINGGI');
      setTargetRole('SEMUA');
    } else if (type === 'tarif') {
      setJudul('PENYESUAIAN TARIF TINDAKAN LOKAL TERBARU');
      setIsi('Sesuai dengan Peraturan Daerah (Perda) RSUD Bukit Kerman, berlaku penyesuaian tarif rincian tindakan medis untuk rawat jalan & IGD.');
      setKategori('INFORMASI');
      setPrioritas('NORMAL');
      setTargetRole('KASIR');
    } else if (type === 'shift') {
      setJudul('REKAPITULASI SETORAN KASIR AKHIR SHIFT');
      setIsi('Ingat untuk melakukan sertijab kasir dan penginputan modal awal pada modul absensi sebelum penutupan loket.');
      setKategori('SISTEM');
      setPrioritas('NORMAL');
      setTargetRole('KASIR');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !isi) return alert('Judul dan isi pengumuman wajib diisi!');

    if (tanggalSelesai && new Date(tanggalSelesai) < new Date(tanggalMulai)) {
      return showToast('Tanggal selesai tidak boleh lebih awal dari tanggal mulai!', 'error');
    }

    try {
      const payload = {
        judul,
        isi,
        kategori,
        prioritas,
        target_role: targetRole,
        tanggal_mulai: tanggalMulai ? new Date(tanggalMulai).toISOString() : new Date().toISOString(),
        tanggal_selesai: tanggalSelesai ? new Date(tanggalSelesai).toISOString() : null,
        created_by: createdBy || 'Admin Pusat',
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('pengumuman')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showToast('Pengumuman berhasil diperbarui!', 'success');
      } else {
        const nextNum = `ANN-${String(announcements.length + 1).padStart(3, '0')}`;
        const { error } = await supabase.from('pengumuman').insert([
          {
            nomor_pengumuman: nextNum,
            ...payload
          }
        ]);

        if (error) throw error;
        showToast('Pengumuman baru berhasil diterbitkan!', 'success');
      }

      setShowModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err?.message || JSON.stringify(err)}`, 'error');
    }
  };

  // Konfirmasi & Eksekusi Hapus Modern
  const confirmDeleteModal = (id: number, title: string) => {
    setDeleteModalId(id);
    setDeleteModalTitle(title);
  };

  const executeDelete = async () => {
    if (!deleteModalId) return;
    try {
      const { error } = await supabase.from('pengumuman').delete().eq('id', deleteModalId);
      if (error) throw error;
      showToast('Pengumuman berhasil dihapus.', 'success');
      if (pinnedId === deleteModalId) setPinnedId(null);
      setDeleteModalId(null);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(`Gagal menghapus: ${err?.message}`, 'error');
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await supabase.from('pengumuman').update({ is_active: !currentStatus }).eq('id', id);
      showToast(`Status pengumuman diperbarui.`, 'success');
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Teks pengumuman disalin ke clipboard!', 'success');
  };

  // Ekspor Rekap Seluruh Pengumuman Aktif ke WA / Clipboard
  const handleExportBroadcastSummary = () => {
    const activeList = announcements.filter(a => a.is_active);
    if (activeList.length === 0) return showToast('Tidak ada pengumuman aktif untuk diekspor!', 'error');

    let summaryText = `📢 *REKAP PENGUMUMAN RSUD BUKIT KERMAN*\n`;
    summaryText += `Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
    summaryText += `-------------------------------------------\n\n`;

    activeList.forEach((item, index) => {
      summaryText += `${index + 1}. *[${item.kategori}] ${item.judul}*\n`;
      summaryText += `${item.isi}\n`;
      summaryText += `Target: ${item.target_role} | Oleh: ${item.created_by}\n\n`;
    });

    navigator.clipboard.writeText(summaryText);
    showToast('Ringkasan seluruh pengumuman berhasil disalin!', 'success');
  };

  // Pembersihan Massal Pengumuman Kedaluwarsa
  const handleBulkDeactivateExpired = async () => {
    const nowTime = new Date();
    const expiredIds = announcements
      .filter(a => a.is_active && a.tanggal_selesai && new Date(a.tanggal_selesai) < nowTime)
      .map(a => a.id);

    if (expiredIds.length === 0) {
      return showToast('Tidak ditemukan pengumuman kedaluwarsa yang masih aktif.', 'error');
    }

    if (confirm(`Nonaktifkan ${expiredIds.length} pengumuman kedaluwarsa secara otomatis?`)) {
      try {
        const { error } = await supabase
          .from('pengumuman')
          .update({ is_active: false })
          .in('id', expiredIds);

        if (error) throw error;
        showToast(`${expiredIds.length} Pengumuman kedaluwarsa berhasil dinonaktifkan!`, 'success');
        fetchAnnouncements();
      } catch (err: any) {
        showToast(`Gagal memproses: ${err?.message}`, 'error');
      }
    }
  };

  // Fitur Pin Toggle
  const togglePin = (id: number) => {
    if (pinnedId === id) {
      setPinnedId(null);
      showToast('Sematkan pengumuman dilepas.', 'success');
    } else {
      setPinnedId(id);
      showToast('Pengumuman disematkan di paling atas!', 'success');
    }
  };

  // Filter Data & Penyortiran Cerdas
  const now = new Date();

  const filteredAnnouncements = announcements.filter((p) => {
    const matchSearch = p.judul.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        p.isi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.nomor_pengumuman.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.created_by.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterCategory === 'SEMUA' ? true : p.kategori === filterCategory;
    const matchStat = filterStatus === 'SEMUA' ? true : filterStatus === 'AKTIF' ? p.is_active : !p.is_active;
    const matchTarget = filterTargetRole === 'SEMUA' ? true : p.target_role === filterTargetRole;

    // Filter Status Waktu
    const isExpired = !!p.tanggal_selesai && new Date(p.tanggal_selesai) < now;
    const isUpcoming = new Date(p.tanggal_mulai) > now;
    const isCurrentlyActive = p.is_active && !isExpired && !isUpcoming;

    let matchTime = true;
    if (filterTimeState === 'TAYANG') matchTime = isCurrentlyActive;
    if (filterTimeState === 'MENDATANG') matchTime = isUpcoming;
    if (filterTimeState === 'EXPIRED') matchTime = isExpired;

    return matchSearch && matchCat && matchStat && matchTarget && matchTime;
  }).sort((a, b) => {
    // Prioritas utama untuk item yang di-pin
    if (a.id === pinnedId) return -1;
    if (b.id === pinnedId) return 1;

    if (sortBy === 'TERLAMA') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    } else if (sortBy === 'PRIORITAS') {
      const pWeight = { TINGGI: 3, NORMAL: 2, RENDAH: 1 };
      return (pWeight[b.prioritas] || 0) - (pWeight[a.prioritas] || 0);
    } else if (sortBy === 'ABJAD') {
      return a.judul.localeCompare(b.judul);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const activeCount = announcements.filter(a => a.is_active).length;
  const highPriorityCount = announcements.filter(a => a.prioritas === 'TINGGI' && a.is_active).length;
  const upcomingCount = announcements.filter(a => a.is_active && new Date(a.tanggal_mulai) > now).length;
  const expiredCount = announcements.filter(a => a.tanggal_selesai && new Date(a.tanggal_selesai) < now).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <AdminHeader title="RSUD BUKIT KERMAN" subtitle="Manajemen Pengumuman & Broadcast Alert RSUD" badgeText="Admin Pusat" />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* HEADER BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer border border-slate-200 shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-purple-600" /> Modul Kelola Pengumuman System
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Terbitkan pengumuman lengkap sesuai skema database Supabase terbaru.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleExportBroadcastSummary}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer border border-slate-200"
              title="Salin Rekapan Pengumuman untuk WhatsApp"
            >
              <Share2 className="w-4 h-4 text-purple-600" /> Salin Rekap
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" /> Buat Pengumuman Baru
            </button>
          </div>
        </div>

        {/* RINGKASAN STATISTIK DOKUMEN ENHANCED */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total / Aktif</span>
              <h3 className="text-lg sm:text-xl font-black text-slate-900">{announcements.length} / <span className="text-emerald-600">{activeCount}</span></h3>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioritas Tinggi</span>
              <h3 className="text-lg sm:text-xl font-black text-amber-600">{highPriorityCount} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mendatang</span>
              <h3 className="text-lg sm:text-xl font-black text-sky-600">{upcomingCount} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between relative group">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kedaluwarsa</span>
              <h3 className="text-lg sm:text-xl font-black text-rose-600">{expiredCount} Berkas</h3>
            </div>
            {expiredCount > 0 ? (
              <button
                onClick={handleBulkDeactivateExpired}
                className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center font-bold transition cursor-pointer"
                title="Klik untuk nonaktifkan semua pengumuman kedaluwarsa"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            )}
          </div>
        </div>

        {/* TAB FILTER WAKTU NIKMATI PERUBAHAN INSTAN */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setFilterTimeState('SEMUA')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterTimeState === 'SEMUA' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Semua Berkas ({announcements.length})
          </button>
          <button
            onClick={() => setFilterTimeState('TAYANG')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterTimeState === 'TAYANG' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ● Sedang Tayang
          </button>
          <button
            onClick={() => setFilterTimeState('MENDATANG')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterTimeState === 'MENDATANG' ? 'bg-sky-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            📅 Mendatang ({upcomingCount})
          </button>
          <button
            onClick={() => setFilterTimeState('EXPIRED')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
              filterTimeState === 'EXPIRED' ? 'bg-rose-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            ⏰ Kedaluwarsa ({expiredCount})
          </button>
        </div>

        {/* SEARCH & FILTER BAR ENHANCED WITH SORT */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari kata kunci, nomor, pembuat, atau isi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-transparent text-slate-700 font-bold text-xs py-1 focus:outline-none cursor-pointer"
              >
                <option value="TERBARU">Urutan: Terbaru</option>
                <option value="TERLAMA">Urutan: Terlama</option>
                <option value="PRIORITAS">Urutan: Prioritas</option>
                <option value="ABJAD">Urutan: Abjad A-Z</option>
              </select>
            </div>

            <select
              value={filterTargetRole}
              onChange={(e) => setFilterTargetRole(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-2xl focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Target Role</option>
              <option value="KASIR">KASIR</option>
              <option value="ADMIN">ADMIN</option>
              <option value="DOKTER">DOKTER</option>
              <option value="FARMASI">FARMASI</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-2xl focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Kategori</option>
              <option value="MENDESAK">MENDESAK</option>
              <option value="INFORMASI">INFORMASI</option>
              <option value="SISTEM">SISTEM</option>
              <option value="DOKTER">DOKTER</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs px-3 py-2.5 rounded-2xl focus:outline-none cursor-pointer"
            >
              <option value="SEMUA">Semua Status</option>
              <option value="AKTIF">Status Aktif</option>
              <option value="NONAKTIF">Status Nonaktif</option>
            </select>
          </div>
        </div>

        {/* LIST PENGUMUMAN */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Memuat daftar pengumuman...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p>Tidak ada pengumuman yang sesuai dengan kriteria pencarian.</p>
            </div>
          ) : (
            filteredAnnouncements.map((p) => {
              const isExpired = p.tanggal_selesai && new Date(p.tanggal_selesai) < now;
              const isUpcoming = new Date(p.tanggal_mulai) > now;
              const isPinned = p.id === pinnedId;

              return (
                <div
                  key={p.id}
                  className={`bg-white border rounded-3xl p-6 shadow-sm transition flex flex-col sm:flex-row items-start justify-between gap-4 relative overflow-hidden ${
                    isPinned ? 'ring-2 ring-purple-600 border-purple-400 bg-purple-50/20' : !p.is_active ? 'opacity-50 border-slate-200 bg-slate-50/50' : p.prioritas === 'TINGGI' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isPinned ? 'bg-purple-600 text-white' : p.prioritas === 'TINGGI' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {isPinned ? <Pin className="w-6 h-6 fill-white" /> : p.prioritas === 'TINGGI' ? <Flame className="w-6 h-6 animate-pulse" /> : <Info className="w-6 h-6" />}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isPinned && (
                          <span className="bg-purple-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1">
                            <Pin className="w-3 h-3 fill-white" /> Disematkan
                          </span>
                        )}

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.kategori === 'MENDESAK' ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                        }`}>
                          {p.kategori}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          p.prioritas === 'TINGGI' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          Prioritas: {p.prioritas}
                        </span>

                        <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                          Target: {p.target_role}
                        </span>

                        {isUpcoming && (
                          <span className="bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" /> Mendatang
                          </span>
                        )}

                        {isExpired && (
                          <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Kedaluwarsa
                          </span>
                        )}

                        <button
                          onClick={() => toggleStatus(p.id, p.is_active)}
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer ${
                            p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.is_active ? '● Aktif' : 'Nonaktif'}
                        </button>
                      </div>

                      <h3 className="text-base font-black text-slate-900 tracking-tight">{p.judul}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{p.isi}</p>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1 flex-wrap">
                        <span>No: {p.nomor_pengumuman}</span>
                        <span>•</span>
                        <span>Oleh: {p.created_by}</span>
                        <span>•</span>
                        <span>Tayang: {new Date(p.tanggal_mulai).toLocaleDateString('id-ID')} {p.tanggal_selesai ? `s/d ${new Date(p.tanggal_selesai).toLocaleDateString('id-ID')}` : '(Tanpa Batas)'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-start">
                    <button
                      onClick={() => togglePin(p.id)}
                      className={`p-2.5 rounded-xl transition cursor-pointer ${
                        isPinned ? 'bg-purple-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                      title={isPinned ? 'Lepas Sematan' : 'Sematkan Pengumuman'}
                    >
                      <Pin className={`w-4 h-4 ${isPinned ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(p)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="Duplikat Pengumuman Ini"
                    >
                      <CopyPlus className="w-4 h-4 text-purple-600" />
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${p.judul}\n${p.isi}`)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="Salin Teks Pengumuman"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                      title="Ubah Pengumuman"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => confirmDeleteModal(p.id, p.judul)}
                      className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                      title="Hapus Pengumuman"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* MODAL KONFIRMASI HAPUS MODERN */}
      {deleteModalId && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">Konfirmasi Hapus Pengumuman</h3>
              <p className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan. Pengumuman berikut akan dihapus secara permanen:</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
              <span className="text-xs font-bold text-slate-800 line-clamp-2 uppercase">{deleteModalTitle}</span>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteModalId(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-md shadow-rose-600/20 cursor-pointer"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INPUT LENGKAP + FITUR PRATINJAU REALTIME */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in max-h-[92vh] overflow-y-auto">
            
            {/* MODAL HEADER & TAB NAVIGASI PRATINJAU */}
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-purple-600" /> {editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
                </h3>
                <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('form')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition ${
                      activeModalTab === 'form' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Form Input
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('preview')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-lg transition flex items-center gap-1 ${
                      activeModalTab === 'preview' ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Pratinjau
                  </button>
                </div>
              </div>

              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* TEMPLATE PESAN CEPAT (PRESET BUTTONS) */}
            {activeModalTab === 'form' && (
              <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-3 space-y-2">
                <span className="text-[10px] font-bold text-purple-800 uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Template Cepat (Klik untuk Isi Otomatis)
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyPreset('maintenance')}
                    className="bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer"
                  >
                    + Maintenance System & BPJS
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('tarif')}
                    className="bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer"
                  >
                    + Update Tarif Perda
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset('shift')}
                    className="bg-white border border-purple-200 hover:bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-xl transition cursor-pointer"
                  >
                    + Remind Kasir Shift
                  </button>
                </div>
              </div>
            )}

            {/* FORM INPUT TAB */}
            {activeModalTab === 'form' ? (
              <form onSubmit={handleSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Kategori Pengumuman</label>
                    <select
                      value={kategori}
                      onChange={(e: any) => setKategori(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                    >
                      <option value="INFORMASI">INFORMASI</option>
                      <option value="MENDESAK">MENDESAK</option>
                      <option value="SISTEM">SISTEM</option>
                      <option value="DOKTER">DOKTER</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Prioritas Tampil</label>
                    <select
                      value={prioritas}
                      onChange={(e: any) => setPrioritas(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-amber-700 focus:outline-none focus:border-purple-500"
                    >
                      <option value="TINGGI">TINGGI (Tampil Atas)</option>
                      <option value="NORMAL">NORMAL (Biasa)</option>
                      <option value="RENDAH">RENDAH (Bawah)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Target Role Penerima</label>
                    <select
                      value={targetRole}
                      onChange={(e: any) => setTargetRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                    >
                      <option value="SEMUA">SEMUA ROLE</option>
                      <option value="KASIR">KASIR SAJA</option>
                      <option value="ADMIN">ADMIN SAJA</option>
                      <option value="DOKTER">DOKTER SAJA</option>
                      <option value="FARMASI">FARMASI SAJA</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Judul Pengumuman *</label>
                    <span className="text-[10px] text-slate-400 font-mono">{judul.length}/100 Karakter</span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    placeholder="Contoh: PEMELIHARAAN SISTEM & BRIDGING BPJS"
                    value={judul}
                    onChange={(e) => setJudul(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500 uppercase"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold text-slate-700">Isi Pesan Pengumuman *</label>
                    <span className="text-[10px] text-slate-400 font-mono">{isi.length} Karakter</span>
                  </div>
                  <textarea
                    rows={4}
                    placeholder="Tuliskan isi pesan rinci yang akan ditayangkan..."
                    value={isi}
                    onChange={(e) => setIsi(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai Tayang</label>
                    <input
                      type="datetime-local"
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Tanggal Selesai Tayang (Opsional)</label>
                    <input
                      type="datetime-local"
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-800 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Diterbitkan Oleh (Pembuat)</label>
                  <input
                    type="text"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <label htmlFor="isActiveCheck" className="font-bold text-slate-700 cursor-pointer">
                    Terbitkan Langsung ke Dashboard (Status Aktif)
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 cursor-pointer flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Simpan &amp; Terbitkan
                  </button>
                </div>
              </form>
            ) : (
              /* TAB PRATINJAU LANGSUNG (LIVE PREVIEW) */
              <div className="space-y-4 py-2">
                <p className="text-xs text-slate-500">Pratinjau tampilan banner pengumuman saat tayang di layar Dashboard Kasir:</p>
                
                <div className={`p-5 rounded-3xl border shadow-lg flex items-start justify-between gap-4 transition relative overflow-hidden ${
                  kategori === 'MENDESAK' || prioritas === 'TINGGI'
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white border-amber-400'
                    : 'bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white border-purple-800'
                }`}>
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-2xl shrink-0 ${
                      kategori === 'MENDESAK' || prioritas === 'TINGGI'
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}>
                      {kategori === 'MENDESAK' || prioritas === 'TINGGI' ? (
                        <Flame className="w-6 h-6 animate-pulse" />
                      ) : (
                        <Megaphone className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-white/20 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {kategori}
                        </span>
                        {prioritas === 'TINGGI' && (
                          <span className="bg-rose-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            PRIORITAS TINGGI
                          </span>
                        )}
                        <span className="text-[11px] opacity-80 font-mono">
                          ANN-XXX • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      <h4 className="text-base font-black tracking-wide uppercase">{judul || 'JUDUL PENGUMUMAN DRAF'}</h4>
                      <p className="text-xs opacity-90 leading-relaxed whitespace-pre-line">{isi || 'Isi teks pengumuman yang diketik akan otomatis muncul di sini...'}</p>
                      
                      <div className="text-[10px] opacity-75 font-mono pt-1">
                        Diterbitkan oleh: <strong>{createdBy || 'Admin Pusat'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setActiveModalTab('form')}
                    className="px-6 py-3 bg-purple-600 text-white font-bold text-xs rounded-2xl shadow-md cursor-pointer"
                  >
                    Kembali ke Form Editor
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}