'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Stethoscope, 
  Plus, 
  Trash2, 
  Search, 
  DollarSign,
  ArrowLeft,
  Calendar,
  CreditCard,
  User,
  Eraser,
  CheckCircle,
  FileText,
  Printer,
  Download,
  CheckSquare,
  Square,
  Calculator,
  ListChecks,
  XCircle,
  Users,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldAlert,
  MessageSquare,
  Receipt,
  Zap,
  Banknote
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface TransaksiRajal {
  id: string;
  no_rm: string;
  nama_pasien: string;
  nik?: string;
  alamat?: string;
  jenis_penjaminan?: string;
  no_kartu_bpjs?: string;
  no_sep?: string;
  metode_pembayaran?: string;
  umur: string;
  poli_tujuan: string;
  tanggal_transaksi: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  catatan_admin?: string;
  petugas_input_nama?: string;
  petugas_input_nip?: string;
  ttd_petugas_url?: string;
  rincian_layanan?: any;
}

export default function KasirRawatJalanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'form' | 'riwayat'>('form');
  const [transactions, setTransactions] = useState<TransaksiRajal[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSearchingRM, setIsSearchingRM] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // State Filter Tambahan
  const [filterPenjaminan, setFilterPenjaminan] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTanggal, setFilterTanggal] = useState<string>('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string; lastTx?: any } | null>(null);

  // State Baru: Kalkulator Kembalian Tunai & Preset Cepat (Penambahan UX/UI)
  const [uangDiterima, setUangDiterima] = useState<number>(0);

  // Operator Active State
  const [petugasInfo, setPetugasInfo] = useState<{ id: string; nama: string; nip: string; role: string }>({
    id: '',
    nama: 'Petugas Kasir',
    nip: '-',
    role: 'kasir'
  });

  // Canvas TTD State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // Form Input Initial State
  const initialFormState = {
    no_rm: '',
    nama_pasien: '',
    nik: '',
    alamat: '',
    umur: '',
    poli_tujuan: '',
    tanggal: new Date().toISOString().split('T')[0],
    jenis_penjaminan: 'UMUM' as 'UMUM' | 'BPJS',
    no_kartu_bpjs: '',
    no_sep: '',
    metode_pembayaran: 'Tunai' as 'Tunai' | 'Online',
    karcis: 10000,
    konsultasi_umum: 25000,
    konsultasi_spesialis: 0,
    apotek: 0,
    lab: 0,
    usg: 0,
    ekg: 0,
    rontgen: 0,
    fisioterapi: 0,
  };

  const [formData, setFormData] = useState(initialFormState);

  // Dynamic Lists
  const [tindakanList, setTindakanList] = useState<{ nama: string; biaya: number }[]>([
    { nama: '', biaya: 0 }
  ]);
  const [penunjangLainnyaList, setPenunjangLainnyaList] = useState<{ nama: string; biaya: number }[]>([]);

  // State Cetak
  const [selectedTxPrint, setSelectedTxPrint] = useState<TransaksiRajal | null>(null);
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [printMode, setPrintMode] = useState<'single' | 'recap' | 'thermal'>('single');

  // Formatting Helpers
  const formatNumberInput = (val: number | string): string => {
    if (val === '' || val === undefined || val === null || val === 0) return '0';
    const num = typeof val === 'number' ? val : parseInt(val.toString().replace(/\D/g, ''), 10);
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  };

  const parseNumberInput = (str: string): number => {
    const cleaned = str.replace(/\D/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  };

  const fetchRiwayat = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transaksi_pasien')
        .select('*')
        .eq('jenis_layanan', 'rawat_jalan')
        .order('tanggal_transaksi', { ascending: false });

      if (!error && data) {
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function initOperatorAndData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const { data: prof } = await supabase
            .from('profiles')
            .select('nama_lengkap, nik, nip, role')
            .eq('id', userId)
            .single();

          setPetugasInfo({
            id: userId,
            nama: prof?.nama_lengkap || session.user.email || 'Petugas Kasir RSUD',
            nip: prof?.nip || prof?.nik || '-',
            role: prof?.role || 'kasir'
          });
        }
      } catch (err) {
        console.error('Gagal mengambil data profil petugas:', err);
      }
    }

    initOperatorAndData();
    fetchRiwayat();

    // Real-time Supabase Subscription untuk Sinkronisasi Live Antar Loket
    const channel = supabase
      .channel('realtime_transaksi_rajal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_pasien' }, () => {
        fetchRiwayat();
      })
      .subscribe();

    // Tambahan Fitur UX: Keyboard Shortcut Ctrl+S untuk Simpan Form Cepat
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const saveBtn = document.getElementById('btn-simpan-transaksi');
        if (saveBtn) (saveBtn as HTMLButtonElement).click();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchRiwayat]);

  // Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Reset Form Otomatis
  const resetForm = () => {
    setFormData(initialFormState);
    setTindakanList([{ nama: '', biaya: 0 }]);
    setPenunjangLainnyaList([]);
    setUangDiterima(0);
    clearCanvas();
  };

  // Cek RM Pasien
  const handleCekNoRM = async (noRM: string) => {
    if (!noRM.trim()) return;
    setIsSearchingRM(true);
    try {
      const { data } = await supabase
        .from('transaksi_pasien')
        .select('nama_pasien, nik, alamat, jenis_penjaminan, no_kartu_bpjs, rincian_layanan')
        .eq('no_rm', noRM.trim())
        .order('tanggal_transaksi', { ascending: false })
        .limit(1);

      if (data && data.length > 0) {
        const last = data[0];
        let parsed = null;
        try {
          parsed = typeof last.rincian_layanan === 'string' ? JSON.parse(last.rincian_layanan) : last.rincian_layanan;
        } catch {
          parsed = null;
        }

        setFormData(prev => ({
          ...prev,
          nama_pasien: last.nama_pasien || prev.nama_pasien,
          nik: last.nik || prev.nik,
          alamat: last.alamat || prev.alamat,
          jenis_penjaminan: (last.jenis_penjaminan as 'UMUM' | 'BPJS') || prev.jenis_penjaminan,
          no_kartu_bpjs: last.no_kartu_bpjs || prev.no_kartu_bpjs,
          umur: parsed?.umur || prev.umur
        }));

        setMessage({ 
          type: 'success', 
          text: `Data RM ${noRM.trim()} (${last.nama_pasien}) ditemukan dan dimuat!` 
        });
      }
    } catch (err) {
      console.error('Error cek No. RM:', err);
    } finally {
      setIsSearchingRM(false);
    }
  };

  // Dynamic Handlers
  const handleAddTindakan = () => {
    if (tindakanList.length < 5) setTindakanList([...tindakanList, { nama: '', biaya: 0 }]);
  };
  const handleRemoveTindakan = (index: number) => {
    setTindakanList(tindakanList.filter((_, i) => i !== index));
  };
  const handleAddPenunjangLainnya = () => {
    setPenunjangLainnyaList([...penunjangLainnyaList, { nama: '', biaya: 0 }]);
  };
  const handleRemovePenunjangLainnya = (index: number) => {
    setPenunjangLainnyaList(penunjangLainnyaList.filter((_, i) => i !== index));
  };

  // Hitung Total Form Input
  const hitungTotal = () => {
    const totalTindakan = tindakanList.reduce((acc, curr) => acc + Number(curr.biaya || 0), 0);
    const totalPenunjangLainnya = penunjangLainnyaList.reduce((acc, curr) => acc + Number(curr.biaya || 0), 0);
     
    return (
      Number(formData.karcis || 0) +
      Number(formData.konsultasi_umum || 0) +
      Number(formData.konsultasi_spesialis || 0) +
      totalTindakan +
      Number(formData.apotek || 0) +
      Number(formData.lab || 0) +
      Number(formData.usg || 0) +
      Number(formData.ekg || 0) +
      Number(formData.rontgen || 0) +
      Number(formData.fisioterapi || 0) +
      totalPenunjangLainnya
    );
  };

  // Fitur Baru: Terapkan Template Paket Layanan Cepat (UX Booster)
  const handleApplyPreset = (jenis: 'umum_standard' | 'spesialis' | 'bpjs_standard') => {
    if (jenis === 'umum_standard') {
      setFormData(prev => ({
        ...prev,
        jenis_penjaminan: 'UMUM',
        karcis: 10000,
        konsultasi_umum: 25000,
        konsultasi_spesialis: 0,
        apotek: 15000,
        lab: 0, usg: 0, ekg: 0, rontgen: 0, fisioterapi: 0
      }));
      setTindakanList([{ nama: 'Pemeriksaan Fisik & Terapi', biaya: 15000 }]);
      setPenunjangLainnyaList([]);
      setMessage({ type: 'success', text: 'Template Paket Poli Umum Standar diterapkan.' });
    } else if (jenis === 'spesialis') {
      setFormData(prev => ({
        ...prev,
        jenis_penjaminan: 'UMUM',
        karcis: 15000,
        konsultasi_umum: 0,
        konsultasi_spesialis: 75000,
        apotek: 35000,
        lab: 50000, usg: 0, ekg: 0, rontgen: 0, fisioterapi: 0
      }));
      setTindakanList([{ nama: 'Konsultasi Spesialis & Resep', biaya: 50000 }]);
      setPenunjangLainnyaList([]);
      setMessage({ type: 'success', text: 'Template Paket Poli Spesialis diterapkan.' });
    } else if (jenis === 'bpjs_standard') {
      setFormData(prev => ({
        ...prev,
        jenis_penjaminan: 'BPJS',
        karcis: 0,
        konsultasi_umum: 0,
        konsultasi_spesialis: 0,
        apotek: 0,
        lab: 0, usg: 0, ekg: 0, rontgen: 0, fisioterapi: 0
      }));
      setTindakanList([{ nama: 'Layanan Pasien BPJS Terintegrasi', biaya: 0 }]);
      setPenunjangLainnyaList([]);
      setMessage({ type: 'success', text: 'Template Standar Pasien BPJS diterapkan (Tanpa Biaya Tunai).' });
    }
  };

  // Filter Multi Kriteria
  const filteredTransactions = transactions.filter(t => {
    const matchSearch = t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchPenjaminan = filterPenjaminan === 'ALL' || t.jenis_penjaminan === filterPenjaminan;
    const matchStatus = filterStatus === 'ALL' || t.status_bayar === filterStatus;
    const matchTanggal = !filterTanggal || t.tanggal_transaksi.startsWith(filterTanggal);

    return matchSearch && matchPenjaminan && matchStatus && matchTanggal;
  });

  const activeFilteredTx = filteredTransactions.filter(t => t.status_bayar !== 'dibatalkan');
  const totalAllFiltered = activeFilteredTx.reduce((acc, curr) => acc + (Number(curr.total_biaya) || 0), 0);
  const totalTunaiFiltered = activeFilteredTx.filter(t => (t.metode_pembayaran || 'Tunai') === 'Tunai').reduce((acc, curr) => acc + (Number(curr.total_biaya) || 0), 0);
  const totalOnlineFiltered = activeFilteredTx.filter(t => t.metode_pembayaran === 'Online').reduce((acc, curr) => acc + (Number(curr.total_biaya) || 0), 0);

  const selectedTransactions = transactions.filter(t => selectedTxIds.includes(t.id));
  const totalSelectedBiaya = selectedTransactions
    .filter(t => t.status_bayar !== 'dibatalkan')
    .reduce((acc, curr) => acc + (Number(curr.total_biaya) || 0), 0);

  const handleToggleSelectTx = (id: string) => {
    setSelectedTxIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleSelectAllTx = () => {
    if (selectedTxIds.length === filteredTransactions.length && filteredTransactions.length > 0) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(filteredTransactions.map(t => t.id));
    }
  };

  // Ubah Status Bayar Langsung (Pemeriksaan Wewenang Role)
  const handleUpdateStatusBayar = async (id: string, statusLama: string) => {
    if (petugasInfo.role !== 'admin' && petugasInfo.role !== 'superadmin' && petugasInfo.role !== 'kepala_kasir') {
      alert('Akses Ditolak: Perubahan status verifikasi tagihan hanya dapat dilakukan oleh Admin / Kepala Kasir.');
      return;
    }

    const nextStatus = statusLama === 'lunas' ? 'pending' : 'lunas';
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: nextStatus })
        .eq('id', id);

      if (error) throw error;
       
      setMessage({ 
        type: 'success', 
        text: `Status tagihan ${id} diperbarui menjadi ${nextStatus.toUpperCase()} oleh Admin!` 
      });
      fetchRiwayat();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Hapus / Pembatalan Transaksi dengan Metode Soft-Delete (Void)
  const handleDeleteTx = async (id: string, namaPasien: string) => {
    if (petugasInfo.role !== 'admin' && petugasInfo.role !== 'superadmin') {
      alert('Akses Ditolak: Penghapusan atau pembatalan transaksi membutuhkan kewenangan Administrator.');
      return;
    }

    const alasan = prompt(`[OTORISASI ADMIN] Masukkan alasan pembatalan (Void) tagihan ${namaPasien} (${id}):`, "Salah input nominal oleh petugas");
    if (alasan === null) return;

    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ 
          status_bayar: 'dibatalkan',
          catatan_admin: alasan.trim() || 'Dibatalkan oleh Admin'
        })
        .eq('id', id);

      if (error) throw error;

      setMessage({ type: 'success', text: `Tagihan ${id} telah dibatalkan (VOID) secara resmi.` });
      fetchRiwayat();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Export Data ke CSV/Excel
  const handleExportCSV = () => {
    const listToExport = selectedTxIds.length > 0 ? selectedTransactions : filteredTransactions;
    if (listToExport.length === 0) return;

    const headers = ['ID Transaksi', 'No RM', 'Nama Pasien', 'NIK', 'Poli Tujuan', 'Penjaminan', 'Metode Bayar', 'Tanggal', 'Total Biaya (Rp)', 'Status', 'Catatan Admin'];
    const rows = listToExport.map(t => [
      t.id,
      t.no_rm,
      `"${t.nama_pasien}"`,
      `"${t.nik || '-'}"`,
      `"${t.poli_tujuan}"`,
      t.jenis_penjaminan || 'UMUM',
      t.metode_pembayaran || 'Tunai',
      new Date(t.tanggal_transaksi).toLocaleDateString('id-ID'),
      t.total_biaya,
      t.status_bayar,
      `"${t.catatan_admin || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Laporan_Kasir_Rajal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const total = hitungTotal();
    const txId = `TX-RJ-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

    let ttdDataUri = '';
    if (canvasRef.current && hasSignature) {
      ttdDataUri = canvasRef.current.toDataURL('image/png');
    }

    try {
      const payload = {
        id: txId,
        no_rm: formData.no_rm,
        nama_pasien: formData.nama_pasien,
        nik: formData.nik,
        alamat: formData.alamat,
        jenis_penjaminan: formData.jenis_penjaminan,
        no_kartu_bpjs: formData.jenis_penjaminan === 'BPJS' ? formData.no_kartu_bpjs : null,
        no_sep: formData.jenis_penjaminan === 'BPJS' ? formData.no_sep : null,
        metode_pembayaran: formData.metode_pembayaran,
        poli_tujuan: formData.poli_tujuan || 'Poli Umum',
        total_biaya: total,
        status_bayar: 'pending',
        jenis_layanan: 'rawat_jalan',
        tanggal_transaksi: new Date(formData.tanggal).toISOString(),
        petugas_input_id: petugasInfo.id || null,
        petugas_input_nama: petugasInfo.nama,
        petugas_input_nip: petugasInfo.nip,
        ttd_petugas_url: ttdDataUri,
        rincian_layanan: JSON.stringify({
          umur: formData.umur,
          tanggal: formData.tanggal,
          karcis: formData.karcis,
          konsultasi_umum: formData.konsultasi_umum,
          konsultasi_spesialis: formData.konsultasi_spesialis,
          tindakan: tindakanList,
          apotek: formData.apotek,
          penunjang: {
            lab: formData.lab,
            usg: formData.usg,
            ekg: formData.ekg,
            rontgen: formData.rontgen,
            fisioterapi: formData.fisioterapi,
            lainnya: penunjangLainnyaList
          }
        })
      };

      const { error } = await supabase.from('transaksi_pasien').insert([payload]);
      if (error) throw new Error(error.message);

      setMessage({ 
        type: 'success', 
        text: `Perincian kunjungan ${txId} (${formData.nama_pasien}) berhasil disimpan!`,
        lastTx: payload 
      });
       
      fetchRiwayat();
      handleCekCetakLangsung(payload);
      resetForm();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCekCetakLangsung = (txData: any) => {
    setPrintMode('single');
    setSelectedTxPrint(txData);
    setTimeout(() => window.print(), 300);
  };

  const handlePrintDocument = (tx: TransaksiRajal) => {
    setPrintMode('single');
    setSelectedTxPrint(tx);
    setTimeout(() => window.print(), 300);
  };

  const handlePrintThermal = (tx: TransaksiRajal) => {
    setPrintMode('thermal');
    setSelectedTxPrint(tx);
    setTimeout(() => window.print(), 300);
  };

  const handlePrintRecap = () => {
    if (selectedTxIds.length === 0) return;
    setPrintMode('recap');
    setTimeout(() => window.print(), 300);
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const formatRupiahTanpaSimbol = (num: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(num);
  };

  const isAdmin = petugasInfo.role === 'admin' || petugasInfo.role === 'superadmin' || petugasInfo.role === 'kepala_kasir';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[140px] pointer-events-none -z-10 print:hidden"></div>
       
      <div className="print:hidden">
        <KasirHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Modul Rincian Biaya Pelayanan Rawat Jalan"
          showBackButton={true}
          backUrl="/kasir"
        />
      </div>

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24 print:p-0 print:m-0 print:max-w-none">
         
        {/* Navigasi Utama */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/90 border border-slate-200 p-2.5 rounded-2xl shadow-sm backdrop-blur-md gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => router.push('/kasir')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Menu Kasir</span>
            </button>
             
            <button
              onClick={() => setActiveTab('form')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'form' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              + Input Perincian Baru
            </button>
             
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'riwayat' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Daftar Tagihan Rajal ({transactions.length})
            </button>
          </div>
           
          <span className="text-xs font-semibold text-slate-500 px-2 hidden md:inline flex items-center space-x-1">
            <span>Akses:</span>
            <strong className="uppercase text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">{petugasInfo.role}</strong>
          </span>
        </div>

        {/* NOTIFIKASI SUCCESS/ERROR & TOMBOL CETAK INSTAN */}
        {message && (
          <div className={`p-4 rounded-2xl text-xs font-medium border shadow-sm print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{message.text}</span>
            </div>
            {message.lastTx && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handlePrintThermal(message.lastTx)}
                  className="px-3 py-2 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1 transition cursor-pointer shadow-md"
                >
                  <Receipt className="w-4 h-4 text-emerald-300" />
                  <span>Cetak Struk Thermal</span>
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintDocument(message.lastTx)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shrink-0 shadow-md"
                >
                  <Printer className="w-4 h-4 text-emerald-400" />
                  <span>Cetak A4 ({message.lastTx.nama_pasien})</span>
                </button>
              </div>
          )}
        </div>

        {/* TAB 1: INPUT FORM MODUL */}
        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-8 print:hidden">
             
            {/* KOP SURAT RESMI */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4 text-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                <img src="/logo-kerinci.png" alt="Logo Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="space-y-0.5 flex-1">
                <h2 className="text-xs font-bold tracking-wider text-emerald-800 uppercase">PEMERINTAH KABUPATEN KERINCI — DINAS KESEHATAN</h2>
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase">RSUD KELAS D BUKIT KERMAN</h1>
                <p className="text-[10px] text-slate-600">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                <p className="text-[10px] text-slate-500 font-mono">Website: https://rsudbukitkerman.kerincikab.go.id | Email: rsubukitkerman@gmail.com</p>
                <div className="pt-1">
                  <span className="inline-block bg-slate-900 text-white font-bold text-[11px] px-3 py-0.5 rounded-full uppercase tracking-wide">
                    PERINCIAN BIAYA PELAYANAN RAWAT JALAN
                  </span>
                </div>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                <img src="/logo-rsud.jpeg" alt="Logo RSUD Bukit Kerman" className="max-h-full max-w-full object-contain" />
              </div>
            </div>

            {/* TAMBAHAN FITUR UX: TOMBOL CEPAT TEMPLATE LAYANAN */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-1.5 text-emerald-900 font-bold">
                <Zap className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Preset Cepat Poli:</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('umum_standard')}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded-xl border border-emerald-300 transition shadow-sm cursor-pointer"
                >
                  Paket Umum Standar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('spesialis')}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded-xl border border-emerald-300 transition shadow-sm cursor-pointer"
                >
                  Paket Poli Spesialis
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('bpjs_standard')}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-600 hover:text-white text-emerald-800 font-bold rounded-xl border border-emerald-300 transition shadow-sm cursor-pointer"
                >
                  Pasien BPJS (0 Rp)
                </button>
              </div>
            </div>

            {/* BARIS 1: Tanggal, Penjaminan & Pembayaran */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-2xl text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Tanggal Kunjungan</span>
                </label>
                <input 
                  type="date" 
                  required
                  value={formData.tanggal}
                  onChange={e => setFormData({ ...formData, tanggal: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-800 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Jenis Penjaminan</label>
                <select 
                  value={formData.jenis_penjaminan}
                  onChange={e => setFormData({ ...formData, jenis_penjaminan: e.target.value as 'UMUM' | 'BPJS' })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-emerald-700 focus:outline-none"
                >
                  <option value="UMUM">UMUM / MANDIRI</option>
                  <option value="BPJS">BPJS KESEHATAN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center space-x-1">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Metode Pembayaran</span>
                </label>
                <select 
                  value={formData.metode_pembayaran}
                  onChange={e => setFormData({ ...formData, metode_pembayaran: e.target.value as 'Tunai' | 'Online' })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="Tunai">Tunai / Cash</option>
                  <option value="Online">Online / Transfer / QRIS</option>
                </select>
              </div>
            </div>

            {/* BARIS 2: Identitas Pasien */}
            <div className="space-y-4 bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center justify-between">
                    <span>No. MR</span>
                    {isSearchingRM && <span className="text-[10px] text-emerald-600">Mencari...</span>}
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: RM-098231"
                    value={formData.no_rm}
                    onChange={e => setFormData({ ...formData, no_rm: e.target.value })}
                    onBlur={e => handleCekNoRM(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nama Pasien</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Nama lengkap pasien"
                    value={formData.nama_pasien}
                    onChange={e => setFormData({ ...formData, nama_pasien: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">NIK Pasien</label>
                  <input 
                    type="text" 
                    placeholder="NIK 16 digit"
                    value={formData.nik}
                    onChange={e => setFormData({ ...formData, nik: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Umur</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: 35 Tahun"
                    value={formData.umur}
                    onChange={e => setFormData({ ...formData, umur: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Poli & BPJS / Alamat */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200/60">
                <div className="space-y-1 sm:col-span-1">
                  <label className="font-bold text-slate-700">Ruang / Poli</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ketik Ruang / Poliklinik..."
                    value={formData.poli_tujuan}
                    onChange={e => setFormData({ ...formData, poli_tujuan: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none"
                  />
                </div>

                {formData.jenis_penjaminan === 'BPJS' ? (
                  <>
                    <div className="space-y-1">
                      <label className="font-bold text-emerald-800">No. Kartu BPJS</label>
                      <input 
                        type="text" 
                        required
                        placeholder="No. BPJS Kesehatan"
                        value={formData.no_kartu_bpjs}
                        onChange={e => setFormData({ ...formData, no_kartu_bpjs: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-medium focus:outline-none font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-emerald-800">No. SEP BPJS</label>
                      <input 
                        type="text" 
                        placeholder="No. Surat Elegibilitas Peserta"
                        value={formData.no_sep}
                        onChange={e => setFormData({ ...formData, no_sep: e.target.value })}
                        className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 font-medium focus:outline-none font-mono"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-slate-700">Alamat Lengkap Pasien</label>
                    <input 
                      type="text" 
                      placeholder="Alamat domisili / Desa Kecamatan"
                      value={formData.alamat}
                      onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {formData.jenis_penjaminan === 'BPJS' && (
                <div className="space-y-1 pt-1">
                  <label className="font-bold text-slate-700">Alamat Lengkap Pasien</label>
                  <input 
                    type="text" 
                    placeholder="Alamat domisili / Desa Kecamatan"
                    value={formData.alamat}
                    onChange={e => setFormData({ ...formData, alamat: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* TABEL ITEM RINCIAN BIAYA */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase font-bold">
                  <tr>
                    <th className="p-3 rounded-l-xl w-12 text-center">NO</th>
                    <th className="p-3">URAIAN BIAYA PELAYANAN</th>
                    <th className="p-3 rounded-r-xl text-right w-48">JUMLAH (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {/* Karcis */}
                  <tr>
                    <td className="p-3 text-center font-bold text-slate-500">1.</td>
                    <td className="p-3 font-semibold text-slate-800">Karcis Pendaftaran</td>
                    <td className="p-3 text-right">
                      <input 
                        type="text" 
                        value={formatNumberInput(formData.karcis)}
                        onChange={e => setFormData({ ...formData, karcis: parseNumberInput(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>

                  {/* Konsultasi */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 text-center font-bold text-slate-500">2.</td>
                    <td className="p-3 font-semibold text-slate-800">Konsultasi Dokter</td>
                    <td className="p-3 text-right text-slate-400 italic">Rincian di bawah</td>
                  </tr>
                  <tr>
                    <td className="p-3"></td>
                    <td className="p-3 pl-6 text-slate-600">a. Dokter Umum</td>
                    <td className="p-3 text-right">
                      <input 
                        type="text" 
                        value={formatNumberInput(formData.konsultasi_umum)}
                        onChange={e => setFormData({ ...formData, konsultasi_umum: parseNumberInput(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3"></td>
                    <td className="p-3 pl-6 text-slate-600">b. Dokter Spesialis</td>
                    <td className="p-3 text-right">
                      <input 
                        type="text" 
                        value={formatNumberInput(formData.konsultasi_spesialis)}
                        onChange={e => setFormData({ ...formData, konsultasi_spesialis: parseNumberInput(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>

                  {/* Tindakan */}
                  <tr className="bg-slate-50/50">
                    <td className="p-3 text-center font-bold text-slate-500">3.</td>
                    <td className="p-3 font-semibold text-slate-800 flex items-center justify-between">
                      <span>Tindakan Medis (Maks. 5)</span>
                      {tindakanList.length < 5 && (
                        <button type="button" onClick={handleAddTindakan} className="text-emerald-600 font-bold hover:underline flex items-center space-x-1">
                          <Plus className="w-3.5 h-3.5" /> <span>Tambah Tindakan</span>
                        </button>
                      )}
                    </td>
                    <td></td>
                  </tr>
                  {tindakanList.map((tindakan, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-center text-slate-400 font-mono">3.{idx+1}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="text"
                            placeholder={`Nama Tindakan ${idx+1}`}
                            value={tindakan.nama}
                            onChange={e => {
                              const updated = [...tindakanList];
                              updated[idx].nama = e.target.value;
                              setTindakanList(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium focus:outline-none"
                        />
                        {tindakanList.length > 1 && (
                          <button type="button" onClick={() => handleRemoveTindakan(idx)} className="text-rose-500 hover:text-rose-700 p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <input 
                        type="text"
                        placeholder="Biaya"
                        value={formatNumberInput(tindakan.biaya)}
                        onChange={e => {
                          const updated = [...tindakanList];
                          updated[idx].biaya = parseNumberInput(e.target.value);
                          setTindakanList(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {/* Apotek */}
                <tr>
                  <td className="p-3 text-center font-bold text-slate-500">4.</td>
                  <td className="p-3 font-semibold text-slate-800">Apotek / Resep Obat Jalan</td>
                  <td className="p-3 text-right">
                    <input 
                      type="text" 
                      value={formatNumberInput(formData.apotek)}
                      onChange={e => setFormData({ ...formData, apotek: parseNumberInput(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                    />
                  </td>
                </tr>

                {/* Penunjang Medik */}
                <tr className="bg-slate-50/50">
                  <td className="p-3 text-center font-bold text-slate-500">5.</td>
                  <td className="p-3 font-semibold text-slate-800 flex items-center justify-between">
                    <span>Penunjang Medik</span>
                    <button 
                      type="button" 
                      onClick={handleAddPenunjangLainnya} 
                      className="text-emerald-600 font-bold hover:underline flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> <span>Tambah Penunjang Lainnya</span>
                    </button>
                  </td>
                  <td className="p-3 text-right text-slate-400 italic">Rincian di bawah</td>
                </tr>
                {[
                  { key: 'lab', label: '1. Laboratorium' },
                  { key: 'usg', label: '2. USG' },
                  { key: 'ekg', label: '3. EKG' },
                  { key: 'rontgen', label: '4. Rontgen' },
                  { key: 'fisioterapi', label: '5. Fisiotherapy' },
                ].map((item) => (
                  <tr key={item.key}>
                    <td></td>
                    <td className="p-2 pl-6 text-slate-600">{item.label}</td>
                    <td className="p-2 text-right">
                      <input 
                        type="text" 
                        value={formatNumberInput(formData[item.key as keyof typeof formData])}
                        onChange={e => setFormData({ ...formData, [item.key]: parseNumberInput(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {/* Dynamic Penunjang Lainnya */}
                {penunjangLainnyaList.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 text-center text-slate-400 font-mono">5.{idx + 6}</td>
                    <td className="p-2 pl-6">
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          placeholder={`Nama Penunjang Lainnya ${idx + 6}`}
                          value={item.nama}
                          onChange={e => {
                            const updated = [...penunjangLainnyaList];
                            updated[idx].nama = e.target.value;
                            setPenunjangLainnyaList(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium focus:outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => handleRemovePenunjangLainnya(idx)} 
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-2 text-right">
                      <input 
                        type="text"
                        placeholder="Biaya"
                        value={formatNumberInput(item.biaya)}
                        onChange={e => {
                          const updated = [...penunjangLainnyaList];
                          updated[idx].biaya = parseNumberInput(e.target.value);
                          setPenunjangLainnyaList(updated);
                        }}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono font-bold focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}

                {/* TOTAL & KALKULATOR KEMBALIAN TUNAI BARU */}
                <tr className="bg-emerald-50 border-t-2 border-emerald-500 font-black">
                  <td colSpan={2} className="p-4 text-right text-emerald-900 text-sm uppercase">TOTAL BIAYA RAWAT JALAN:</td>
                  <td className="p-4 text-right text-emerald-800 text-base font-mono">{formatRupiah(hitungTotal())}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* TAMBAHAN FITUR UX: KALKULATOR UANG DITERIMA & KEMBALIAN */}
          <div className="bg-emerald-900 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-2">
              <Banknote className="w-5 h-5 text-emerald-300" />
              <div>
                <span className="font-bold uppercase tracking-wider">Kalkulator Kasir Tunai</span>
                <p className="text-[10px] text-slate-300">Masukkan uang tunai dari pasien untuk menghitung kembalian otomatis</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="space-y-1 flex-1">
                <label className="text-[10px] text-emerald-200 font-semibold">Uang Tunai Diterima (Rp)</label>
                <input
                  type="text"
                  value={formatNumberInput(uangDiterima)}
                  onChange={e => setUangDiterima(parseNumberInput(e.target.value))}
                  placeholder="0"
                  className="bg-emerald-950 border border-emerald-700 text-white rounded-xl px-3 py-2 text-right font-mono font-bold w-36 sm:w-44 focus:outline-none"
                />
              </div>
              <div className="space-y-1 flex-1">
                <label className="text-[10px] text-emerald-200 font-semibold">Uang Kembalian</label>
                <div className="bg-emerald-950 border border-emerald-700 text-emerald-300 rounded-xl px-3 py-2 text-right font-mono font-bold text-sm">
                  {uangDiterima >= hitungTotal() ? formatRupiah(uangDiterima - hitungTotal()) : 'Rp 0'}
                </div>
              </div>
            </div>
          </div>

          {/* SEKSI AKHIR: Operator & TTD */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-slate-200/80 p-6 rounded-2xl text-xs">
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-slate-800 font-bold border-b border-slate-200 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>Petugas Penginput Data (Penanggung Jawab)</span>
              </div>
              <div className="space-y-1.5 font-medium text-slate-700">
                <p><span className="text-slate-400">Nama Petugas:</span> <strong className="text-slate-900">{petugasInfo.nama}</strong></p>
                <p><span className="text-slate-400 font-mono">NIP / ID:</span> <strong className="font-mono text-slate-900">{petugasInfo.nip}</strong></p>
                <p><span className="text-slate-400">Status Akses:</span> <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold text-[10px]">VERIFIED KASIR</span></p>
              </div>
            </div>

            {/* Pad TTD */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-800">Tanda Tangan Petugas Penginput</span>
                <button 
                  type="button" 
                  onClick={clearCanvas}
                  className="text-[10px] text-rose-600 font-bold hover:underline flex items-center space-x-1"
                >
                  <Eraser className="w-3 h-3" />
                  <span>Bersihkan TTD</span>
                </button>
              </div>
             
              <div className="border-2 border-dashed border-slate-300 rounded-xl bg-white overflow-hidden relative">
                <canvas 
                  ref={canvasRef}
                  width={380}
                  height={110}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-28 cursor-crosshair touch-none"
                />
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-300 text-[11px] font-medium">
                    Goreskan tanda tangan petugas di sini
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-3.5 rounded-2xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Form</span>
            </button>
             
            <button
              id="btn-simpan-transaksi"
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>Simpan &amp; Cetak Perincian Pasien Ini (Ctrl+S)</span>
            </button>
          </div>
        </form>
        ) : (
          /* TAB 2: DAFTAR RIWAYAT TAGIHAN */
          <div className="space-y-6 print:hidden">
              
            {/* WIDGET AKUMULASI DENGAN REKONSILIASI KEUANGAN */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-3xl shadow-lg border border-slate-700 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Total Sesuai Filter ({activeFilteredTx.length} Pasien)</span>
                  </span>
                  <p className="text-xl font-black font-mono text-emerald-400 tracking-tight">
                    {formatRupiah(totalAllFiltered)}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Rincian aktif kasir
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-700 to-teal-800 text-white p-5 rounded-3xl shadow-lg border border-emerald-600 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-emerald-100 uppercase flex items-center space-x-1.5">
                    <CreditCard className="w-4 h-4 text-white" />
                    <span>Penerimaan Tunai / Cash</span>
                  </span>
                  <p className="text-xl font-black font-mono text-white tracking-tight">
                    {formatRupiah(totalTunaiFiltered)}
                  </p>
                  <p className="text-[10px] text-emerald-100">Fisik kasir di laci</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-teal-800 to-cyan-900 text-white p-5 rounded-3xl shadow-lg border border-teal-700 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold tracking-wider text-teal-200 uppercase flex items-center space-x-1.5">
                    <DollarSign className="w-4 h-4 text-cyan-300" />
                    <span>Penerimaan Online / QRIS</span>
                  </span>
                  <p className="text-xl font-black font-mono text-cyan-300 tracking-tight">
                    {formatRupiah(totalOnlineFiltered)}
                  </p>
                  <p className="text-[10px] text-teal-200">Transfer / Rekening RSUD</p>
                </div>
              </div>
            </div>

            {/* CONTROL PANEL & FILTER MULTI KRITERIA */}
            <div className="bg-white/90 border border-slate-200 rounded-3xl p-4 shadow-sm backdrop-blur-md space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllTx}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center space-x-2 cursor-pointer border border-slate-300"
                >
                    {selectedTxIds.length > 0 && selectedTxIds.length === filteredTransactions.length ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>
                      {selectedTxIds.length > 0 && selectedTxIds.length === filteredTransactions.length
                        ? 'Batal Pilih Semua'
                        : `Pilih Semua (${filteredTransactions.length})`}
                    </span>
                </button>

                {selectedTxIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTxIds([])}
                      className="text-xs text-rose-600 font-bold hover:underline flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Bersihkan Pilihan</span>
                    </button>
                )}
              </div>

              {/* Tombol Ekspor Excel/CSV */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition flex items-center space-x-2 cursor-pointer shrink-0"
            >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel ({selectedTxIds.length > 0 ? selectedTxIds.length : filteredTransactions.length})</span>
            </button>
            </div>

            {/* Baris Filter Input */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              <div className="relative sm:col-span-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari RM / Nama Pasien..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 w-full focus:outline-none"
                >
                    <option value="ALL">Semua Status Bayar</option>
                    <option value="pending">Pending</option>
                    <option value="lunas">Lunas</option>
                    <option value="dibatalkan">Dibatalkan (Void)</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <select
                    value={filterPenjaminan}
                    onChange={e => setFilterPenjaminan(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 w-full focus:outline-none"
                >
                    <option value="ALL">Semua Penjaminan</option>
                    <option value="UMUM">UMUM / MANDIRI</option>
                    <option value="BPJS">BPJS KESEHATAN</option>
                </select>
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                    type="date"
                    value={filterTanggal}
                    onChange={e => setFilterTanggal(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-slate-700 w-full focus:outline-none"
                />
                {filterTanggal && (
                    <button type="button" onClick={() => setFilterTanggal('')} className="text-slate-400 hover:text-slate-600 text-xs font-bold">×</button>
                )}
              </div>
            </div>
          </div>

          {/* KARTU TRANSAKSI PASIEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTransactions.map(tx => {
              const isSelected = selectedTxIds.includes(tx.id);
              const isLunas = tx.status_bayar === 'lunas';
              const isDibatalkan = tx.status_bayar === 'dibatalkan';

              return (
                <div 
                  key={tx.id} 
                  className={`bg-white border rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between transition ${
                    isDibatalkan 
                      ? 'border-rose-200 bg-rose-50/30'
                      : isSelected 
                        ? 'border-2 border-emerald-500 bg-emerald-50/20 shadow-md' 
                        : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectTx(tx.id)}
                          className="text-left cursor-pointer group"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 group-hover:text-slate-400 flex-shrink-0" />
                          )}
                        </button>

                        {/* Tombol Status Pembayaran dengan Proteksi Role Admin */}
                        {isDibatalkan ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase bg-rose-100 text-rose-800 border border-rose-300 flex items-center space-x-1">
                            <ShieldAlert className="w-3 h-3 text-rose-600" />
                            <span>DIBATALKAN (VOID)</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatusBayar(tx.id, tx.status_bayar);
                            }}
                            title={isAdmin ? "Klik untuk mengubah status pembayaran" : "Hanya Admin yang dapat mengubah status"}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase flex items-center space-x-1 transition ${
                              isAdmin ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'
                            } ${
                              isLunas ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-300 hover:bg-amber-200'
                            }`}
                          >
                            {isLunas ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                            <span>{isLunas ? 'LUNAS' : 'PENDING'}</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[11px] font-mono font-bold text-slate-400">{tx.id}</span>
                         
                        {isAdmin && !isDibatalkan && (
                          <button 
                            type="button" 
                            onClick={() => handleDeleteTx(tx.id, tx.nama_pasien)}
                            className="text-slate-300 hover:text-rose-600 transition p-1"
                            title="Batalkan / Void Transaksi Ini (Khusus Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{tx.nama_pasien}</h3>
                      <p className="text-xs text-emerald-700 font-mono font-semibold">
                        No. RM: {tx.no_rm} | Poli: {tx.poli_tujuan}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Penjaminan: <strong>{tx.jenis_penjaminan || 'UMUM'}</strong> ({tx.metode_pembayaran || 'Tunai'})
                      </p>
                      {tx.petugas_input_nama && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Petugas Input: {tx.petugas_input_nama}
                        </p>
                      )}
                    </div>

                    {/* MENAMPILKAN CATATAN PEMBATALAN ADMIN JIKA DIBATALKAN */}
                    {isDibatalkan && tx.catatan_admin && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-2.5 text-xs text-rose-800 space-y-1">
                        <span className="font-bold flex items-center gap-1 text-[10px]">
                          <MessageSquare className="w-3.5 h-3.5 text-rose-600" />
                          Alasan Pembatalan:
                        </span>
                        <p className="italic text-[11px] font-medium">{tx.catatan_admin}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                      <span className="text-slate-400 flex items-center space-x-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(tx.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </span>
                      <span className={`text-sm font-black font-mono ${isDibatalkan ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {formatRupiah(tx.total_biaya)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handlePrintThermal(tx)}
                      disabled={isDibatalkan}
                      className={`px-3 font-bold py-2 rounded-xl text-xs flex items-center justify-center transition ${
                        isDibatalkan ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer'
                      }`}
                      title="Cetak Struk Thermal"
                    >
                      <Receipt className="w-4 h-4 text-emerald-200" />
                    </button>
                    <button
                      onClick={() => handlePrintDocument(tx)}
                      disabled={isDibatalkan}
                      className={`flex-1 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition ${
                        isDibatalkan 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      }`}
                    >
                      <Printer className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cetak A4 ({tx.nama_pasien})</span>
                    </button>
                  </div>
              </div>
            );
          })}
        </div>

        {/* FLOATING ACTION BAR */}
        {selectedTxIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-3xl shadow-2xl border border-slate-700 flex items-center justify-between gap-6 z-50 w-11/12 max-w-2xl backdrop-blur-lg">
            <div>
              <p className="text-xs text-slate-400">{selectedTxIds.length} Pasien Terpilih</p>
              <p className="text-base font-black text-emerald-400 font-mono">{formatRupiah(totalSelectedBiaya)}</p>
            </div>
              
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrintRecap}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-bold text-xs flex items-center space-x-2 transition cursor-pointer shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekapitulasi Selected ({selectedTxIds.length})</span>
              </button>
            </div>
          </div>
        )}

        </div>
      )}

    </main>

    {/* CETAK INDIVIDU PASIEN (OPTIMALISASI 1 LEMBAR & TTD) */}
    {printMode === 'single' && (
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:m-0 print:p-2 font-serif text-[10pt] leading-tight">
        {selectedTxPrint ? (() => {
          let rincian: any = {};
          try {
            rincian = typeof selectedTxPrint.rincian_layanan === 'string' ? JSON.parse(selectedTxPrint.rincian_layanan) : selectedTxPrint.rincian_layanan;
          } catch {
            rincian = {};
          }

          const tindakanArr: any[] = rincian?.tindakan || [];
          const penunjangObj: any = rincian?.penunjang || {};
          const penunjangLainnya: any[] = penunjangObj?.lainnya || [];

          return (
            <div className="max-w-2xl mx-auto space-y-3">
              <div className="border-b-4 border-double border-black pb-1.5 flex items-center justify-between gap-4">
                <div className="w-14 h-14 flex-shrink-0">
                  <img src="/logo-kerinci.png" alt="Logo Kerinci" className="w-full h-full object-contain" />
                </div>
                <div className="text-center flex-1 space-y-0.5">
                  <h3 className="text-[10pt] font-bold tracking-wide">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-[10pt] font-bold tracking-wide">DINAS KESEHATAN</h2>
                  <h1 className="text-xs font-black uppercase">RSUD KELAS D BUKIT KERMAN</h1>
                  <p className="text-[8pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[7pt]">Website : https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-14 h-14 flex-shrink-0">
                  <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-full h-full object-contain" />
                </div>
              </div>

              <div className="text-center font-bold py-0.5">
                <p className="underline tracking-wider uppercase text-xs">PERINCIAN BIAYA PELAYANAN RAWAT JALAN</p>
              </div>

              <div className="text-[10pt] space-y-0.5 font-mono font-bold w-full max-w-md">
                <div className="grid grid-cols-12">
                  <span className="col-span-3">NAMA</span>
                  <span className="col-span-9">: {selectedTxPrint.nama_pasien}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3">NO.MR</span>
                  <span className="col-span-9">: {selectedTxPrint.no_rm}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3">UMUR</span>
                  <span className="col-span-9">: {rincian?.umur || '-'}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3">RUANG/POLI</span>
                  <span className="col-span-9">: {selectedTxPrint.poli_tujuan}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-3">TANGGAL</span>
                  <span className="col-span-9">: {new Date(selectedTxPrint.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-[10pt]">
                <thead>
                  <tr className="border-b border-black bg-slate-100 font-bold">
                    <th className="border-r border-black p-1 w-8 text-center">NO</th>
                    <th className="border-r border-black p-1 text-left">URAIAN BIAYA</th>
                    <th className="p-1 w-36 text-right">JUMLAH (RP)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black font-sans">
                  <tr>
                    <td className="border-r border-black p-0.5 text-center font-bold">1.</td>
                    <td className="border-r border-black p-0.5 font-semibold">Karcis</td>
                    <td className="p-0.5 text-right font-mono font-bold">{formatRupiahTanpaSimbol(rincian?.karcis)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5 text-center font-bold">2.</td>
                    <td className="border-r border-black p-0.5 font-semibold">Konsultasi</td>
                    <td className="border-r border-black p-0.5"></td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">a. Dokter Umum</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(rincian?.konsultasi_umum)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">b. Dokter Spesialis</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(rincian?.konsultasi_spesialis)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5 text-center font-bold">3.</td>
                    <td className="border-r border-black p-0.5 font-semibold">Tindakan</td>
                    <td className="border-r border-black p-0.5"></td>
                  </tr>
                  {tindakanArr.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="border-r border-black p-0.5"></td>
                      <td className="border-r border-black p-0.5 pl-4">{i + 1}. {item?.nama || `Tindakan ${i+1}`}</td>
                      <td className="p-0.5 text-right font-mono">{item?.biaya ? formatRupiahTanpaSimbol(item.biaya) : '0'}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border-r border-black p-0.5 text-center font-bold">4.</td>
                    <td className="border-r border-black p-0.5 font-semibold">Apotek</td>
                    <td className="p-0.5 text-right font-mono font-bold">{formatRupiahTanpaSimbol(rincian?.apotek)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5 text-center font-bold">5.</td>
                    <td className="border-r border-black p-0.5 font-semibold">Penunjang Medik</td>
                    <td className="border-r border-black p-0.5"></td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">1. Laboratorium</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.lab)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">2. USG</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.usg)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">3. EKG</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.ekg)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">4. Rontgen</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.rontgen)}</td>
                  </tr>
                  <tr>
                    <td className="border-r border-black p-0.5"></td>
                    <td className="border-r border-black p-0.5 pl-4">5. Fisiotherapy</td>
                    <td className="p-0.5 text-right font-mono">{formatRupiahTanpaSimbol(penunjangObj?.fisioterapi)}</td>
                  </tr>
                  {penunjangLainnya.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="border-r border-black p-0.5"></td>
                      <td className="border-r border-black p-0.5 pl-4">{idx + 6}. {item?.nama || ''}</td>
                      <td className="p-0.5 text-right font-mono">{item?.biaya ? formatRupiahTanpaSimbol(item.biaya) : ''}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-black">
                    <td colSpan={2} className="border-r border-black p-1 text-right uppercase">TOTAL</td>
                    <td className="p-1 text-right font-mono text-xs">{formatRupiahTanpaSimbol(selectedTxPrint.total_biaya)}</td>
                  </tr>
                </tbody>
              </table>

              {/* TANDA TANGAN */}
              <div className="grid grid-cols-2 text-center text-[10pt] pt-3">
                <div className="space-y-10">
                  <p className="font-bold">Dokter Poli Klinik</p>
                  <p className="font-bold">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
                </div>
                <div className="space-y-1">
                  <p className="font-bold">Penanggung Jawab</p>
                  {selectedTxPrint.ttd_petugas_url ? (
                    <div className="h-12 flex items-center justify-center">
                      <img src={selectedTxPrint.ttd_petugas_url} alt="TTD Petugas" className="max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="h-12"></div>
                  )}
                  <p className="font-bold">( {selectedTxPrint.petugas_input_nama || petugasInfo.nama} )</p>
                </div>
              </div>
            </div>
          );
        })() : null}
    </div>
  )}

  {/* CETAK STRUK THERMAL (58mm / 80mm) */}
  {printMode === 'thermal' && (
    <div className="hidden print:block print:w-[80mm] print:bg-white print:text-black print:m-0 print:p-2 font-mono text-[9pt] leading-tight">
      {selectedTxPrint ? (() => {
        let rincian: any = {};
        try {
          rincian = typeof selectedTxPrint.rincian_layanan === 'string' ? JSON.parse(selectedTxPrint.rincian_layanan) : selectedTxPrint.rincian_layanan;
        } catch {
          rincian = {};
        }

        return (
          <div className="space-y-2 text-center">
            <div>
              <h2 className="font-bold text-xs uppercase">RSUD BUKIT KERMAN</h2>
              <p className="text-[7pt]">Kabupaten Kerinci, Jambi</p>
              <p className="text-[7pt]">STRUK PEMBAYARAN RAWAT JALAN</p>
            </div>
            <div className="border-b border-dashed border-black pb-1 text-left text-[8pt]">
              <p>ID: {selectedTxPrint.id}</p>
              <p>Tgl: {new Date(selectedTxPrint.tanggal_transaksi).toLocaleDateString('id-ID')}</p>
              <p>No RM: {selectedTxPrint.no_rm}</p>
              <p>Nama: {selectedTxPrint.nama_pasien}</p>
              <p>Poli: {selectedTxPrint.poli_tujuan}</p>
            </div>
            <div className="text-left text-[8pt] space-y-0.5 border-b border-dashed border-black pb-1">
              <div className="flex justify-between"><span>Karcis:</span><span>{formatRupiahTanpaSimbol(rincian?.karcis)}</span></div>
              <div className="flex justify-between"><span>Konsultasi:</span><span>{formatRupiahTanpaSimbol(Number(rincian?.konsultasi_umum || 0) + Number(rincian?.konsultasi_spesialis || 0))}</span></div>
              <div className="flex justify-between"><span>Apotek:</span><span>{formatRupiahTanpaSimbol(rincian?.apotek)}</span></div>
            </div>
            <div className="flex justify-between font-bold text-xs pt-1">
              <span>TOTAL:</span>
              <span>{formatRupiahTanpaSimbol(selectedTxPrint.total_biaya)}</span>
            </div>
            <div className="pt-2 text-[7pt]">
              <p>Metode: {selectedTxPrint.metode_pembayaran || 'Tunai'}</p>
              <p>Kasir: {selectedTxPrint.petugas_input_nama || petugasInfo.nama}</p>
              <p className="pt-2">Terima kasih atas kunjungan Anda</p>
            </div>
          </div>
        );
      })() : null}
    </div>
  )}

  {/* CETAK REKAPITULASI BIAYA MULTI PASIEN */}
  {printMode === 'recap' && (
    <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-0 font-serif text-[10pt] leading-snug">
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <div className="border-b-4 border-double border-black pb-2 flex items-center justify-between gap-4">
          <div className="w-16 h-16 flex-shrink-0">
            <img src="/logo-kerinci.png" alt="Logo Kerinci" className="w-full h-full object-contain" />
          </div>
          <div className="text-center flex-1 space-y-0.5">
            <h3 className="text-xs font-bold tracking-wide">PEMERINTAH KABUPATEN KERINCI</h3>
            <h2 className="text-sm font-bold tracking-wide">DINAS KESEHATAN</h2>
            <h1 className="text-base font-black uppercase">RSUD KELAS D BUKIT KERMAN</h1>
            <p className="text-[9pt]">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
            <p className="text-[8pt]">Website : https://rsudbukitkerman.kerincikab.go.id &nbsp;&nbsp; e-mail: rsubukitkerman@gmail.com</p>
          </div>
          <div className="w-16 h-16 flex-shrink-0">
            <img src="/logo-rsud.jpeg" alt="Logo RSUD" className="w-full h-full object-contain" />
          </div>
        </div>

        <div className="text-center font-bold py-2">
          <p className="underline tracking-wider uppercase text-sm">LAPORAN REKAPITULASI BIAYA PELAYANAN RAWAT JALAN</p>
          <p className="text-xs font-normal font-mono">Dicetak Tanggal: {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="border-b border-black bg-slate-100 font-bold">
              <th className="border-r border-black p-2 text-center w-8">NO</th>
              <th className="border-r border-black p-2 text-left">NO. TRANSACTION / RM</th>
              <th className="border-r border-black p-2 text-left">NAMA PASIEN</th>
              <th className="border-r border-black p-2 text-left">POLIKLINIK</th>
              <th className="border-r border-black p-2 text-center">PENJAMINAN</th>
              <th className="p-2 text-right">TOTAL (RP)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black font-sans">
            {selectedTransactions.map((tx, idx) => (
              <tr key={tx.id} className={tx.status_bayar === 'dibatalkan' ? 'line-through text-slate-400' : ''}>
                <td className="border-r border-black p-2 text-center font-mono">{idx + 1}</td>
                <td className="border-r border-black p-2 font-mono">
                  <div>{tx.id}</div>
                  <div className="text-[9pt] font-bold">RM: {tx.no_rm}</div>
                </td>
                <td className="border-r border-black p-2 font-bold">{tx.nama_pasien}</td>
                <td className="border-r border-black p-2">{tx.poli_tujuan}</td>
                <td className="border-r border-black p-2 text-center">{tx.jenis_penjaminan || 'UMUM'}</td>
                <td className="p-2 text-right font-mono font-bold">
                  {tx.status_bayar === 'dibatalkan' ? '0 (VOID)' : formatRupiahTanpaSimbol(tx.total_biaya)}
                </td>
              </tr>
            ))}
            <tr className="font-bold border-t-2 border-black bg-slate-50">
              <td colSpan={5} className="border-r border-black p-2 text-right uppercase">GRAND TOTAL ({selectedTransactions.length} PASIEN):</td>
              <td className="p-2 text-right font-mono text-sm">{formatRupiahTanpaSimbol(totalSelectedBiaya)}</td>
            </tr>
          </tbody>
        </table>

        <div className="grid grid-cols-2 text-center text-xs pt-8">
          <div className="space-y-16">
            <p className="font-bold">Mengetahui,<br/>Kepala Ruangan Kasir</p>
            <p className="font-bold">( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
          </div>
          <div className="space-y-16">
            <p className="font-bold">Petugas Kasir Rawat Jalan</p>
            <p className="font-bold">( {petugasInfo.nama} )</p>
          </div>
        </div>
      </div>
    </div>
  )}

  <div className="print:hidden">
    <KasirFooter />
  </div>
</div>
  );
}