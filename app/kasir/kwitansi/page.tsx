'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Printer, 
  Plus, 
  X, 
  Lock, 
  AlertCircle,
  TrendingUp,
  Clock,
  FileText,
  Copy,
  AlertTriangle,
  Command,
  Download,
  Calendar,
  Filter,
  MessageSquare,
  CopyPlus,
  Activity,
  BarChart3,
  ShieldCheck,
  CheckCircle,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface KwitansiRecord {
  id: number;
  nomor_bukti: string;
  kode_akun: string;
  sudah_terima_dari: string;
  banyaknya_uang: string;
  untuk_pembayaran: string;
  jumlah: number;
  jumlah_uang?: number;
  keterangan_lembar: string;
  status_verifikasi: string;
  catatan_penolakan?: string;
  is_locked: boolean;
  created_at: string;
}

export default function KasirKwitansiPage() {
  const router = useRouter();
  const [records, setRecords] = useState<KwitansiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [filterDate, setFilterDate] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Session Activity Logs State
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Form State Input Kasir
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [kodeAkun, setKodeAkun] = useState<string>('5.2.2.01.01');
  const [sudahTerimaDari, setSudahTerimaDari] = useState<string>('');
  const [banyaknyaUang, setBanyaknyaUang] = useState<string>('');
  const [untukPembayaran, setUntukPembayaran] = useState<string>('');
  const [jumlah, setJumlah] = useState<number>(0);
  const [keteranganLembar, setKeteranganLembar] = useState<string>('Lembar 1 : Pembukuan');

  // Print Preview, Rejection Modal & Analytics Modal State
  const [printRecord, setPrintRecord] = useState<KwitansiRecord | null>(null);
  const [selectedRejectionNote, setSelectedRejectionNote] = useState<string | null>(null);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState<boolean>(false);

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
      console.error('Gagal memuat data kwitansi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    addLog('Sistem Kasir Kwitansi terhubung.');
    const channel = supabase
      .channel('kasir_realtime_kwitansi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kwitansi_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  // Listener Pintasan Keyboard untuk Kasir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('search-kasir-input')?.focus();
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleOpenNewModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fungsi Konversi Angka ke Terbilang Bahasa Indonesia
  const terbilangIndo = (nilai: number): string => {
    if (!nilai || nilai === 0) return 'Nol Rupiah';
    const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    
    function convert(n: number): string {
      let val = '';
      if (n < 12) {
        val = ' ' + huruf[n];
      } else if (n < 20) {
        val = convert(n - 10) + ' Belas';
      } else if (n < 100) {
        val = convert(Math.floor(n / 10)) + ' Puluh' + convert(n % 10);
      } else if (n < 200) {
        val = ' Seratus' + convert(n - 100);
      } else if (n < 1000) {
        val = convert(Math.floor(n / 100)) + ' Ratus' + convert(n % 100);
      } else if (n < 2000) {
        val = ' Seribu' + convert(n - 1000);
      } else if (n < 1000000) {
        val = convert(Math.floor(n / 1000)) + ' Ribu' + convert(n % 1000);
      } else if (n < 1000000000) {
        val = convert(Math.floor(n / 1000000)) + ' Juta' + convert(n % 1000000);
      } else if (n < 1000000000000) {
        val = convert(Math.floor(n / 1000000000)) + ' Miliar' + convert(n % 1000000000);
      }
      return val;
    }
    
    const hasil = convert(nilai).trim();
    return hasil ? hasil + ' Rupiah' : 'Nol Rupiah';
  };

  const generateNomorBukti = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `KWT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomNum}`;
  };

  const handleOpenNewModal = () => {
    setKodeAkun('5.2.2.01.01');
    setSudahTerimaDari('');
    setBanyaknyaUang('');
    setUntukPembayaran('');
    setJumlah(0);
    setKeteranganLembar('Lembar 1 : Pembukuan');
    setShowFormModal(true);
    addLog('Membuka form input kwitansi baru.');
  };

  const handleDuplicateRecord = (r: KwitansiRecord) => {
    setKodeAkun(r.kode_akun || '5.2.2.01.01');
    setSudahTerimaDari(r.sudah_terima_dari || '');
    setUntukPembayaran(r.untuk_pembayaran || '');
    setJumlah(r.jumlah || r.jumlah_uang || 0);
    setBanyaknyaUang(r.banyaknya_uang || terbilangIndo(r.jumlah || r.jumlah_uang || 0));
    setKeteranganLembar(r.keterangan_lembar || 'Lembar 1 : Pembukuan');
    setShowFormModal(true);
    addLog(`Menduplikasi data dari No. Bukti: ${r.nomor_bukti}`);
    showToast(`Data ${r.nomor_bukti} berhasil diduplikasi ke form!`, 'info');
  };

  const handleSaveKwitansi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sudahTerimaDari || !untukPembayaran || jumlah <= 0) {
      showToast('Harap lengkapi seluruh kolom wajib dengan benar.', 'error');
      return;
    }

    try {
      const nomorBukti = generateNomorBukti();
      const finalTerbilang = banyaknyaUang || terbilangIndo(jumlah);
      
      const payload = {
        nomor_bukti: nomorBukti,
        kode_akun: kodeAkun,
        sudah_terima_dari: sudahTerimaDari,
        banyaknya_uang: finalTerbilang,
        untuk_pembayaran: untukPembayaran,
        jumlah: Number(jumlah),
        jumlah_uang: Number(jumlah),
        keterangan_lembar: keteranganLembar,
        status_verifikasi: 'Menunggu Verifikasi',
        is_locked: true
      };

      const response = await supabase.from('kwitansi_header').insert([payload]);
      
      if (response.error) {
        console.error('Raw Supabase Response Error:', response.error);
        const errString = JSON.stringify(response.error, null, 2);
        throw new Error(errString === '{}' ? 'Koneksi ke Supabase gagal atau kredensial tidak valid (Cek .env.local).' : errString);
      }

      showToast(`Kwitansi ${nomorBukti} berhasil diterbitkan dan dikirim!`, 'success');
      addLog(`Menerbitkan kwitansi baru: ${nomorBukti} (${formatRupiah(jumlah)})`);
      setShowFormModal(false);
      fetchRecords();
    } catch (err: any) {
      const errorMsg = err?.message || JSON.stringify(err) || 'Terjadi kesalahan sistem.';
      showToast(`Gagal menyimpan: ${errorMsg}`, 'error');
      console.error('Full Caught Error:', err);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const handleCopyNoBukti = (noBukti: string) => {
    navigator.clipboard.writeText(noBukti);
    showToast(`Nomor Bukti ${noBukti} disalin ke clipboard!`, 'info');
    addLog(`Menyalin nomor bukti: ${noBukti}`);
  };

  const handleCopyWhatsAppText = (r: KwitansiRecord) => {
    const valJumlah = r.jumlah || r.jumlah_uang || 0;
    const text = `*KWITANSI PEMBAYARAN RSUD BUKIT KERMAN*\n\n` +
      `No. Bukti: ${r.nomor_bukti}\n` +
      `Diterima Dari: ${r.sudah_terima_dari}\n` +
      `Untuk Pembayaran: ${r.untuk_pembayaran}\n` +
      `Jumlah: *${formatRupiah(valJumlah)}*\n` +
      `Terbilang: ${r.banyaknya_uang}\n` +
      `Status: ${r.status_verifikasi}\n\n` +
      `Terima kasih telah melakukan pembayaran di RSUD Bukit Kerman.`;
    navigator.clipboard.writeText(text);
    showToast('Ringkasan teks WhatsApp berhasil disalin!', 'success');
    addLog(`Menyalin teks WA untuk ${r.nomor_bukti}`);
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      showToast('Tidak ada data untuk diekspor.', 'error');
      return;
    }

    const headers = ['Nomor Bukti', 'Kode Akun', 'Sudah Terima Dari', 'Untuk Pembayaran', 'Jumlah', 'Status Verifikasi', 'Tanggal'];
    const rows = filteredRecords.map(r => [
      r.nomor_bukti,
      r.kode_akun,
      `"${r.sudah_terima_dari}"`,
      `"${r.untuk_pembayaran}"`,
      r.jumlah || r.jumlah_uang || 0,
      r.status_verifikasi,
      r.created_at
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Kwitansi_Kasir_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Rekapitulasi berhasil diunduh ke CSV!', 'success');
    addLog('Mengunduh rekapitulasi data ke format CSV.');
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.sudah_terima_dari || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.nomor_bukti || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = 
      statusFilter === 'semua' ? true :
      statusFilter === 'pending' ? r.status_verifikasi === 'Menunggu Verifikasi' :
      statusFilter === 'disetujui' ? r.status_verifikasi === 'Disetujui' :
      statusFilter === 'ditolak' ? r.status_verifikasi === 'Ditolak' : true;

    const matchDate = filterDate ? r.created_at?.slice(0, 10) === filterDate : true;

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.created_at?.slice(0, 10) === todayStr);
  const totalTodayNominal = todayRecords.reduce((acc, curr) => acc + (curr.jumlah || curr.jumlah_uang || 0), 0);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalApproved = records.filter(r => r.status_verifikasi === 'Disetujui').length;
  const totalRejected = records.filter(r => r.status_verifikasi === 'Ditolak').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Penerbitan Kwitansi Resmi" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {totalRejected > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 px-6 flex items-center justify-between gap-4 text-rose-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide">Perhatian Kasir</h4>
                <p className="text-xs text-rose-700">Terdapat {totalRejected} kwitansi yang ditolak oleh Super Admin. Klik badge status ditolak pada tabel untuk melihat catatan revisi.</p>
              </div>
            </div>
            <button 
              onClick={() => { setStatusFilter('ditolak'); setCurrentPage(1); addLog('Memfilter tampilan ke kwitansi ditolak.'); }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow"
            >
              Lihat Ditolak
            </button>
          </div>
        )}

        {/* JUDUL DAN TOMBOL KEMBALI */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200 shadow-sm"
              title="Kembali ke Halaman Sebelumnya"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Receipt className="w-6 h-6 text-sky-600" /> Daftar Kwitansi Kasir
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Input kwitansi pembayaran. Data yang dikirim akan otomatis terkunci dan diverifikasi oleh Super Admin.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setShowAnalyticsModal(true); addLog('Membuka ringkasan laporan & statistik shift.'); }}
              className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 border border-sky-200 cursor-pointer"
            >
              <BarChart3 className="w-4 h-4 text-sky-600" /> Laporan Shift
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 border border-slate-200 cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" /> Unduh Rekap
            </button>
            <button
              onClick={handleOpenNewModal}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 shadow cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Buat Kwitansi Baru
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => { setStatusFilter('semua'); setFilterDate(todayStr); setCurrentPage(1); addLog('Memfilter shift hari ini.'); }}
            className="bg-white hover:bg-sky-50/50 border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between text-left transition cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Input Hari Ini (Klik Filter)</span>
              <h3 className="text-lg font-black text-slate-900">{todayRecords.length} Kwitansi</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </button>

          <button 
            onClick={() => { setStatusFilter('pending'); setCurrentPage(1); addLog('Memfilter berkas pending.'); }}
            className="bg-white hover:bg-amber-50/50 border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between text-left transition cursor-pointer"
          >
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Menunggu Verifikasi (Klik Filter)</span>
              <h3 className="text-lg font-black text-amber-600">{totalPending} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </button>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Akumulasi Nominal Hari Ini</span>
              <h3 className="text-sm font-black font-mono text-slate-900">{formatRupiah(totalTodayNominal)}</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative flex-1 max-w-xs w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="search-kasir-input"
                  type="text"
                  placeholder="Cari No. Bukti, Penerima... (Tekan '/' untuk fokus)"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="relative w-full sm:w-auto flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => { setFilterDate(e.target.value); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2 text-xs text-slate-700 font-bold focus:outline-none"
                />
                {filterDate && (
                  <button onClick={() => { setFilterDate(''); setCurrentPage(1); }} className="text-xs text-rose-600 font-bold hover:underline">Reset</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold flex-wrap">
              <button onClick={() => { setStatusFilter('semua'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
              <button onClick={() => { setStatusFilter('pending'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
              <button onClick={() => { setStatusFilter('disetujui'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
              <button onClick={() => { setStatusFilter('ditolak'); setCurrentPage(1); }} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'ditolak' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Ditolak</button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">Nomor Bukti &amp; Akun</th>
                  <th className="p-3.5">Sudah Terima Dari</th>
                  <th className="p-3.5">Untuk Pembayaran</th>
                  <th className="p-3.5 text-right">Jumlah</th>
                  <th className="p-3.5 text-center">Lembar</th>
                  <th className="p-3.5 text-center">Status (Klik Jika Ditolak)</th>
                  <th className="p-3.5 text-center">Aksi &amp; Duplikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">Memuat data kwitansi kasir...</td></tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-slate-600 font-bold">Tidak ada data kwitansi yang sesuai dengan filter.</p>
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('semua'); setFilterDate(''); setCurrentPage(1); }} className="text-xs text-sky-600 font-bold hover:underline">Reset Semua Filter</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{r.nomor_bukti}</span>
                          <button 
                            onClick={() => handleCopyNoBukti(r.nomor_bukti)} 
                            className="p-1 text-slate-400 hover:text-sky-600 transition rounded cursor-pointer"
                            title="Salin Nomor Bukti"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="block text-[10px] text-slate-400 font-normal">Akun: {r.kode_akun}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{r.sudah_terima_dari}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.untuk_pembayaran}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatRupiah(r.jumlah || r.jumlah_uang || 0)}</td>
                      <td className="p-3.5 text-center font-bold text-sky-700">{r.keterangan_lembar?.split(':')[0]}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (r.status_verifikasi === 'Ditolak') {
                              setSelectedRejectionNote(r.catatan_penolakan || 'Tidak ada catatan penolakan spesifik yang disertakan oleh Admin.');
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase transition ${
                            r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                            r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800 hover:bg-rose-200 cursor-pointer shadow-sm animate-pulse' : 'bg-amber-100 text-amber-800'
                          }`}
                          title={r.status_verifikasi === 'Ditolak' ? 'Klik untuk melihat catatan penolakan' : ''}
                        >
                          {r.status_verifikasi} {r.status_verifikasi === 'Ditolak' && ' ℹ️'}
                        </button>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setPrintRecord(r)}
                            className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Cetak Blangko"
                          >
                            <Printer className="w-3.5 h-3.5" /> Cetak
                          </button>
                          <button
                            onClick={() => handleDuplicateRecord(r)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
                            title="Duplikasi Data ke Form Baru"
                          >
                            <CopyPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 gap-3">
              <span>Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredRecords.length} total data)</span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={currentPage === 1} 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition"
                >
                  Sebelumnya
                </button>
                <button 
                  disabled={currentPage === totalPages} 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-sky-400 shrink-0 border border-slate-700">
              <Activity className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Log Aktivitas Kasir Sesi Ini</h4>
              <p className="text-[11px] text-slate-400">Pencatatan aktivitas interaktif otomatis di modul kasir RSUD Bukit Kerman.</p>
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

      {showAnalyticsModal && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600" /> Laporan &amp; Statistik Shift RSUD Bukit Kerman
              </h3>
              <button onClick={() => setShowAnalyticsModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-slate-400 uppercase text-[10px] font-bold">Total Rekor Data</span>
                <p className="text-lg font-black text-slate-900">{records.length} Berkas</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 space-y-1">
                <span className="text-emerald-600 uppercase text-[10px] font-bold">Disetujui Admin</span>
                <p className="text-lg font-black text-emerald-800">{totalApproved} Berkas</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-1">
                <span className="text-amber-600 uppercase text-[10px] font-bold">Menunggu Verifikasi</span>
                <p className="text-lg font-black text-amber-800">{totalPending} Berkas</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 space-y-1">
                <span className="text-rose-600 uppercase text-[10px] font-bold">Ditolak / Revisi</span>
                <p className="text-lg font-black text-rose-800">{totalRejected} Berkas</p>
              </div>
            </div>

            <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs text-sky-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-sky-600" /> Informasi Keamanan Sistem Keuangan BLUD</p>
              <p className="text-sky-700 leading-relaxed">Seluruh data kwitansi yang diterbitkan oleh kasir terenkripsi dan diverifikasi langsung oleh Super Admin sesuai regulasi keuangan RSUD Bukit Kerman.</p>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setShowAnalyticsModal(false)} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow">Tutup Laporan</button>
            </div>
          </div>
        </div>
      )}

      {selectedRejectionNote !== null && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" /> Catatan Penolakan Admin
              </h3>
              <button onClick={() => setSelectedRejectionNote(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed font-medium">
              {selectedRejectionNote}
            </div>
            <p className="text-[11px] text-slate-500">Silakan buat kwitansi baru atau koordinasikan dengan Super Admin RSUD Bukit Kerman jika terdapat kekeliruan data.</p>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setSelectedRejectionNote(null)} className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600" /> Form Input Kwitansi RSUD Bukit Kerman
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <form onSubmit={handleSaveKwitansi} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Akun</label>
                  <input
                    type="text"
                    value={kodeAkun}
                    onChange={(e) => setKodeAkun(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <button type="button" onClick={() => setKodeAkun('5.2.2.01.01')} className="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono">ATK</button>
                    <button type="button" onClick={() => setKodeAkun('5.2.2.02.01')} className="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono">Bahan/Obat</button>
                    <button type="button" onClick={() => setKodeAkun('5.2.2.03.01')} className="text-[9px] bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded font-mono">Jasa Medis</button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Keterangan Lembar</label>
                  <select
                    value={keteranganLembar}
                    onChange={(e) => setKeteranganLembar(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold"
                  >
                    <option value="Lembar 1 : Pembukuan">Lembar 1 : Pembukuan</option>
                    <option value="Lembar 2 : Penerimaan">Lembar 2 : Penerimaan</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Sudah terima dari *</label>
                <input
                  type="text"
                  placeholder="Contoh: BPJS CABANG MUARO BUNGO"
                  value={sudahTerimaDari}
                  onChange={(e) => setSudahTerimaDari(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold uppercase"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Untuk Pembayaran *</label>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setUntukPembayaran('PEMBAYARAN PELAYANAN RAWAT JALAN')} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer">Rawat Jalan</button>
                    <button type="button" onClick={() => setUntukPembayaran('PEMBAYARAN TINDAKAN LABORATORIUM & RADIOLOGI')} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded transition cursor-pointer">Lab/Radiologi</button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Keterangan pembayaran..."
                  value={untukPembayaran}
                  onChange={(e) => setUntukPembayaran(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah (Rp) *</label>
                  <input
                    type="number"
                    value={jumlah}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setJumlah(val);
                      setBanyaknyaUang(terbilangIndo(val));
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    <button type="button" onClick={() => { setJumlah(50000); setBanyaknyaUang(terbilangIndo(50000)); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded transition cursor-pointer">50rb</button>
                    <button type="button" onClick={() => { setJumlah(100000); setBanyaknyaUang(terbilangIndo(100000)); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded transition cursor-pointer">100rb</button>
                    <button type="button" onClick={() => { setJumlah(250000); setBanyaknyaUang(terbilangIndo(250000)); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded transition cursor-pointer">250rb</button>
                    <button type="button" onClick={() => { setJumlah(500000); setBanyaknyaUang(terbilangIndo(500000)); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded transition cursor-pointer">500rb</button>
                    <button type="button" onClick={() => { setJumlah(1000000); setBanyaknyaUang(terbilangIndo(1000000)); }} className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono px-1.5 py-0.5 rounded transition cursor-pointer">1Jt</button>
                  </div>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Banyaknya Uang (Terbilang) *</label>
                  <input
                    type="text"
                    value={banyaknyaUang}
                    onChange={(e) => setBanyaknyaUang(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 uppercase"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Data yang dikirim akan terkunci otomatis dan diverifikasi oleh Super Admin.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow cursor-pointer">Kirim Kwitansi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {printRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <h3 className="text-sm font-black uppercase text-slate-900">Cetak Kwitansi Resmi RSUD Bukit Kerman</h3>
              <button onClick={() => setPrintRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="p-8 border-2 border-slate-900 rounded-xl space-y-4 bg-white text-slate-900 font-sans relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
                <span className="text-6xl font-black uppercase tracking-widest text-center rotate-[-30deg]">RSUD BUKIT KERMAN RESMI</span>
              </div>

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
                  <span className="text-lg font-black font-mono">{formatRupiah(printRecord.jumlah || printRecord.jumlah_uang || 0)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-4 text-xs">
                <div className="space-y-1 text-[11px] text-slate-800">
                  <p className="font-bold">Keterangan :</p>
                  <p className={printRecord.keterangan_lembar?.includes('Lembar 1') ? 'font-black text-sky-900 underline' : 'text-slate-500'}>
                    &nbsp;&nbsp;&nbsp;&nbsp;Lembar 1 &nbsp;&nbsp;: Pembukuan
                  </p>
                  <p className={printRecord.keterangan_lembar?.includes('Lembar 2') ? 'font-black text-sky-900 underline' : 'text-slate-500'}>
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

            <div className="flex justify-between items-center print:hidden pt-2">
              <button onClick={() => handleCopyWhatsAppText(printRecord)} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                <MessageSquare className="w-4 h-4" /> Salin Teks WA
              </button>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                  <Printer className="w-4 h-4" /> Cetak Resmi
                </button>
                <button onClick={() => setPrintRecord(null)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}