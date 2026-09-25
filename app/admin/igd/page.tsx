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
  Clock,
  Radio,
  BarChart3,
  Volume2,
  VolumeX,
  TrendingUp,
  UserCheck,
  Plus,
  Download,
  FileText,
  FileEdit,
  StickyNote,
  XCircle
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
  nama_tindakan?: string;
  tindakan_igd?: {
    nama_tindakan?: string;
  };
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
  status_bayar: 'pending' | 'lunas' | 'dibatalkan' | 'ditolak';
  status_verifikasi?: string;
  metode_bayar?: string;
  tanggal_transaksi?: string;
  triase?: 'Merah' | 'Kuning' | 'Hijau';
  penjaminan?: 'Umum' | 'BPJS';
  catatan_admin?: string;
  detail_pemeriksaan_igd?: DetailItem[];
}

export default function AdminIGDPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'ditolak' | 'all'>('pending');
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

  // Custom Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Print Mode State ('none' | 'selected' | 'rekap' | 'single' | 'all')
  const [printMode, setPrintMode] = useState<'none' | 'selected' | 'rekap' | 'single' | 'all'>('none');
  const [singlePrintRecord, setSinglePrintRecord] = useState<TransactionItem | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'approve' | 'reject' | 'delete' | 'batch_approve';
    targetTx?: TransactionItem;
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'approve'
  });

  // Admin Note Dialog State
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [noteModalTx, setNoteModalTx] = useState<TransactionItem | null>(null);

  // States for selection, detail, receipt, analytics, new entry, & export modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TransactionItem | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState<boolean>(false);

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
    metode_bayar: 'Tunai / Cash',
    catatan_admin: ''
  });

  // Date range state for custom export modal
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');

  const showToast = (type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ type, title, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const playEmergencyBeep = useCallback(() => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
  }, [audioEnabled]);

  // Helper Mapper untuk konsistensi struktur data
  const mapHeaderToTransaction = (h: any): TransactionItem => {
    const verifikasiRaw = String(h.status_verifikasi || '').toLowerCase();
    const isVerifiedApproved = verifikasiRaw === 'disetujui' || verifikasiRaw === 'lunas' || verifikasiRaw === 'sudah diverifikasi';
    const isRejected = verifikasiRaw === 'ditolak' || verifikasiRaw === 'dibatalkan' || verifikasiRaw === 'direvisi';

    let computedStatusBayar: 'pending' | 'lunas' | 'dibatalkan' | 'ditolak' = 'pending';
    if (isVerifiedApproved) {
      computedStatusBayar = 'lunas';
    } else if (isRejected) {
      computedStatusBayar = verifikasiRaw === 'ditolak' ? 'ditolak' : 'dibatalkan';
    }

    return {
      id: `IGD-${h.id}`,
      db_id: h.id,
      no_rm: h.no_rm || '',
      nama_pasien: h.nama_pasien || '',
      ttl: h.ttl || '',
      alamat: h.alamat || '',
      dokter_pemeriksa: h.dokter_pemeriksa || 'Dokter Jaga IGD',
      total_biaya: Number(h.total_biaya || 0),
      status_bayar: computedStatusBayar,
      status_verifikasi: h.status_verifikasi || 'Menunggu Verifikasi',
      metode_bayar: h.metode_bayar || 'Tunai / Cash',
      tanggal_transaksi: h.tanggal_pemeriksaan || h.created_at || '',
      triase: h.triase || 'Hijau',
      penjaminan: h.penjaminan || 'Umum',
      catatan_admin: h.catatan_admin || '',
      detail_pemeriksaan_igd: h.detail_pemeriksaan_igd || []
    };
  };

  // Optimasi Kueri Supabase (Seleksi Kolom Spesifik & Limit)
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pemeriksaan_igd_header')
        .select(`
          id,
          no_rm,
          nama_pasien,
          ttl,
          alamat,
          dokter_pemeriksa,
          total_biaya,
          status_bayar,
          status_verifikasi,
          metode_bayar,
          tanggal_pemeriksaan,
          created_at,
          triase,
          penjaminan,
          catatan_admin,
          detail_pemeriksaan_igd (
            id,
            pemeriksaan_id,
            tindakan_id,
            jumlah_qty,
            tarif_satuan,
            subtotal,
            nama_tindakan,
            tindakan_igd ( nama_tindakan )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw new Error(error.message);

      if (data) {
        const mapped: TransactionItem[] = data.map(mapHeaderToTransaction);
        setTransactions(mapped);
      } else {
        setTransactions([]);
      }
    } catch (err: unknown) {
      console.error(err);
      if (err instanceof Error) {
        showToast('error', 'Gagal Memuat Data', err.message);
      } else {
        showToast('error', 'Gagal Memuat Data', 'Gagal memuat data kasir IGD dari database.');
      }
      setTransactions([]);
    }
    setIsLoading(false);
  }, []);

  // Real-time Supabase Subscription (Dioptimalkan tanpa refetching penuh)
  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('pemeriksaan_igd_header_realtime_optimized')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pemeriksaan_igd_header' },
        (payload) => {
          setIsRealtimeActive(true);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newItem = mapHeaderToTransaction(payload.new);
            if (newItem.triase === 'Merah') {
              playEmergencyBeep();
            }
            setTransactions((prev) => [newItem, ...prev.slice(0, 199)]);
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedItem = mapHeaderToTransaction(payload.new);
            setTransactions((prev) =>
              prev.map((item) => (item.db_id === updatedItem.db_id ? { ...item, ...updatedItem } : item))
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deletedDbId = (payload.old as any).id;
            setTransactions((prev) => prev.filter((item) => item.db_id !== deletedDbId));
          }
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
  }, [fetchData, playEmergencyBeep]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const executeAction = async () => {
    if (!confirmModal.actionType) return;
    setIsSubmitting(true);
    try {
      if (confirmModal.actionType === 'approve' && confirmModal.targetTx) {
        const tx = confirmModal.targetTx;
        const { error } = await supabase
          .from('pemeriksaan_igd_header')
          .update({ 
            status_verifikasi: 'Disetujui', 
            status_bayar: 'Lunas',
            catatan_admin: adminNoteInput || tx.catatan_admin || 'Telah diverifikasi lunas oleh admin.'
          })
          .eq('id', tx.db_id);

        if (error) throw new Error(error.message);
        showToast('success', 'Verifikasi Berhasil', `Transaksi IGD ${tx.id} (${tx.nama_pasien}) telah LUNAS.`);
      } else if (confirmModal.actionType === 'reject' && confirmModal.targetTx) {
        const tx = confirmModal.targetTx;
        const { error } = await supabase
          .from('pemeriksaan_igd_header')
          .update({ 
            status_verifikasi: 'Ditolak', 
            status_bayar: 'Dibatalkan',
            catatan_admin: adminNoteInput || 'Transaksi ditolak / membutuhkan revisi berkas.'
          })
          .eq('id', tx.db_id);

        if (error) throw new Error(error.message);
        showToast('info', 'Transaksi Ditolak', `Transaksi ${tx.id} berhasil ditolak.`);
      } else if (confirmModal.actionType === 'delete' && confirmModal.targetTx) {
        const tx = confirmModal.targetTx;
        const { error } = await supabase
          .from('pemeriksaan_igd_header')
          .delete()
          .eq('id', tx.db_id);

        if (error) throw new Error(error.message);
        showToast('success', 'Data Dihapus', `Data kasir ${tx.id} telah dihapus permanen.`);
        setSelectedIds(selectedIds.filter(id => id !== tx.id));
      } else if (confirmModal.actionType === 'batch_approve') {
        const dbIdsToApprove = transactions
          .filter(t => selectedIds.includes(t.id))
          .map(t => t.db_id);

        if (dbIdsToApprove.length > 0) {
          const { error } = await supabase
            .from('pemeriksaan_igd_header')
            .update({ 
              status_verifikasi: 'Disetujui', 
              status_bayar: 'Lunas',
              catatan_admin: adminNoteInput || 'Verifikasi massal oleh admin.'
            })
            .in('id', dbIdsToApprove);

          if (error) throw new Error(error.message);
        }
        showToast('success', 'Verifikasi Massal', `Berhasil memverifikasi ${selectedIds.length} transaksi.`);
        setSelectedIds([]);
      }
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) showToast('error', 'Gagal Memproses', err.message);
    } finally {
      setIsSubmitting(false);
      setConfirmModal({ ...confirmModal, isOpen: false });
      setAdminNoteInput('');
    }
  };

  const handleApprove = (tx: TransactionItem) => {
    setAdminNoteInput(tx.catatan_admin || '');
    setConfirmModal({
      isOpen: true,
      title: 'Verifikasi Pembayaran Lunas',
      description: `Apakah Anda yakin ingin memverifikasi transaksi ${tx.id} (${tx.nama_pasien}) sebagai LUNAS?`,
      actionType: 'approve',
      targetTx: tx
    });
  };

  const handleReject = (tx: TransactionItem) => {
    setAdminNoteInput(tx.catatan_admin || '');
    setConfirmModal({
      isOpen: true,
      title: 'Tolak Transaksi IGD',
      description: `Apakah Anda yakin ingin menolak / membatalkan transaksi ${tx.id} (${tx.nama_pasien})?`,
      actionType: 'reject',
      targetTx: tx
    });
  };

  const handleDelete = (tx: TransactionItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Hapus Permanent Data',
      description: `PERINGATAN: Menghapus data ${tx.id} (${tx.nama_pasien}) dari database. Tindakan ini tidak dapat dibatalkan!`,
      actionType: 'delete',
      targetTx: tx
    });
  };

  const handleBatchApprove = () => {
    if (selectedIds.length === 0) return;
    setAdminNoteInput('');
    setConfirmModal({
      isOpen: true,
      title: 'Verifikasi Massal Lunas',
      description: `Setujui ${selectedIds.length} transaksi kasir terpilih menjadi LUNAS secara bersamaan?`,
      actionType: 'batch_approve'
    });
  };

  const handleSaveNoteOnly = async () => {
    if (!noteModalTx) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pemeriksaan_igd_header')
        .update({ catatan_admin: adminNoteInput })
        .eq('id', noteModalTx.db_id);

      if (error) throw new Error(error.message);
      showToast('success', 'Catatan Disimpan', `Catatan admin untuk ${noteModalTx.id} berhasil diperbarui.`);
      setNoteModalTx(null);
      setAdminNoteInput('');
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) showToast('error', 'Gagal Simpan Catatan', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.nama_pasien || !newTx.total_biaya) {
      showToast('error', 'Form Tidak Lengkap', 'Nama Pasien dan Total Biaya wajib diisi.');
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
        status_bayar: 'Belum Bayar',
        status_verifikasi: 'Menunggu Verifikasi',
        catatan_admin: newTx.catatan_admin || ''
      };

      const { error } = await supabase.from('pemeriksaan_igd_header').insert([payload]);

      if (error) throw new Error(error.message);
      showToast('success', 'Transaksi Dibuat', `Transaksi IGD baru untuk ${newTx.nama_pasien} berhasil ditambahkan.`);
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
        metode_bayar: 'Tunai / Cash',
        catatan_admin: ''
      });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) showToast('error', 'Gagal Membuat Transaksi', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    let result = transactions.filter(t => {
      let matchTab = false;
      if (activeTab === 'all') {
        matchTab = true;
      } else if (activeTab === 'ditolak') {
        matchTab = t.status_bayar === 'ditolak' || t.status_bayar === 'dibatalkan' || String(t.status_verifikasi).toLowerCase() === 'ditolak';
      } else {
        matchTab = t.status_bayar === activeTab;
      }

      const matchSearch = 
        t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());

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
    showToast('info', 'Tersalin', `No. RM ${noRm} berhasil disalin ke clipboard.`);
  };

  const handleSendWhatsApp = (tx: TransactionItem) => {
    const text = `Halo RSUD Bukit Kerman, informasi kasir IGD untuk pasien *${tx.nama_pasien}* (No. RM: ${tx.no_rm}) dengan ID Transaksi *${tx.id}* senilai *${formatRupiah(tx.total_biaya)}* status saat ini: *${tx.status_verifikasi?.toUpperCase() || tx.status_bayar.toUpperCase()}*. Catatan Admin: ${tx.catatan_admin || '-'}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleFilterToday = () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    setFilterTanggal(todayStr);
    setCurrentPage(1);
    showToast('info', 'Filter Tanggal', `Menampilkan transaksi IGD khusus hari ini (${todayStr}).`);
  };

  const handleFilterMonth = () => {
    const monthStr = new Date().toISOString().slice(0, 7);
    setFilterTanggal(monthStr);
    setCurrentPage(1);
    showToast('info', 'Filter Bulan', `Menampilkan transaksi IGD bulan ini (${monthStr}).`);
  };

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
    const ditolakList = allTransactions.filter(t => t.status_bayar === 'ditolak' || t.status_bayar === 'dibatalkan' || String(t.status_verifikasi).toLowerCase() === 'ditolak');

    const totalPending = pendingList.length;
    const totalPendingMerah = pendingList.filter(t => t.triase === 'Merah').length;
    const totalPendingNominal = pendingList.reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    
    const totalLunas = lunasList.length;
    const totalDitolak = ditolakList.length;
    const totalPendapatan = lunasList.reduce((sum, t) => sum + (t.total_biaya || 0), 0);
    const totalAll = allTransactions.length;

    return { totalPending, totalPendingMerah, totalPendingNominal, totalLunas, totalDitolak, totalPendapatan, totalAll };
  }, [transactions]);

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
      showToast('error', 'Data Kosong', 'Tidak ada data dalam rentang tanggal yang dipilih.');
      return;
    }

    if (exportFormat === 'csv') {
      const headers = ['ID Transaksi', 'No RM', 'Nama Pasien', 'Triase', 'Penjaminan', 'Total Biaya (IDR)', 'Status Pembayaran', 'Status Verifikasi', 'Catatan Admin', 'Tanggal Transaksi'];
      const rows = dataToExport.map(t => [
        t.id,
        t.no_rm || '',
        `"${t.nama_pasien || ''}"`,
        t.triase || 'Hijau',
        t.penjaminan || 'Umum',
        t.total_biaya,
        t.status_bayar,
        t.status_verifikasi || '',
        `"${t.catatan_admin || ''}"`,
        t.tanggal_transaksi || ''
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan_kasir_igd_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      const jsonContent = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan_kasir_igd_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setShowExportModal(false);
    showToast('success', 'Ekspor Berhasil', `Berhasil mengunduh ${dataToExport.length} data laporan.`);
  };

  const handleExportCSV = () => {
    setShowExportModal(true);
  };

  // Dedicated Print Trigger Functions
  const triggerPrint = (mode: 'selected' | 'rekap' | 'single' | 'all', record?: TransactionItem) => {
    if (mode === 'selected' && selectedIds.length === 0) {
      showToast('error', 'Tidak Ada Data', 'Pilih minimal satu transaksi terlebih dahulu menggunakan kotak centang.');
      return;
    }
    if (mode === 'single' && record) {
      setSinglePrintRecord(record);
    }
    setPrintMode(mode);
    setShowAnalyticsModal(false);
    setTimeout(() => {
      window.print();
      setPrintMode('none');
    }, 250);
  };

  const selectedTransactions = useMemo(() => {
    return transactions.filter(t => selectedIds.includes(t.id));
  }, [transactions, selectedIds]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative overflow-hidden print:min-h-0 print:block print:bg-white print:justify-start">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-amber-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <div className="print:hidden">
        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Verifikasi Admin — IGD (Gawat Darurat)"
          badgeText="Admin Pusat"
          showBackButton={true}
        />
      </div>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24 print:p-0 print:max-w-none print:m-0">
        
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
              onClick={() => triggerPrint('all')}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-3.5 py-2.5 rounded-2xl transition shadow-sm flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-600" /> Cetak Rekap Semua
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
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Kasir / Menunggu Verifikasi</p>
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
                Lunas / Terverifikasi ({stats.totalLunas})
              </button>
              <button
                onClick={() => { setActiveTab('ditolak'); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'ditolak' ? 'bg-rose-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ditolak ({stats.totalDitolak})
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
                  onClick={() => triggerPrint('selected')}
                  className="bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Terpilih ({selectedIds.length})
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
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

        {/* SELECT ALL BAR FOR PENDING */}
        {activeTab === 'pending' && filtered.length > 0 && (
          <div className="flex items-center px-4 py-2 bg-slate-100/80 rounded-2xl text-xs font-bold text-slate-700 print:hidden">
            <button onClick={toggleSelectAll} className="flex items-center gap-2 cursor-pointer hover:text-slate-900">
              {selectedIds.length === filtered.length ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4 text-slate-400" />}
              <span>Pilih Semua di Hasil Saring ({filtered.length} Pasien Kasir)</span>
            </button>
          </div>
        )}

        {/* DIV UTAMA DAFTAR TRANSAKSI DIBERI print:hidden */}
        <div className="print:hidden">
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
                const isDitolak = tx.status_bayar === 'ditolak' || tx.status_bayar === 'dibatalkan' || String(tx.status_verifikasi).toLowerCase() === 'ditolak';

                return (
                  <div key={tx.id} className={`bg-white border rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-4 transition ${
                    isSelected ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200/90'
                  }`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleSelectOne(tx.id)} className="cursor-pointer text-slate-400 hover:text-amber-600">
                            {isSelected ? <CheckSquare className="w-4 h-4 text-amber-600" /> : <Square className="w-4 h-4" />}
                          </button>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                            isDitolak ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {tx.status_bayar === 'lunas' ? 'Sudah Diverifikasi' : 
                             isDitolak ? (tx.status_verifikasi || 'Ditolak') : 'Menunggu Verifikasi'}
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

                      {/* BLOK CATATAN ADMIN */}
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-2.5 text-xs flex justify-between items-start gap-2">
                        <div className="space-y-0.5 flex-1">
                          <p className="text-[10px] font-bold text-amber-800 flex items-center gap-1 uppercase tracking-wide">
                            <StickyNote className="w-3 h-3 text-amber-600" /> Catatan Admin:
                          </p>
                          <p className="text-[11px] text-slate-700 italic">
                            {tx.catatan_admin || <span className="text-slate-400 font-normal">Belum ada catatan khusus.</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setNoteModalTx(tx);
                            setAdminNoteInput(tx.catatan_admin || '');
                          }}
                          className="p-1 hover:bg-amber-100 text-amber-700 rounded-lg transition cursor-pointer"
                          title="Edit Catatan Admin"
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                        </button>
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
                        onClick={() => triggerPrint('single', tx)}
                        className="p-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-2xl transition cursor-pointer"
                        title="Cetak Kuitansi Resmi"
                      >
                        <Printer className="w-4 h-4" />
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
                            <span>Diverifikasi</span>
                          </button>
                          <button
                            onClick={() => handleReject(tx)}
                            disabled={isSubmitting}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-2 rounded-2xl transition flex items-center justify-center cursor-pointer border border-rose-200"
                            title="Tolak / Batalkan Transaksi"
                          >
                            <Ban className="w-4 h-4 text-rose-500" />
                          </button>
                        </>
                      ) : isDitolak ? (
                        <div className="flex-1 text-center py-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1">
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>Transaksi Ditolak</span>
                        </div>
                      ) : (
                        <div className="flex-1 text-center py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Diverifikasi Lunas</span>
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
                      <th className="p-4">Catatan Admin</th>
                      <th className="p-4 text-right">Total Tagihan</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {paginatedData.map((tx, idx) => {
                      const absoluteIndex = itemsPerPage === 0 ? idx + 1 : (currentPage - 1) * itemsPerPage + idx + 1;
                      const isDitolak = tx.status_bayar === 'ditolak' || tx.status_bayar === 'dibatalkan' || String(tx.status_verifikasi).toLowerCase() === 'ditolak';

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
                          <td className="p-4">
                            <div className="flex items-center gap-1 max-w-[150px]">
                              <span className="text-[11px] text-slate-600 truncate">{tx.catatan_admin || '-'}</span>
                              <button
                                onClick={() => {
                                  setNoteModalTx(tx);
                                  setAdminNoteInput(tx.catatan_admin || '');
                                }}
                                className="text-amber-600 hover:text-amber-700 p-0.5 cursor-pointer flex-shrink-0"
                                title="Edit Catatan"
                              >
                                <FileEdit className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono font-black text-slate-900">{formatRupiah(tx.total_biaya)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                              isDitolak ? 'bg-rose-50 text-rose-700 border border-rose-200 font-black' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {tx.status_bayar === 'lunas' ? 'Lunas' : 
                               isDitolak ? (tx.status_verifikasi || 'Ditolak') : 'Menunggu Verifikasi'}
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
                                onClick={() => triggerPrint('single', tx)}
                                className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl transition cursor-pointer"
                                title="Cetak Kuitansi"
                              >
                                <Printer className="w-3.5 h-3.5" />
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
        </div>

        {/* PAGINATION CONTROLS (DIBERI print:hidden) */}
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

      {/* ======================================================== */}
      {/* KOP SURAT & FORMAT CETAK RESMI RSUD BUKIT KERMAN (PRINT ONLY) */}
      {/* ======================================================== */}
      {printMode !== 'none' && (
        <div className="hidden print:block bg-white text-black p-6 font-sans w-full text-xs leading-normal print:p-0 print:m-0">
          {/* KOP SURAT RESMI DENGAN LOGO GANDA */}
          <div className="flex items-center justify-between border-b-4 border-double border-black pb-4 mb-6">
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <img src="/logo-pemkab.png" alt="Logo Pemkab" className="w-14 h-14 object-contain" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
            </div>
            <div className="text-center flex-1 px-2">
              <h2 className="text-xs font-bold tracking-wider uppercase m-0">PEMERINTAH KABUPATEN KERINCI</h2>
              <h1 className="text-base font-black tracking-wide uppercase m-0 py-0.5">RUMAH SAKIT UMUM DAERAH BUKIT KERMAN</h1>
              <p className="text-[9px] text-black m-0">Jl. Raya Lintas Kerinci, Bukit Kerman, Kabupaten Kerinci, Jambi • Email: rsudbukitkerman@kerincikab.go.id</p>
            </div>
            <div className="w-16 h-16 flex-shrink-0 flex items-center justify-center">
              <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-14 h-14 object-contain" onError={(e)=>{(e.target as HTMLElement).style.display='none'}} />
            </div>
          </div>

          {/* 1. CETAK LAPORAN DATA TERPILIH */}
          {printMode === 'selected' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase">LAPORAN KASIR INSTALASI GAWAT DARURAT (IGD) — TERPILIH</h3>
                <p className="text-[11px] text-black">Tanggal Cetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
              </div>

              <table className="w-full text-left text-[11px] border-collapse border border-black mt-4">
                <thead>
                  <tr className="bg-slate-100 text-black uppercase font-bold text-[10px] border-b border-black">
                    <th className="p-2 border border-black text-center w-8">No</th>
                    <th className="p-2 border border-black">ID / No. RM</th>
                    <th className="p-2 border border-black">Nama Pasien</th>
                    <th className="p-2 border border-black">Triase / Jaminan</th>
                    <th className="p-2 border border-black">Dokter & Metode</th>
                    <th className="p-2 border border-black text-right">Total Biaya</th>
                    <th className="p-2 border border-black text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {selectedTransactions.map((t, index) => (
                    <tr key={t.id}>
                      <td className="p-2 border border-black text-center">{index + 1}</td>
                      <td className="p-2 border border-black font-mono">
                        <strong className="block">{t.id}</strong>
                        <span className="text-[10px]">{t.no_rm}</span>
                      </td>
                      <td className="p-2 border border-black font-bold">{t.nama_pasien}</td>
                      <td className="p-2 border border-black">{t.triase} / {t.penjaminan}</td>
                      <td className="p-2 border border-black">{t.dokter_pemeriksa} <br/><span className="text-[10px]">{t.metode_bayar}</span></td>
                      <td className="p-2 border border-black text-right font-mono font-bold">{formatRupiah(t.total_biaya)}</td>
                      <td className="p-2 border border-black text-center uppercase font-bold text-[10px]">{t.status_bayar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2 font-bold text-xs border-t border-black mt-3">
                <span>Total Akumulasi Tagihan Terpilih ({selectedTransactions.length} Pasien):</span>
                <span className="font-mono text-sm">{formatRupiah(selectedTransactions.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0))}</span>
              </div>
            </div>
          )}

          {/* 2. CETAK REKAPITULASI PENDAPATAN & KUNJUNGAN */}
          {printMode === 'rekap' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase">REKAPITULASI PENDAPATAN & LAYANAN KASIR IGD</h3>
                <p className="text-[11px] text-black">Periode Saringan Aktif • Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 my-4">
                <div className="border border-black p-3 rounded">
                  <p className="text-[10px] font-bold uppercase">Pasien Penjaminan BPJS</p>
                  <p className="text-sm font-black">{analyticsData.bpjsCount} Pasien</p>
                  <p className="text-xs font-mono font-bold mt-1">Total: {formatRupiah(analyticsData.bpjsTotal)}</p>
                </div>
                <div className="border border-black p-3 rounded">
                  <p className="text-[10px] font-bold uppercase">Pasien Umum / Tunai</p>
                  <p className="text-sm font-black">{analyticsData.umumCount} Pasien</p>
                  <p className="text-xs font-mono font-bold mt-1">Total: {formatRupiah(analyticsData.umumTotal)}</p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase pt-2">Breakdown Dokter Pemeriksa IGD:</h4>
              <table className="w-full text-left text-xs border-collapse border border-black">
                <thead>
                  <tr className="bg-slate-100 uppercase font-bold text-[10px] border-b border-black">
                    <th className="p-2 border border-black">Nama Dokter Pemeriksa</th>
                    <th className="p-2 border border-black text-center">Jumlah Pasien</th>
                    <th className="p-2 border border-black text-right">Total Pendapatan / Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {analyticsData.doctorBreakdown.map((doc, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border border-black font-bold">{doc.name}</td>
                      <td className="p-2 border border-black text-center">{doc.count} Pasien</td>
                      <td className="p-2 border border-black text-right font-mono font-bold">{formatRupiah(doc.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. CETAK KESELURUHAN DATA / REKAP SEMUA (CETAK REKAP SEMUA) */}
          {printMode === 'all' && (
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <h3 className="text-sm font-black uppercase">LAPORAN REKAPITULASI KESELURUHAN KASIR IGD</h3>
                <p className="text-[11px] text-black">Total Data Tersaring / Sistem: {filtered.length} Pasien • Dicetak pada: {new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}</p>
              </div>

              <table className="w-full text-left text-[10px] border-collapse border border-black mt-4">
                <thead>
                  <tr className="bg-slate-100 text-black uppercase font-bold border-b border-black">
                    <th className="p-2 border border-black text-center w-8">No</th>
                    <th className="p-2 border border-black">ID / RM</th>
                    <th className="p-2 border border-black">Nama Pasien</th>
                    <th className="p-2 border border-black">Triase / Jaminan</th>
                    <th className="p-2 border border-black">Dokter</th>
                    <th className="p-2 border border-black text-right">Tagihan</th>
                    <th className="p-2 border border-black text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black">
                  {filtered.map((t, index) => (
                    <tr key={t.id}>
                      <td className="p-2 border border-black text-center">{index + 1}</td>
                      <td className="p-2 border border-black font-mono">
                        <strong className="block">{t.id}</strong>
                        <span className="text-[9px]">{t.no_rm}</span>
                      </td>
                      <td className="p-2 border border-black font-bold">{t.nama_pasien}</td>
                      <td className="p-2 border border-black">{t.triase} / {t.penjaminan}</td>
                      <td className="p-2 border border-black">{t.dokter_pemeriksa}</td>
                      <td className="p-2 border border-black text-right font-mono font-bold">{formatRupiah(t.total_biaya)}</td>
                      <td className="p-2 border border-black text-center uppercase font-bold text-[9px]">{t.status_bayar}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2 font-bold text-xs border-t border-black mt-3">
                <span>Total Akumulasi Seluruh Tagihan ({filtered.length} Pasien):</span>
                <span className="font-mono text-sm">{formatRupiah(filtered.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0))}</span>
              </div>
            </div>
          )}

          {/* 4. CETAK KUITANSI TUNGGAL */}
          {printMode === 'single' && singlePrintRecord && (
            <div className="space-y-4 max-w-lg mx-auto border-2 border-black p-6 rounded-xl">
              <div className="text-center pb-3 border-b-2 border-black">
                <h3 className="text-base font-black uppercase">KUITANSI PEMBAYARAN RESMI IGD</h3>
                <p className="text-xs font-mono">ID Transaksi: {singlePrintRecord.id}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>Nama Pasien:</span>
                  <strong className="text-sm">{singlePrintRecord.nama_pasien}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>No. Rekam Medis (RM):</span>
                  <strong className="font-mono">{singlePrintRecord.no_rm || '-'}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>Triase & Penjaminan:</span>
                  <strong>{singlePrintRecord.triase} / {singlePrintRecord.penjaminan}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>Dokter Pemeriksa:</span>
                  <strong>{singlePrintRecord.dokter_pemeriksa}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>Metode Pembayaran:</span>
                  <strong>{singlePrintRecord.metode_bayar}</strong>
                </div>
                <div className="flex justify-between border-b border-dashed border-black pb-1">
                  <span>Catatan Admin:</span>
                  <em className="text-black">{singlePrintRecord.catatan_admin || '-'}</em>
                </div>
              </div>

              <div className="bg-slate-100 p-3 rounded flex justify-between items-center font-black text-sm border border-black">
                <span>Total Biaya Tagihan:</span>
                <span className="font-mono text-base">{formatRupiah(singlePrintRecord.total_biaya)}</span>
              </div>

              <div className="text-center pt-2">
                <p className="text-[10px] font-bold uppercase tracking-widest border border-black py-1 inline-block px-4 rounded">
                  STATUS: {singlePrintRecord.status_bayar === 'lunas' ? 'LUNAS (TERVERIFIKASI)' : singlePrintRecord.status_verifikasi}
                </p>
              </div>
            </div>
          )}

          {/* TANDA TANGAN PENGESAHAN */}
          <div className="mt-16 flex justify-between text-xs pt-4 page-break-inside-avoid">
            <div className="text-center">
              <p>Mengetahui,</p>
              <p className="font-bold">Direktur RSUD Bukit Kerman</p>
              <div className="h-16"></div>
              <p className="font-bold underline">( _________________________ )</p>
            </div>
            <div className="text-center">
              <p>Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-bold">Admin Kasir / Verifikator IGD</p>
              <div className="h-16"></div>
              <p className="font-bold underline">( _________________________ )</p>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM TOAST NOTIFICATION MODERN */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] max-w-sm w-full animate-bounce print:hidden">
          <div className={`p-4 rounded-2xl border shadow-2xl backdrop-blur-xl flex items-start gap-3 ${
            toast.type === 'success' ? 'bg-emerald-900/90 border-emerald-500 text-white' :
            toast.type === 'error' ? 'bg-rose-900/90 border-rose-500 text-white' : 'bg-slate-900/90 border-slate-600 text-white'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />}
            {toast.type === 'info' && <StickyNote className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />}
            <div className="flex-1">
              <h5 className="text-xs font-black uppercase tracking-wide">{toast.title}</h5>
              <p className="text-xs text-slate-200 mt-0.5">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODERN CONFIRMATION & ACTION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${
                confirmModal.actionType === 'delete' ? 'bg-rose-100 text-rose-600' :
                confirmModal.actionType === 'reject' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {confirmModal.actionType === 'delete' ? <Trash2 className="w-6 h-6" /> :
                 confirmModal.actionType === 'reject' ? <Ban className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">{confirmModal.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{confirmModal.description}</p>
              </div>
            </div>

            {(confirmModal.actionType === 'approve' || confirmModal.actionType === 'reject' || confirmModal.actionType === 'batch_approve') && (
              <div>
                <label className="font-bold text-slate-700 text-xs block mb-1">Catatan Admin / Keterangan Status</label>
                <textarea
                  rows={2}
                  placeholder="Masukkan catatan tambahan admin di sini (Opsional)..."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={executeAction}
                className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow cursor-pointer disabled:opacity-50 ${
                  confirmModal.actionType === 'delete' ? 'bg-rose-600 hover:bg-rose-700' :
                  confirmModal.actionType === 'reject' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isSubmitting ? 'Memproses...' : 'Ya, Lanjutkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT CATATAN ADMIN */}
      {noteModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:hidden">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-black uppercase text-slate-900">Catatan Admin — {noteModalTx.id}</h3>
              </div>
              <button onClick={() => setNoteModalTx(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-slate-600">Pasien: <strong className="text-slate-800">{noteModalTx.nama_pasien}</strong></p>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Isi Catatan Admin</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan catatan internal admin/verifikator di sini..."
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNoteModalTx(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveNoteOnly}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow cursor-pointer disabled:opacity-50"
              >
                Simpan Catatan
              </button>
            </div>
          </div>
        </div>
      )}

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

              <div>
                <label className="font-bold text-slate-700 block mb-1">Catatan Admin (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan..."
                  value={newTx.catatan_admin}
                  onChange={(e) => setNewTx({ ...newTx, catatan_admin: e.target.value })}
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

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => { setShowAnalyticsModal(false); triggerPrint('rekap'); }}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Cetak Ringkasan Statistik
              </button>
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
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col justify-between">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Rincian Kasir & Verifikasi IGD</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID: {selectedDetailRecord.id}</p>
              </div>
              <button onClick={() => setSelectedDetailRecord(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              <div className={`p-4 rounded-2xl flex items-center justify-between border ${
                selectedDetailRecord.status_bayar === 'lunas' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                (selectedDetailRecord.status_bayar === 'ditolak' || selectedDetailRecord.status_bayar === 'dibatalkan' || String(selectedDetailRecord.status_verifikasi).toLowerCase() === 'ditolak') ? 'bg-rose-50 border-rose-200 text-rose-900' :
                'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Status Verifikasi oleh Admin Rumah Sakit</p>
                  <p className="text-sm font-black uppercase mt-0.5 flex items-center gap-1.5">
                    {(selectedDetailRecord.status_bayar === 'ditolak' || selectedDetailRecord.status_bayar === 'dibatalkan' || String(selectedDetailRecord.status_verifikasi).toLowerCase() === 'ditolak') && (
                      <XCircle className="w-4 h-4 text-rose-600 inline" />
                    )}
                    {selectedDetailRecord.status_verifikasi || selectedDetailRecord.status_bayar}
                  </p>
                </div>
                <span className="text-xs font-bold px-3 py-1 bg-white/80 rounded-full shadow-sm">
                  {selectedDetailRecord.status_bayar === 'lunas' ? 'Tervalidasi' :
                   (selectedDetailRecord.status_bayar === 'ditolak' || selectedDetailRecord.status_bayar === 'dibatalkan' || String(selectedDetailRecord.status_verifikasi).toLowerCase() === 'ditolak') ? 'Ditolak / Dibatalkan' : 'Dalam Pengecekan'}
                </span>

              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <p><span className="font-bold text-slate-500">Nama Pasien:</span> <strong className="text-slate-800">{selectedDetailRecord.nama_pasien || '-'}</strong></p>
                  <p className="flex items-center gap-2">
                    <span className="font-bold text-slate-500">No RM:</span> <strong className="text-slate-800">{selectedDetailRecord.no_rm || '-'}</strong>
                    <button onClick={() => handleCopyRm(selectedDetailRecord.no_rm)} className="text-amber-600 hover:underline font-bold flex items-center gap-1 cursor-pointer">
                      <Copy className="w-3 h-3" /> Salin
                    </button>
                  </p>
                  <p><span className="font-bold text-slate-500">Triase & Penjaminan:</span> Triase <strong className="text-amber-700">{selectedDetailRecord.triase || 'Hijau'}</strong> ({selectedDetailRecord.penjaminan || 'Umum'})</p>
                  <p><span className="font-bold text-slate-500">Dokter Pemeriksa:</span> <strong className="text-slate-800">{selectedDetailRecord.dokter_pemeriksa || 'Dokter Jaga IGD'}</strong></p>
                  <p><span className="font-bold text-slate-500">Metode Bayar:</span> <strong className="text-slate-800">{selectedDetailRecord.metode_bayar || 'Tunai'}</strong></p>
                  <p><span className="font-bold text-slate-500">Status Verifikasi:</span> <strong className="text-amber-700">{selectedDetailRecord.status_verifikasi}</strong></p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p><span className="font-bold text-slate-500">Catatan Admin:</span> <strong className="text-amber-800 italic">{selectedDetailRecord.catatan_admin || 'Tidak ada catatan.'}</strong></p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
                  Daftar Rincian Tindakan Medis ({selectedDetailRecord.detail_pemeriksaan_igd?.length || 0} Item)
                </h4>

                {(!selectedDetailRecord.detail_pemeriksaan_igd || selectedDetailRecord.detail_pemeriksaan_igd.length === 0) ? (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-400 border border-dashed border-slate-200">
                    Tidak ada rincian item tindakan medis yang terlampir.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] border-b border-slate-200">
                          <th className="p-2.5 text-center w-8">#</th>
                          <th className="p-2.5">Tindakan / Layanan</th>
                          <th className="p-2.5 text-center">Qty</th>
                          <th className="p-2.5 text-right">Tarif Satuan</th>
                          <th className="p-2.5 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {selectedDetailRecord.detail_pemeriksaan_igd.map((item: any, index: number) => {
                          const namaTindakan = item.tindakan_igd?.nama_tindakan || item.nama_tindakan || `Tindakan Medis #${item.tindakan_id || item.id}`;
                          return (
                            <tr key={item.id || index} className="hover:bg-slate-50/80">
                              <td className="p-2.5 text-center text-slate-400 font-bold">{index + 1}</td>
                              <td className="p-2.5 font-bold text-slate-800">{namaTindakan}</td>
                              <td className="p-2.5 text-center font-mono font-bold">{item.jumlah_qty || 1}</td>
                              <td className="p-2.5 text-right font-mono">{formatRupiah(item.tarif_satuan || 0)}</td>
                              <td className="p-2.5 text-right font-mono font-black text-slate-900">{formatRupiah(item.subtotal || ((item.jumlah_qty || 1) * (item.tarif_satuan || 0)))}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex justify-between items-center text-xs font-black">
                <span className="text-slate-700">Total Biaya Kasir IGD:</span>
                <span className="font-mono text-base text-emerald-700">{formatRupiah(selectedDetailRecord.total_biaya)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 flex-shrink-0">
              <button
                onClick={() => {
                  const rec = selectedDetailRecord;
                  setSelectedDetailRecord(null);
                  triggerPrint('single', rec);
                }}
                className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" /> Cetak Kuitansi Resmi
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
                      const rec = selectedDetailRecord;
                      setSelectedDetailRecord(null);
                      handleApprove(rec);
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