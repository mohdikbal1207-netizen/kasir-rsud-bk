'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Filter
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
  keterangan_lembar: string;
  status_verifikasi: string;
  is_locked: boolean;
  created_at: string;
}

export default function KasirKwitansiPage() {
  const [records, setRecords] = useState<KwitansiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [filterDate, setFilterDate] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State Input Kasir
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [kodeAkun, setKodeAkun] = useState<string>('5.2.2.01.01');
  const [sudahTerimaDari, setSudahTerimaDari] = useState<string>('');
  const [banyaknyaUang, setBanyaknyaUang] = useState<string>('');
  const [untukPembayaran, setUntukPembayaran] = useState<string>('');
  const [jumlah, setJumlah] = useState<number>(0);
  const [keteranganLembar, setKeteranganLembar] = useState<string>('Lembar 1 : Pembukuan');

  // Print Preview State
  const [printRecord, setPrintRecord] = useState<KwitansiRecord | null>(null);

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

  // Listener Pintasan Keyboard untuk Kasir (Tekan '/' untuk cari, 'Alt+N' untuk buat baru)
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
        jumlah: jumlah,
        keterangan_lembar: keteranganLembar,
        status_verifikasi: 'Menunggu Verifikasi',
        is_locked: true // Dikunci otomatis agar kasir tidak dapat mengubah setelah dikirim
      };

      const { error } = await supabase.from('kwitansi_header').insert([payload]);
      if (error) throw error;

      showToast(`Kwitansi ${nomorBukti} berhasil diterbitkan dan dikirim!`, 'success');
      setShowFormModal(false);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const handleCopyNoBukti = (noBukti: string) => {
    navigator.clipboard.writeText(noBukti);
    showToast(`Nomor Bukti ${noBukti} disalin ke clipboard!`, 'info');
  };

  // Fungsi Ekspor Data ke CSV
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
      r.jumlah,
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
  };

  // Filter Data Berdasarkan Pencarian, Status, & Tanggal
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

  // Statistik Shift Hari Ini
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.created_at?.slice(0, 10) === todayStr);
  const totalTodayNominal = todayRecords.reduce((acc, curr) => acc + (curr.jumlah || 0), 0);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
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
        
        {/* BANNER PERINGATAN JIKA ADA KWITANSI DITOLAK */}
        {totalRejected > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 px-6 flex items-center justify-between gap-4 text-rose-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide">Perhatian Kasir</h4>
                <p className="text-xs text-rose-700">Terdapat {totalRejected} kwitansi yang ditolak oleh Super Admin. Harap periksa catatan verifikasi.</p>
              </div>
            </div>
            <button 
              onClick={() => setStatusFilter('ditolak')}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow"
            >
              Lihat Ditolak
            </button>
          </div>
        )}

        {/* TOP BAR ACTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-sky-600" /> Daftar Kwitansi Kasir
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Input kwitansi pembayaran. Data yang dikirim akan otomatis terkunci dan diverifikasi oleh Super Admin.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden md:flex items-center gap-1.5 text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-2xl">
              <Command className="w-3.5 h-3.5" /> <span>Pintasan: <kbd className="bg-white px-1.5 py-0.5 rounded shadow-sm text-slate-700 font-mono">Alt + N</kbd> (Buat Baru)</span>
            </div>
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 border border-slate-200 cursor-pointer"
              title="Unduh Rekap CSV"
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

        {/* KARTU STATISTIK SHIFT HARI INI (INTERAKTIF KLIK) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => { setStatusFilter('semua'); setFilterDate(todayStr); }}
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
            onClick={() => setStatusFilter('pending')}
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

        {/* KONTEN TABEL & FILTER */}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
                />
              </div>

              {/* FILTER TANGGAL */}
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

            {/* TAB FILTER STATUS KASIR */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold flex-wrap">
              <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
              <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
              <button onClick={() => setStatusFilter('disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
              <button onClick={() => setStatusFilter('ditolak')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'ditolak' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Ditolak</button>
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
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">Memuat data kwitansi kasir...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                          <FileText className="w-6 h-6" />
                        </div>
                        <p className="text-slate-600 font-bold">Tidak ada data kwitansi yang sesuai dengan filter.</p>
                        <button onClick={() => { setSearchTerm(''); setStatusFilter('semua'); setFilterDate(''); }} className="text-xs text-sky-600 font-bold hover:underline">Reset Semua Filter</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r) => (
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
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatRupiah(r.jumlah)}</td>
                      <td className="p-3.5 text-center font-bold text-sky-700">{r.keterangan_lembar?.split(':')[0]}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status_verifikasi}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setPrintRecord(r)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL INPUT FORM KASIR */}
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

      {/* MODAL PREVIEW & CETAK BLANGKO RESMI */}
      {printRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <h3 className="text-sm font-black uppercase text-slate-900">Cetak Kwitansi Resmi RSUD Bukit Kerman</h3>
              <button onClick={() => setPrintRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {/* AREA CETAK BLANGKO RESMI */}
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

            <div className="flex justify-end gap-2 print:hidden">
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                <Printer className="w-4 h-4" /> Cetak Kwitansi Resmi
              </button>
              <button onClick={() => setPrintRecord(null)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}