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
  FileText
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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State Informasi Operator / Petugas Kasir Aktif
  const [petugasInfo, setPetugasInfo] = useState<{ id: string; nama: string; nip: string }>({
    id: '',
    nama: 'Petugas Kasir',
    nip: '-'
  });

  // Ref dan State Canvas Tanda Tangan
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // State Form Input Lengkap
  const [formData, setFormData] = useState({
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
  });

  const [tindakanList, setTindakanList] = useState<{ nama: string; biaya: number }[]>([
    { nama: '', biaya: 0 }
  ]);

  // Load Profil Petugas Login & Riwayat Transaksi
  useEffect(() => {
    async function initOperatorAndData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const { data: prof } = await supabase
            .from('profiles')
            .select('nama_lengkap, nik, nip')
            .eq('id', userId)
            .single();

          setPetugasInfo({
            id: userId,
            nama: prof?.nama_lengkap || session.user.email || 'Petugas Kasir RSUD',
            nip: prof?.nip || prof?.nik || '-'
          });
        }
      } catch (err) {
        console.error('Gagal mengambil data profil petugas:', err);
      }
    }

    initOperatorAndData();
    fetchRiwayat();
  }, []);

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

  // Handler Lukis Canvas Tanda Tangan
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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  // Cek Otomatis Pasien Berulang
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
          text: `Data pasien ditemukan! Nama: ${last.nama_pasien}. Informasi identitas berhasil dimuat otomatis.` 
        });
      }
    } catch (err) {
      console.error('Error cek No. RM:', err);
    } finally {
      setIsSearchingRM(false);
    }
  };

  const handleAddTindakan = () => {
    if (tindakanList.length < 5) {
      setTindakanList([...tindakanList, { nama: '', biaya: 0 }]);
    }
  };

  const handleRemoveTindakan = (index: number) => {
    setTindakanList(tindakanList.filter((_, i) => i !== index));
  };

  const hitungTotal = () => {
    const totalTindakan = tindakanList.reduce((acc, curr) => acc + Number(curr.biaya || 0), 0);
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
      Number(formData.fisioterapi || 0)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const total = hitungTotal();
    const txId = `TX-RJ-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 90)}`;

    // Ambil Gambar TTD Data URI jika ada
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
            fisioterapi: formData.fisioterapi
          }
        })
      };

      const { error } = await supabase.from('transaksi_pasien').insert([payload]);
      if (error) throw new Error(error.message);

      setMessage({ type: 'success', text: `Perincian kunjungan ${txId} (${formData.nama_pasien}) berhasil disimpan!` });
      
      // Reset Form
      setFormData({
        no_rm: '',
        nama_pasien: '',
        nik: '',
        alamat: '',
        umur: '',
        poli_tujuan: '',
        tanggal: new Date().toISOString().split('T')[0],
        jenis_penjaminan: 'UMUM',
        no_kartu_bpjs: '',
        no_sep: '',
        metode_pembayaran: 'Tunai',
        karcis: 10000,
        konsultasi_umum: 25000,
        konsultasi_spesialis: 0,
        apotek: 0,
        lab: 0,
        usg: 0,
        ekg: 0,
        rontgen: 0,
        fisioterapi: 0,
      });
      setTindakanList([{ nama: '', biaya: 0 }]);
      clearCanvas();
      fetchRiwayat();
      setActiveTab('riwayat');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: err.message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <KasirHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Modul Rincian Biaya Pelayanan Rawat Jalan"
        showBackButton={true}
        backUrl="/kasir"
      />

      <main className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24">
        
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/90 border border-slate-200 p-2.5 rounded-2xl shadow-sm backdrop-blur-md gap-3">
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
              Daftar Tagihan Rajal
            </button>
          </div>
          
          <span className="text-xs font-semibold text-slate-500 px-2 hidden md:inline">
            Kabupaten Kerinci
          </span>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-medium border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.text}
          </div>
        )}

        {activeTab === 'form' ? (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-8">
            <div className="border-b border-slate-100 pb-4 text-center space-y-1">
              <h2 className="text-xs font-bold tracking-widest text-emerald-700 uppercase">Pemerintah Kabupaten Kerinci — Dinas Kesehatan</h2>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">RSUD KELAS D BUKIT KERMAN</h1>
              <p className="text-xs font-bold text-slate-600 uppercase">PERINCIAN BIAYA PELAYANAN RAWAT JALAN</p>
            </div>

            {/* BARIS 1: Tanggal Transaksi, Jenis Penjaminan, & Metode Pembayaran */}
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

            {/* BARIS 2: Identitas Pasien & Penjaminan */}
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

              {/* Dinamis Input BPJS & Alamat */}
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

            {/* Tabel Item Rincian Biaya */}
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
                  <tr>
                    <td className="p-3 text-center font-bold text-slate-500">1.</td>
                    <td className="p-3 font-semibold text-slate-800">Karcis Pendaftaran</td>
                    <td className="p-3 text-right">
                      <input 
                        type="number" 
                        value={formData.karcis}
                        onChange={e => setFormData({ ...formData, karcis: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                      />
                    </td>
                  </tr>

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
                        type="number" 
                        value={formData.konsultasi_umum}
                        onChange={e => setFormData({ ...formData, konsultasi_umum: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3"></td>
                    <td className="p-3 pl-6 text-slate-600">b. Dokter Spesialis</td>
                    <td className="p-3 text-right">
                      <input 
                        type="number" 
                        value={formData.konsultasi_spesialis}
                        onChange={e => setFormData({ ...formData, konsultasi_spesialis: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                      />
                    </td>
                  </tr>

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
                          type="number"
                          placeholder="Biaya"
                          value={tindakan.biaya}
                          onChange={e => {
                            const updated = [...tindakanList];
                            updated[idx].biaya = Number(e.target.value);
                            setTindakanList(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}

                  <tr>
                    <td className="p-3 text-center font-bold text-slate-500">4.</td>
                    <td className="p-3 font-semibold text-slate-800">Apotek / Resep Obat Jalan</td>
                    <td className="p-3 text-right">
                      <input 
                        type="number" 
                        value={formData.apotek}
                        onChange={e => setFormData({ ...formData, apotek: Number(e.target.value) })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                      />
                    </td>
                  </tr>

                  <tr className="bg-slate-50/50">
                    <td className="p-3 text-center font-bold text-slate-500">5.</td>
                    <td className="p-3 font-semibold text-slate-800">Penunjang Medik</td>
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
                          type="number" 
                          value={formData[item.key as keyof typeof formData]}
                          onChange={e => setFormData({ ...formData, [item.key]: Number(e.target.value) })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-right font-mono focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}

                  <tr className="bg-emerald-50 border-t-2 border-emerald-500 font-black">
                    <td colSpan={2} className="p-4 text-right text-emerald-900 text-sm uppercase">TOTAL BIAYA RAWAT JALAN:</td>
                    <td className="p-4 text-right text-emerald-800 text-base font-mono">{formatRupiah(hitungTotal())}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SEKSI AKHIR: Identitas Pengguna & Tanda Tangan Digital */}
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

              {/* Pad Tanda Tangan Digital */}
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

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center space-x-2"
            >
              <DollarSign className="w-5 h-5" />
              <span>Simpan Perincian Kunjungan Pasien</span>
            </button>
          </form>
        ) : (
          /* Daftar Riwayat Tagihan */
          <div className="space-y-4">
            <div className="bg-white/90 border border-slate-200 rounded-3xl p-4 shadow-sm backdrop-blur-md flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Daftar Kunjungan &amp; Tagihan Rawat Jalan</h2>
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari No. RM / Nama Pasien..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transactions
                .filter(t => t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) || t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(tx => (
                  <div key={tx.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                          tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {tx.status_bayar === 'lunas' ? 'Sudah Diverifikasi Lunas' : 'Pending Verifikasi Admin'}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-400">{tx.id}</span>
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
                          <p className="text-[10px] text-slate-400 mt-1">
                            Petugas Input: {tx.petugas_input_nama}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                        <span className="text-slate-400 flex items-center space-x-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(tx.tanggal_transaksi).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </span>
                        <span className="text-sm font-black text-slate-900">{formatRupiah(tx.total_biaya)}</span>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        )}

      </main>

      <KasirFooter />
    </div>
  );
}