'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Pill, 
  Plus, 
  Trash2, 
  Send, 
  Printer, 
  Search, 
  Eye, 
  Lock, 
  CheckCircle2, 
  Clock, 
  X,
  FileText,
  Download,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Percent,
  FileSpreadsheet,
  Sparkles,
  History,
  RefreshCw,
  ListFilter,
  Users,
  Calendar,
  Copy,
  Check,
  Filter
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

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

// Master usulan nama obat/OBHP RSUD Bukit Kerman untuk Autocomplete cepat
const MASTER_OBAT_SUGGESTIONS = [
  'Paracetamol 500mg Tablet',
  'Amoxicillin 500mg Kaplet',
  'Cefadroxil 500mg Kapsul',
  'Omeprazole 20mg Kapsul',
  'Amlodipine 10mg Tablet',
  'Metformin 500mg Tablet',
  'Cairan Infus Ringer Lactate (RL) 500ml',
  'Cairan Infus NaCl 0.9% 500ml',
  'Spuit 3cc Disposible / Alat Suntik',
  'Spuit 5cc Disposible / Alat Suntik',
  'Abocath / Jarum Infus No. 20G',
  'Infus Set Dewasa Standard',
  'Kasa Steril 16x16 cm Box',
  'Alkohol Swab 70%',
  'Sarung Tangan Medis Steril (Handscoon) L/M'
];

export default function KasirRincianObatPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RincianObatRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [isSearchingRm, setIsSearchingRm] = useState<boolean>(false);

  // State Lama & Tambahan Filter Baru (Jenis Layanan & Rentang Tanggal)
  const [dateFilter, setDateFilter] = useState<string>('semua');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [serviceFilter, setServiceFilter] = useState<string>('semua');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // State Baru untuk Modal Daftar Riwayat Cepat Pasien
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Form State Utama
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [noRm, setNoRm] = useState('');
  const [namaPasien, setNamaPasien] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState('Rawat Jalan');
  const [penjamin, setPenjamin] = useState('Umum / Mandiri');
  const [penanggungJawab, setPenanggungJawab] = useState('Apoteker RSUD Bukit Kerman');
  const [diskonRupiah, setDiskonRupiah] = useState<number>(0);

  const [items, setItems] = useState<DetailItem[]>([
    { nama_obat_obhp: '', jumlah: 1, harga_satuan: 0, subtotal: 0 }
  ]);

  // Modal Print Preview State
  const [printRecord, setPrintRecord] = useState<RincianObatRecord | null>(null);

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
      console.error('Gagal mengambil data rincian obat:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();

    // Subscribe Realtime Supabase
    const channel = supabase
      .channel('realtime_rincian_obat')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rincian_obat_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  // FITUR PINTAR: AUTO-FILL DATA BERDASARKAN NO. RM PASIEN LAMA
  const handleCheckNoRm = async (targetRm?: string) => {
    const queryRm = targetRm !== undefined ? targetRm : noRm;
    if (!queryRm.trim()) return;
    
    setIsSearchingRm(true);
    try {
      const { data, error } = await supabase
        .from('rincian_obat_header')
        .select(`
          *,
          rincian_obat_detail (*)
        `)
        .eq('no_rm', queryRm.trim())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const lastPatient = data[0];
        setNoRm(lastPatient.no_rm);
        setNamaPasien(lastPatient.nama_pasien || '');
        setJenisLayanan(lastPatient.jenis_layanan || 'Rawat Jalan');
        setPenjamin(lastPatient.penjamin || 'Umum / Mandiri');
        setDiskonRupiah(lastPatient.diskon || 0);

        if (lastPatient.rincian_obat_detail && lastPatient.rincian_obat_detail.length > 0) {
          const mappedItems = lastPatient.rincian_obat_detail.map((d: any) => ({
            nama_obat_obhp: d.nama_obat_obhp,
            jumlah: d.jumlah,
            harga_satuan: d.harga_satuan,
            subtotal: d.subtotal
          }));
          setItems(mappedItems);
        }
        setIsHistoryModalOpen(false);
      } else {
        alert(`Nomor RM "${queryRm}" belum memiliki riwayat tersimpan. Silakan isi data baru.`);
      }
    } catch (err) {
      console.error('Gagal memuat data riwayat RM:', err);
    } finally {
      setIsSearchingRm(false);
    }
  };

  // Handler dynamic item row
  const handleItemChange = (index: number, field: keyof DetailItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };
    if (field === 'jumlah' || field === 'harga_satuan') {
      item.subtotal = Number(item.jumlah || 0) * Number(item.harga_satuan || 0);
    }
    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([...items, { nama_obat_obhp: '', jumlah: 1, harga_satuan: 0, subtotal: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  // Reset Formulir
  const handleResetForm = () => {
    setNoRm('');
    setNamaPasien('');
    setJenisLayanan('Rawat Jalan');
    setPenjamin('Umum / Mandiri');
    setDiskonRupiah(0);
    setItems([{ nama_obat_obhp: '', jumlah: 1, harga_satuan: 0, subtotal: 0 }]);
  };

  // Fitur Pintasan Template Paket Obat Cepat
  const handleApplyTemplate = (type: 'umum' | 'igd') => {
    if (type === 'umum') {
      setItems([
        { nama_obat_obhp: 'Paracetamol 500mg Tablet', jumlah: 10, harga_satuan: 500, subtotal: 5000 },
        { nama_obat_obhp: 'Amoxicillin 500mg Kaplet', jumlah: 15, harga_satuan: 1000, subtotal: 15000 }
      ]);
    } else if (type === 'igd') {
      setItems([
        { nama_obat_obhp: 'Cairan Infus Ringer Lactate (RL) 500ml', jumlah: 2, harga_satuan: 25000, subtotal: 50000 },
        { nama_obat_obhp: 'Infus Set Dewasa Standard', jumlah: 1, harga_satuan: 15000, subtotal: 15000 },
        { nama_obat_obhp: 'Spuit 3cc Disposible / Alat Suntik', jumlah: 2, harga_satuan: 3000, subtotal: 6000 }
      ]);
    }
  };

  // Perhitungan Subtotal & Total
  const kotorObatCalculated = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  const totalObatCalculated = Math.max(0, kotorObatCalculated - diskonRupiah);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noRm || !namaPasien || items.some(i => !i.nama_obat_obhp || i.harga_satuan <= 0)) {
      alert('Mohon lengkapi No RM, Nama Pasien, serta Rincian Obat/OBHP dengan harga valid (> Rp 0).');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const noTx = `ROB-${new Date().toISOString().slice(0, 7).replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Insert Header
      const { data: headerData, error: headerErr } = await supabase
        .from('rincian_obat_header')
        .insert([{
          no_transaksi: noTx,
          no_rm: noRm,
          nama_pasien: namaPasien,
          jenis_layanan: jenisLayanan,
          penanggung_jawab_apotek: penanggungJawab,
          total_biaya: totalObatCalculated,
          diskon: diskonRupiah,
          penjamin: penjamin,
          status_verifikasi: 'Menunggu Verifikasi',
          is_locked: true, // Otomatis terkunci setelah dikirim oleh kasir
          created_by: user?.id
        }])
        .select()
        .single();

      if (headerErr) throw headerErr;

      // 2. Insert Details
      const detailsPayload = items.map(item => ({
        header_id: headerData.id,
        nama_obat_obhp: item.nama_obat_obhp,
        jumlah: item.jumlah,
        harga_satuan: item.harga_satuan,
        subtotal: item.subtotal
      }));

      const { error: detailErr } = await supabase
        .from('rincian_obat_detail')
        .insert(detailsPayload);

      if (detailErr) throw detailErr;

      alert('Rincian Biaya Obat & OBHP berhasil dikirim dan terkunci!');
      setIsFormOpen(false);
      handleResetForm();
      fetchRecords();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fitur Unduh Ekspor Data ke CSV / Excel
  const handleExportCSV = () => {
    if (records.length === 0) return alert('Tidak ada data untuk diekspor.');
    const headers = ["No Transaksi", "No RM", "Nama Pasien", "Layanan", "Penjamin", "Total Biaya", "Status"];
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
    link.setAttribute("download", `Rekap_Biaya_Obat_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Fitur Salin Teks Ringkasan untuk Pesan WhatsApp Pasien
  const handleCopySummary = (r: RincianObatRecord) => {
    const detailsText = r.rincian_obat_detail
      ?.map((d, i) => `${i + 1}. ${d.nama_obat_obhp} (${d.jumlah}x) - ${formatRupiah(d.subtotal)}`)
      .join('\n') || '';

    const text = `*RSUD BUKIT KERMAN - RINCIAN BIAYA OBAT*\n\nNo. Transaksi: ${r.no_transaksi}\nNama: ${r.nama_pasien} (RM: ${r.no_rm})\nLayanan: ${r.jenis_layanan}\n\n*Daftar Obat/OBHP:*\n${detailsText}\n\n*Total Biaya: ${formatRupiah(r.total_biaya)}*\nStatus: ${r.status_verifikasi}\n\nTerima kasih atas kunjungan Anda di RSUD Bukit Kerman. Sehat selalu!`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = r.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.no_rm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.no_transaksi.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter Status
    const matchStatus = 
      statusFilter === 'semua' ? true :
      statusFilter === 'pending' ? r.status_verifikasi === 'Menunggu Verifikasi' :
      statusFilter === 'disetujui' ? r.status_verifikasi === 'Disetujui' : true;

    // Filter Tanggal & Rentang Kustom Baru
    let matchDate = true;
    const recordDate = new Date(r.created_at).toISOString().slice(0, 10);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (dateFilter === 'hari_ini') {
      matchDate = recordDate === todayStr;
    } else if (dateFilter === 'custom' && startDateFilter && endDateFilter) {
      matchDate = recordDate >= startDateFilter && recordDate <= endDateFilter;
    }

    // Filter Layanan
    const matchService = 
      serviceFilter === 'semua' ? true :
      r.jenis_layanan.toLowerCase() === serviceFilter.toLowerCase();

    return matchSearch && matchStatus && matchDate && matchService;
  });

  // Kalkulasi Statistik Ringkas
  const totalNominalTerproses = records.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalDisetujui = records.filter(r => r.status_verifikasi === 'Disetujui').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <KasirHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Input & Cetak Rincian Biaya Obat-Obatan & OBHP"
        showBackButton={true}
      />

      {/* Datalist Reusable untuk Autocomplete Nama Obat */}
      <datalist id="list-obat-rsud">
        {MASTER_OBAT_SUGGESTIONS.map((namaObat, i) => (
          <option key={i} value={namaObat} />
        ))}
      </datalist>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 print:p-0 print:max-w-none">
        
        {/* TOP BAR ACTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-6 h-6 text-emerald-600" /> Rincian Biaya Obat &amp; OBHP (Kasir)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Input formulir lembar rincian obat per pasien. Data langsung terkunci begitu terkirim.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
              title="Unduh Rekap CSV / Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Ekspor Data
            </button>
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Input Rincian Obat Baru
            </button>
          </div>
        </div>

        {/* METRIK STATISTIK RINGKAS HARIAN */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Transaksi</span>
              <h3 className="text-lg font-black text-slate-900">{records.length} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Pending Verifikasi</span>
              <h3 className="text-lg font-black text-amber-600">{totalPending} Lembar</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Disetujui Admin</span>
              <h3 className="text-lg font-black text-emerald-600">{totalDisetujui} Lembar</h3>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Total Nominal Farmasi</span>
              <h3 className="text-sm font-black font-mono text-slate-900">{formatRupiah(totalNominalTerproses)}</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* REKAPAN TABEL DATA KASIR DENGAN MULTI FILTER LANJUTAN */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pasien, RM, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* FILTER JENIS LAYANAN */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
                <button
                  onClick={() => setServiceFilter('semua')}
                  className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                >
                  Semua Layanan
                </button>
                <button
                  onClick={() => setServiceFilter('Rawat Jalan')}
                  className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'Rawat Jalan' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                >
                  Rawat Jalan
                </button>
                <button
                  onClick={() => setServiceFilter('Rawat Inap')}
                  className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'Rawat Inap' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                >
                  Rawat Inap
                </button>
                <button
                  onClick={() => setServiceFilter('IGD')}
                  className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${serviceFilter === 'IGD' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
                >
                  IGD
                </button>
            </div>

            {/* FILTER TANGGAL CEPAT & KUSTOM */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setDateFilter('semua')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${dateFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Semua Tgl
              </button>
              <button
                onClick={() => setDateFilter('hari_ini')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1 ${dateFilter === 'hari_ini' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
              >
                <Calendar className="w-3 h-3 text-emerald-600" /> Hari Ini
              </button>
              <button
                onClick={() => setDateFilter('custom')}
                className={`px-2.5 py-1.5 rounded-xl transition cursor-pointer ${dateFilter === 'custom' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500'}`}
              >
                Kustom Tanggal
              </button>
            </div>

            {/* TAB FILTER STATUS BERKAS */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('semua')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Status
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setStatusFilter('disetujui')}
                className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Disetujui
              </button>
            </div>
          </div>
        </div>

        {/* PANEL TAMBAHAN INPUT RENTANG TANGGAL KUSTOM JIKA AKTIF */}
        {dateFilter === 'custom' && (
          <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-2xl flex flex-wrap items-center gap-4 text-xs font-bold print:hidden">
            <span className="text-emerald-900 flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-emerald-600" /> Saring Berdasarkan Rentang Tanggal:
            </span>
            <div className="flex items-center gap-2">
              <label className="text-slate-600">Dari:</label>
              <input
                type="date"
                value={startDateFilter}
                onChange={(e) => setStartDateFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl p-1.5 focus:outline-none font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-slate-600">Sampai:</label>
              <input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl p-1.5 focus:outline-none font-mono"
              />
            </div>
          </div>
        )}

        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                <th className="p-3.5">No. Transaksi</th>
                <th className="p-3.5">Pasien / RM</th>
                <th className="p-3.5">Layanan &amp; Penjamin</th>
                <th className="p-3.5 text-right">Total Biaya</th>
                <th className="p-3.5 text-center">Akses Kasir</th>
                <th className="p-3.5 text-center">Status Verifikasi</th>
                <th className="p-3.5 text-center">Aksi (Cetak / Salin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Memuat data...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-6 text-slate-400">Belum ada rincian obat yang diinput.</td></tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {r.no_transaksi}
                      <span className="block text-[10px] text-slate-400 font-normal">{new Date(r.created_at).toLocaleDateString('id-ID')}</span>
                    </td>
                    <td className="p-3.5">
                      <strong className="block text-slate-800">{r.nama_pasien}</strong>
                      <span className="text-[10px] text-amber-700 font-mono">{r.no_rm}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="block font-bold text-slate-700">{r.jenis_layanan}</span>
                      <span className="text-[10px] text-slate-500">{r.penjamin || 'Umum / Mandiri'}</span>
                    </td>
                    <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatRupiah(r.total_biaya)}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        <Lock className="w-3 h-3 text-amber-600" /> Terkunci
                      </span>
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
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setPrintRecord(r)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition cursor-pointer"
                          title="Pratinjau Lembar Rincian Cetak"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleCopySummary(r)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition cursor-pointer"
                          title="Salin Teks Ringkasan"
                        >
                          <Copy className="w-4 h-4 text-emerald-600" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    </main>

    {/* MODAL DAFTAR RIWAYAT PASIEN */}
    {isHistoryModalOpen && (
      <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600" /> Pilih Riwayat Pasien Rumah Sakit
            </h3>
            <button onClick={() => setIsHistoryModalOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <div className="overflow-y-auto space-y-2 pr-1 flex-1 text-xs">
            {records.length === 0 ? (
              <p className="text-center py-6 text-slate-400">Belum ada riwayat pasien tersimpan.</p>
            ) : (
              records.map((r) => (
                <div 
                  key={r.id}
                  onClick={() => handleCheckNoRm(r.no_rm)}
                  className="p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl cursor-pointer transition flex justify-between items-center"
                >
                  <div>
                    <strong className="block text-slate-900 font-bold">{r.nama_pasien}</strong>
                    <span className="font-mono text-emerald-700 text-[10px]">RM: {r.no_rm}</span> &bull; <span className="text-slate-500 text-[10px]">{r.jenis_layanan}</span>
                  </div>
                  <span className="px-2.5 py-1 bg-white border border-slate-200 text-emerald-700 font-bold rounded-xl text-[10px]">
                    Tarik Data →
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    )}

    {/* MODAL INPUT FORMULIR RINCIAN OBAT & OBHP */}
    {isFormOpen && (
      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] flex flex-col justify-between">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase text-slate-900">Formulir Rincian Biaya Obat &amp; OBHP</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
                title="Reset Formulir"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Bersihkan
              </button>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
            
            {/* TOMBOL PINTASAN / TEMPLATE CEPAT */}
            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="font-bold text-emerald-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-600" /> Pintasan Paket Obat Instan:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('umum')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-300 transition cursor-pointer"
                >
                  + Paket Umum
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyTemplate('igd')}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-xl font-bold border border-emerald-300 transition cursor-pointer"
                >
                  + Paket IGD / Infus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700">No. Rekam Medis *</label>
                  <button
                    type="button"
                    onClick={() => setIsHistoryModalOpen(true)}
                    className="text-[10px] text-emerald-700 font-bold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <History className="w-3 h-3" /> Pilih Riwayat
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    placeholder="RM-2026-001"
                    value={noRm}
                    onChange={(e) => setNoRm(e.target.value)}
                    onBlur={() => handleCheckNoRm()}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 pr-16 focus:outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleCheckNoRm()}
                    className="absolute right-1 px-2 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <Search className="w-3 h-3" /> Cari
                  </button>
                </div>
                <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">
                  {isSearchingRm ? 'Mencari riwayat...' : '💡 Klik "Pilih Riwayat" untuk instan.'}
                </span>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pasien *</label>
                <input
                  type="text"
                  required
                  placeholder="Nama Pasien"
                  value={namaPasien}
                  onChange={(e) => setNamaPasien(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Jenis Layanan</label>
                <select
                  value={jenisLayanan}
                  onChange={(e) => setJenisLayanan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-bold"
                >
                  <option value="Rawat Jalan">Rawat Jalan</option>
                  <option value="Rawat Inap">Rawat Inap</option>
                  <option value="IGD">IGD (Gawat Darurat)</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Penjamin / Pembayaran</label>
                <select
                  value={penjamin}
                  onChange={(e) => setPenjamin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-bold text-emerald-800"
                >
                  <option value="Umum / Mandiri">Umum / Mandiri</option>
                  <option value="BPJS Kesehatan">BPJS Kesehatan</option>
                  <option value="Jasa Raharja">Jasa Raharja</option>
                  <option value="Asuransi Lainnya">Asuransi Lainnya</option>
                </select>
              </div>
            </div>

            {/* RINCIAN DINAMIS ITEM OBAT / OBHP */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-800 uppercase text-[11px] flex items-center gap-1">
                  Daftar Item Obat / OBHP <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">({items.length} Item Dipilih)</span>
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 px-3 py-1 rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Item
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                      <th className="p-2.5">Nama Obat / OBHP</th>
                      <th className="p-2.5 w-20 text-center">Jumlah</th>
                      <th className="p-2.5 w-32 text-right">Harga (IDR)</th>
                      <th className="p-2.5 w-32 text-right">Subtotal</th>
                      <th className="p-2.5 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-2">
                          <input
                            type="text"
                            list="list-obat-rsud"
                            required
                            placeholder="Ketik / pilih obat..."
                            value={item.nama_obat_obhp}
                            onChange={(e) => handleItemChange(idx, 'nama_obat_obhp', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none font-bold"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={1}
                            required
                            value={item.jumlah}
                            onChange={(e) => handleItemChange(idx, 'jumlah', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-center font-mono font-bold focus:outline-none"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            required
                            value={item.harga_satuan}
                            onChange={(e) => handleItemChange(idx, 'harga_satuan', Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-right font-mono focus:outline-none"
                          />
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FITUR KALKULATOR DISKON / POTONGAN BIAYA */}
            <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-600">Subtotal Kotor Farmasi:</span>
                <span className="font-mono font-bold">{formatRupiah(kotorObatCalculated)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <label className="font-bold text-slate-600 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" /> Diskon / Potongan Biaya (Rp):
                </label>
                <input
                  type="number"
                  min={0}
                  value={diskonRupiah}
                  onChange={(e) => setDiskonRupiah(Number(e.target.value))}
                  className="w-36 bg-white border border-slate-300 rounded-xl p-1.5 text-right font-mono text-xs font-bold focus:outline-none"
                />
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex justify-between items-center">
                <span className="font-extrabold text-amber-900 uppercase text-[11px]">TOTAL NETTO OBAT / OBHP:</span>
                <span className="font-mono text-base font-black text-amber-900">{formatRupiah(totalObatCalculated)}</span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab Apotek</label>
            <input
              type="text"
              value={penanggungJawab}
              onChange={(e) => setPenanggungJawab(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-medium"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" /> {isSubmitting ? 'Kirim...' : 'Kirim & Kunci Data'}
            </button>
        </div>
        </form>
      </div>
    </div>
  )}

  {/* MODAL PRATINJAU CETAKAN */}
  {printRecord && (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 print:border-0 print:shadow-none print:max-w-none print:p-0">
        
        {/* KOPSURAT RESMI RSUD BUKIT KERMAN */}
        <div className="border-b-4 border-black pb-3 text-center relative font-serif">
          <div className="flex items-center justify-between">
            <img src="/logo-kerinci.png" alt="Logo Kab Kerinci" className="w-16 h-16 object-contain" />
            <div className="text-center flex-1 mx-2">
              <h3 className="text-sm font-bold tracking-wide uppercase">PEMERINTAH KABUPATEN KERINCI</h3>
              <h2 className="text-base font-black tracking-wide uppercase">DINAS KESEHATAN</h2>
              <h1 className="text-xl font-black tracking-wider uppercase">RSUD BUKIT KERMAN</h1>
              <p className="text-[10px] font-sans">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
              <p className="text-[9px] font-sans">Website: https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
            </div>
            <img src="/logo-bakti-husada.png" alt="Logo Bakti Husada" className="w-16 h-16 object-contain" />
          </div>
        </div>

        <div className="text-center font-black text-sm uppercase underline tracking-wider font-sans pt-2">
          RINCIAN BIAYA OBAT-OBATAN DAN OBHP
        </div>

        <div className="text-xs space-y-1 font-mono">
          <div className="flex justify-between">
            <span>NO. TRANSAKSI: {printRecord.no_transaksi}</span>
            <span>TGL: {new Date(printRecord.created_at).toLocaleDateString('id-ID')}</span>
          </div>
          <div className="flex justify-between">
            <span>PASIEN / NO. RM: {printRecord.nama_pasien} ({printRecord.no_rm})</span>
            <span>LAYANAN / PENJAMIN: {printRecord.jenis_layanan} ({printRecord.penjamin || 'Umum'})</span>
          </div>
        </div>

        {/* TABEL HASIL FORMULIR */}
        <div className="border-2 border-black overflow-hidden">
          <table className="w-full text-left text-xs border-collapse font-sans">
            <thead>
              <tr className="border-b-2 border-black font-black text-center uppercase">
                <th className="p-2 border-r-2 border-black w-3/5">NAMA OBAT/OBHP</th>
                <th className="p-2 border-r-2 border-black w-1/5">JUMLAH</th>
                <th className="p-2 w-1/5">HARGA</th>
              </tr>
            </thead>
            <tbody className="divide-y border-black font-medium">
              {printRecord.rincian_obat_detail?.map((item, idx) => (
                <tr key={idx} className="border-b border-black">
                  <td className="p-2 border-r-2 border-black uppercase font-bold">{item.nama_obat_obhp}</td>
                  <td className="p-2 border-r-2 border-black text-center font-mono">{item.jumlah}</td>
                  <td className="p-2 text-right font-mono">{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
              {[...Array(Math.max(0, 10 - (printRecord.rincian_obat_detail?.length || 0)))].map((_, i) => (
                <tr key={`empty-${i}`} className="border-b border-black h-6">
                  <td className="border-r-2 border-black"></td>
                  <td className="border-r-2 border-black"></td>
                  <td></td>
                </tr>
              ))}
              <tr className="border-t-2 border-black font-black">
                <td className="p-2 border-r-2 border-black uppercase font-bold text-left flex justify-between items-center">
                  <span>TOTAL OBAT</span>
                  <span className="text-[10px] font-mono font-normal">({printRecord.rincian_obat_detail?.length || 0} Jenis Item)</span>
                </td>
                <td className="p-2 border-r-2 border-black"></td>
                <td className="p-2 text-right font-mono">: {formatRupiah(printRecord.total_biaya)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TANDA TANGAN */}
        <div className="pt-6 text-center font-sans text-xs space-y-12">
          <p className="font-bold">Penanggung Jawab Apotek</p>
          <p className="font-bold underline">( {printRecord.penanggung_jawab_apotek} )</p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 print:hidden">
          <button
            onClick={() => setPrintRecord(null)}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={() => window.print()}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Cetak Lembar Rincian
          </button>
        </div>

      </div>
    </div>
  )}

  {isCopied && (
    <div className="fixed bottom-6 right-6 z-70 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
      <Check className="w-4 h-4 text-emerald-400" /> Ringkasan rincian obat berhasil disalin ke clipboard!
    </div>
  )}

  <KasirFooter />
</div>
  );
}