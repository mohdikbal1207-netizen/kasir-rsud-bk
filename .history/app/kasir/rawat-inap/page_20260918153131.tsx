'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Plus, Trash2, ShieldCheck, Eraser, UserCheck 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface BillingItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  tarif: number;
  ditanggung: number;
}

const CATEGORIES = [
  'I. RUANGAN PERAWATAN / BAGIAN',
  'II. MAKAN',
  'III. VISIT',
  'IV. OBAT-OBATAN',
  'V. OPERASI',
  'VI. PENUNJANG MEDIK',
  'VII. LAIN LAIN'
];

export default function InputRawatInapPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);

  // Ref Canvas Tanda Tangan Digital
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);

  // State Identitas Pasien, Penjaminan & Penandatangan
  const [patientData, setPatientData] = useState({
    noReg: 'REG-RANAP-2026-001',
    jenisPenjaminan: 'UMUM / MANDIRI',
    metodePembayaran: 'Tunai / Cash',
    namaPasien: '',
    nikPasien: '',
    umur: '',
    alamat: '',
    diagnosa: '',
    ruangPerawatan: 'VIP Melati',
    noBpjs: '',
    noSep: '',
    masukTgl: '',
    keluarTgl: '',
    dokterMerawat: '',
    kepalaRuangan: '',
    bendahara: 'Memuat data petugas...',
    petugasEmail: '',
    signatureBase64: ''
  });

  // MURNI Ambil Nama Akun Login yang Sedang Aktif dari Supabase
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Priority 1: Metadata Auth (full_name / name / display_name)
          let fullName = 
            user.user_metadata?.full_name || 
            user.user_metadata?.nama_lengkap ||
            user.user_metadata?.name ||
            user.user_metadata?.display_name;

          // Priority 2: Cek Tabel Profiles Supabase jika ada
          if (!fullName) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, nama_lengkap, name')
              .eq('id', user.id)
              .maybeSingle();
            
            if (profile) {
              fullName = profile.nama_lengkap || profile.full_name || profile.name;
            }
          }

          // Priority 3: Ambil dari prefix Email jika metadata kosong
          if (!fullName) {
            fullName = user.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').toUpperCase() : 'PETUGAS KASIR';
          }

          setPatientData(prev => ({
            ...prev,
            bendahara: fullName,
            petugasEmail: user.email || ''
          }));
        } else {
          setPatientData(prev => ({
            ...prev,
            bendahara: 'SAMPEL KASIR'
          }));
        }
      } catch (err) {
        console.error('Gagal mengambil data akun login:', err);
      }
    };

    fetchCurrentUser();
  }, []);

  // Logika Tanda Tangan Canvas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
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

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const canvas = canvasRef.current;
      if (canvas) {
        setPatientData(prev => ({
          ...prev,
          signatureBase64: canvas.toDataURL()
        }));
      }
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setPatientData(prev => ({ ...prev, signatureBase64: '' }));
  };

  // Preset Cepat Penjaminan
  const handleApplyPreset = (type: 'umum' | 'bpjs') => {
    if (type === 'bpjs') {
      setPatientData(prev => ({
        ...prev,
        jenisPenjaminan: 'BPJS KESEHATAN',
        metodePembayaran: 'Non-Tunai / Penjaminan'
      }));
    } else {
      setPatientData(prev => ({
        ...prev,
        jenisPenjaminan: 'UMUM / MANDIRI',
        metodePembayaran: 'Tunai / Cash'
      }));
    }
  };

  // State Daftar Rincian Biaya
  const [billingItems, setBillingItems] = useState<BillingItem[]>([
    { id: '1', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Super VIP', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '2', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'VIP', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '3', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas Utama', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '4', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas III', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '5', kategori: 'II. MAKAN', uraian: 'Makan Pasien Ranap', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '6', kategori: 'III. VISIT', uraian: '1. Visit Dokter Spesialis', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '7', kategori: 'III. VISIT', uraian: '2. Visit / Visite Lainnya', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '8', kategori: 'IV. OBAT-OBATAN', uraian: 'a. Injeksi & Infus', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '9', kategori: 'IV. OBAT-OBATAN', uraian: 'b. Tablet / Oral', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '10', kategori: 'V. OPERASI', uraian: '1. Operasi Kecil', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '11', kategori: 'V. OPERASI', uraian: '2. Operasi Sedang', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '12', kategori: 'V. OPERASI', uraian: '3. Operasi Besar', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '13', kategori: 'V. OPERASI', uraian: '4. Curratage', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '14', kategori: 'V. OPERASI', uraian: '5. Partus Normal', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '15', kategori: 'V. OPERASI', uraian: '6. Partus Sulit', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '16', kategori: 'V. OPERASI', uraian: '7. Lainnya - a', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '17', kategori: 'V. OPERASI', uraian: '7. Lainnya - b', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '18', kategori: 'V. OPERASI', uraian: '7. Lainnya - c', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '19', kategori: 'VI. PENUNJANG MEDIK', uraian: 'a. Laboratorium', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '20', kategori: 'VI. PENUNJANG MEDIK', uraian: 'b. Pemeriksaan Penunjang b', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '21', kategori: 'VI. PENUNJANG MEDIK', uraian: 'c. Pemeriksaan Penunjang c', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '22', kategori: 'VI. PENUNJANG MEDIK', uraian: 'd. USG', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '23', kategori: 'VI. PENUNJANG MEDIK', uraian: 'e. EKG', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '24', kategori: 'VI. PENUNJANG MEDIK', uraian: 'f. Rontgen', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '25', kategori: 'VII. LAIN LAIN', uraian: 'a. Visite Apoteker', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '26', kategori: 'VII. LAIN LAIN', uraian: 'b. Konsultasi Gizi', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '27', kategori: 'VII. LAIN LAIN', uraian: 'c. Ambulance', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '28', kategori: 'VII. LAIN LAIN', uraian: 'd. ADM', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '29', kategori: 'VII. LAIN LAIN', uraian: 'e. Tindakan / Biaya Lainnya', volume: 0, tarif: 0, ditanggung: 0 }
  ]);

  const handleItemChange = (id: string, field: 'uraian' | 'volume' | 'tarif' | 'ditanggung', value: any) => {
    setBillingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === 'uraian' ? value : (value >= 0 ? value : 0) };
      }
      return item;
    }));
  };

  const handleAddRow = (kategoriTarget: string) => {
    const newRow: BillingItem = {
      id: 'custom-' + Math.random().toString(36).substring(2, 9),
      kategori: kategoriTarget,
      uraian: 'Ketik Uraian Tindakan Tambahan...',
      volume: 0,
      tarif: 0,
      ditanggung: 0
    };
    setBillingItems(prev => [...prev, newRow]);
  };

  const handleRemoveRow = (id: string) => {
    setBillingItems(prev => prev.filter(item => item.id !== id));
  };

  // Kalkulasi Total
  const totalJumlah = billingItems.reduce((acc, item) => acc + (item.volume * item.tarif), 0);
  const totalDitanggung = billingItems.reduce((acc, item) => acc + Number(item.ditanggung), 0);
  const totalSelisih = totalJumlah - totalDitanggung;

  // Submit ke Supabase
  const handleSubmitToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.namaPasien) {
      alert('Nama pasien wajib diisi!');
      return;
    }

    if (patientData.jenisPenjaminan === 'BPJS KESEHATAN' && !patientData.noSep) {
      if (!confirm('Nomor SEP BPJS masih kosong. Yakin ingin melanjutkan?')) {
        return;
      }
    }

    setLoading(true);
    try {
      const { error: headerError } = await supabase
        .from('ranap_billing_header')
        .upsert({
          no_reg: patientData.noReg,
          jenis_penjaminan: patientData.jenisPenjaminan,
          metode_pembayaran: patientData.metodePembayaran,
          nama_pasien: patientData.namaPasien,
          nik_pasien: patientData.nikPasien,
          umur: patientData.umur,
          alamat: patientData.alamat,
          diagnosa: patientData.diagnosa,
          ruang: patientData.ruangPerawatan,
          no_kartu_bpjs: patientData.noBpjs,
          no_sep_bpjs: patientData.noSep,
          masuk_tgl: patientData.masukTgl ? new Date(patientData.masukTgl).toISOString() : null,
          keluar_tgl: patientData.keluarTgl ? new Date(patientData.keluarTgl).toISOString() : null,
          dokter_merawat: patientData.dokterMerawat,
          kepala_ruangan: patientData.kepalaRuangan,
          bendahara_penerima: patientData.bendahara,
          petugas_email: patientData.petugasEmail,
          ttd_petugas_base64: patientData.signatureBase64,
          status_verifikasi: 'VERIFIED_KASIR'
        }, { onConflict: 'no_reg' });

      if (headerError) throw headerError;

      await supabase.from('ranap_billing_items').delete().eq('no_reg', patientData.noReg);

      const itemsToInsert = billingItems
        .filter(item => item.volume > 0 || item.tarif > 0)
        .map(item => ({
          no_reg: patientData.noReg,
          kategori_biaya: item.kategori,
          nama_item: item.uraian,
          volume: item.volume,
          tarif_satuan: item.tarif,
          jumlah_total: item.volume * item.tarif,
          ditanggung_pihak3: item.ditanggung,
          selisih_bayar: (item.volume * item.tarif) - item.ditanggung
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('ranap_billing_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      alert('Rincian Biaya Rawat Inap Berhasil Disimpan!');
      router.push('/kasir');
    } catch (err: any) {
      console.error('Gagal menyimpan:', err);
      alert('Gagal menyimpan data ke database: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      
      {/* Header Halaman */}
      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Input Perincian Biaya Rawat Inap" />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        {/* Navigasi Atas */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu Kasir</span>
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-slate-500">Akses:</span>
            <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md text-xs font-black border border-emerald-200 uppercase">
              KASIR
            </span>
          </div>
        </div>

        {/* Form Utama */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          
          {/* Kop Surat Resmi RSUD Bukit Kerman dengan Logo */}
          <div className="flex items-center justify-between pb-6 border-b-2 border-slate-800 gap-4">
            <div className="flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 relative flex items-center justify-center">
              <img 
                src="/images/logo-kerinci.png" 
                alt="Logo Kabupaten Kerinci" 
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="text-center flex-1 space-y-0.5">
              <h2 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                PEMERINTAH KABUPATEN KERINCI — DINAS KESEHATAN
              </h2>
              <h1 className="text-sm sm:text-lg font-black text-emerald-800 tracking-wider uppercase">
                RSUD KELAS D BUKIT KERMAN
              </h1>
              <p className="text-[11px] text-slate-600 font-medium">
                Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Website: https://rsudbukitkerman.kerincikab.go.id | Email: rsubukitkerman@gmail.com
              </p>
              <div className="pt-2">
                <span className="inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black tracking-widest uppercase shadow-sm">
                  PERINCIAN BIAYA PELAYANAN RAWAT INAP
                </span>
              </div>
            </div>

            <div className="flex-shrink-0 w-16 h-20 sm:w-20 sm:h-24 relative flex items-center justify-center">
              <img 
                src="/images/logo-rsud.png" 
                alt="Logo RSUD Bukit Kerman" 
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          <form onSubmit={handleSubmitToDatabase} className="space-y-6">
            
            {/* Preset Cepat */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Preset Cepat Penjaminan:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('umum')}
                  className="bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  Pasien Umum Standar
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('bpjs')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Pasien BPJS Kesehatan
                </button>
              </div>
            </div>

            {/* Tanggal & Penjaminan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Input / Masuk</label>
                <input 
                  type="date" 
                  value={patientData.masukTgl}
                  onChange={(e) => setPatientData({...patientData, masukTgl: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Penjaminan</label>
                <select
                  value={patientData.jenisPenjaminan}
                  onChange={(e) => setPatientData({...patientData, jenisPenjaminan: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-emerald-900 bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="UMUM / MANDIRI">UMUM / MANDIRI</option>
                  <option value="BPJS KESEHATAN">BPJS KESEHATAN</option>
                  <option value="ASURANSI SWASTA / JAMKESDA">ASURANSI SWASTA / JAMKESDA</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Metode Pembayaran</label>
                <select
                  value={patientData.metodePembayaran}
                  onChange={(e) => setPatientData({...patientData, metodePembayaran: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                >
                  <option value="Tunai / Cash">Tunai / Cash</option>
                  <option value="Transfer Bank / QRIS">Transfer Bank / QRIS</option>
                  <option value="Non-Tunai / Penjaminan">Non-Tunai / Penjaminan BPJS</option>
                </select>
              </div>
            </div>

            {/* Input Data Pasien */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">No. Registrasi / RM</label>
                <input 
                  type="text" 
                  value={patientData.noReg}
                  onChange={(e) => setPatientData({...patientData, noReg: e.target.value})}
                  required
                  placeholder="Contoh: RM-098231"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pasien</label>
                <input 
                  type="text" 
                  placeholder="Nama lengkap pasien"
                  value={patientData.namaPasien}
                  onChange={(e) => setPatientData({...patientData, namaPasien: e.target.value})}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">NIK Pasien</label>
                <input 
                  type="text" 
                  placeholder="NIK 16 digit"
                  value={patientData.nikPasien}
                  onChange={(e) => setPatientData({...patientData, nikPasien: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Umur</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 35 Tahun"
                  value={patientData.umur}
                  onChange={(e) => setPatientData({...patientData, umur: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ruang / Kelas Perawatan</label>
                <input 
                  type="text" 
                  placeholder="Ketik Ruang / Poliklinik..."
                  value={patientData.ruangPerawatan}
                  onChange={(e) => setPatientData({...patientData, ruangPerawatan: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>

              {patientData.jenisPenjaminan === 'BPJS KESEHATAN' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 mb-1">No. Kartu BPJS</label>
                    <input 
                      type="text" 
                      placeholder="No. BPJS Kesehatan"
                      value={patientData.noBpjs}
                      onChange={(e) => setPatientData({...patientData, noBpjs: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-medium bg-emerald-50/50"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-emerald-700 mb-1">No. SEP BPJS (Surat Elegibilitas Peserta)</label>
                    <input 
                      type="text" 
                      placeholder="No. Surat Elegibilitas Peserta (SEP)"
                      value={patientData.noSep}
                      onChange={(e) => setPatientData({...patientData, noSep: e.target.value})}
                      className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-bold text-emerald-900 bg-emerald-50/50"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-600 mb-1">Diagnosa Penyakit / Medis</label>
                  <input 
                    type="text" 
                    placeholder="Masukkan diagnosa medis"
                    value={patientData.diagnosa}
                    onChange={(e) => setPatientData({...patientData, diagnosa: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                  />
                </div>
              )}

              <div className="sm:col-span-4">
                <label className="block text-xs font-bold text-slate-600 mb-1">Alamat Lengkap Pasien</label>
                <input 
                  type="text" 
                  placeholder="Alamat domisili / Desa / Kecamatan"
                  value={patientData.alamat}
                  onChange={(e) => setPatientData({...patientData, alamat: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
            </div>

            {/* Tabel Rincian Biaya */}
            <div className="overflow-x-auto border border-slate-300 rounded-2xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-800 text-white uppercase font-bold text-[11px] tracking-wider">
                    <th className="p-3">Uraian Biaya / Layanan Medis</th>
                    <th className="p-3 text-center w-28">Volume / Hari</th>
                    <th className="p-3 text-right w-36">Tarif Satuan (Rp)</th>
                    <th className="p-3 text-right w-36">Jumlah Total (Rp)</th>
                    <th className="p-3 text-right w-36">Ditanggung (Pihak III)</th>
                    <th className="p-3 text-right w-36">Selisih (Pasien Umum)</th>
                    <th className="p-3 text-center w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {CATEGORIES.map((category) => {
                    const categoryItems = billingItems.filter(item => item.kategori === category);

                    return (
                      <React.Fragment key={category}>
                        <tr className="bg-emerald-50/90 border-t-2 border-emerald-600">
                          <td colSpan={7} className="p-2.5 font-black text-emerald-900 tracking-wide text-xs flex items-center justify-between">
                            <span>{category}</span>
                            <button
                              type="button"
                              onClick={() => handleAddRow(category)}
                              className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] px-2.5 py-1 rounded-lg transition shadow-sm cursor-pointer font-bold"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tambah Item</span>
                            </button>
                          </td>
                        </tr>

                        {categoryItems.map((item) => {
                          const subTotal = item.volume * item.tarif;
                          const selisih = subTotal - Number(item.ditanggung);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="p-3 font-medium text-slate-800 pl-6 border-l border-slate-100">
                                <input 
                                  type="text"
                                  value={item.uraian}
                                  onChange={(e) => handleItemChange(item.id, 'uraian', e.target.value)}
                                  className="w-full px-2 py-1 rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-emerald-500"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <input 
                                  type="number" 
                                  value={item.volume}
                                  onChange={(e) => handleItemChange(item.id, 'volume', parseFloat(e.target.value) || 0)}
                                  className="w-20 text-center px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono"
                                />
                              </td>
                              <td className="p-3 text-right">
                                <input 
                                  type="number" 
                                  value={item.tarif}
                                  onChange={(e) => handleItemChange(item.id, 'tarif', parseFloat(e.target.value) || 0)}
                                  className="w-32 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white font-mono"
                                />
                              </td>
                              <td className="p-3 text-right font-bold text-slate-900 font-mono">
                                Rp {subTotal.toLocaleString('id-ID')}
                              </td>
                              <td className="p-3 text-right">
                                <input 
                                  type="number" 
                                  value={item.ditanggung}
                                  onChange={(e) => handleItemChange(item.id, 'ditanggung', parseFloat(e.target.value) || 0)}
                                  className="w-32 text-right px-2 py-1 rounded-lg border border-slate-300 text-emerald-700 font-semibold bg-white font-mono"
                                />
                              </td>
                              <td className="p-3 text-right font-bold text-rose-700 font-mono">
                                Rp {selisih > 0 ? selisih.toLocaleString('id-ID') : '0'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(item.id)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Hapus baris ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-sm border-t-4 border-emerald-500">
                    <td colSpan={3} className="p-3.5 text-right uppercase tracking-wider">JUMLAH KESELURUHAN:</td>
                    <td className="p-3.5 text-right text-emerald-300 font-mono">Rp {totalJumlah.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-right text-emerald-400 font-mono">Rp {totalDitanggung.toLocaleString('id-ID')}</td>
                    <td className="p-3.5 text-right text-rose-300 font-mono">Rp {totalSelisih > 0 ? totalSelisih.toLocaleString('id-ID') : '0'}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Bagian Penandatangan (Dokter, Kepala Ruangan, Bendahara & TTD) */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
              
              {/* Form Input 3 Pejabat Penandatangan */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Dokter Yang Merawat</label>
                  <input 
                    type="text" 
                    placeholder="Nama Dokter..."
                    value={patientData.dokterMerawat}
                    onChange={(e) => setPatientData({...patientData, dokterMerawat: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kepala Ruangan</label>
                  <input 
                    type="text" 
                    placeholder="Nama Kepala Ruangan..."
                    value={patientData.kepalaRuangan}
                    onChange={(e) => setPatientData({...patientData, kepalaRuangan: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bendahara / Penerima (Petugas Kasir)</label>
                  <input 
                    type="text" 
                    value={patientData.bendahara}
                    onChange={(e) => setPatientData({...patientData, bendahara: e.target.value})}
                    className="w-full px-3 py-2 rounded-xl border border-emerald-400 text-xs font-bold text-emerald-900 bg-emerald-50/50 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Status Akun Login & Tanda Tangan Digital */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start pt-4 border-t border-slate-200">
                
                {/* Informasi Petugas Penginput */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-slate-800 font-bold text-xs">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                    <span>Petugas Penginput Data (Penanggung Jawab Sesi)</span>
                  </div>

                  <div className="space-y-1 pl-6 border-l-2 border-emerald-500">
                    <p className="text-xs text-slate-500">
                      Nama Petugas: <span className="font-bold text-slate-900 text-sm">{patientData.bendahara}</span>
                    </p>
                    {patientData.petugasEmail && (
                      <p className="text-xs text-slate-500 font-mono">
                        Email / ID: <span className="font-semibold text-slate-700">{patientData.petugasEmail}</span>
                      </p>
                    )}
                    <div className="pt-1 flex items-center space-x-2">
                      <span className="text-[11px] text-slate-500 font-medium">Status Akses:</span>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                        KASIR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Canvas Tanda Tangan Digital */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">Tanda Tangan Petugas Penginput</label>
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="inline-flex items-center space-x-1 text-rose-600 hover:text-rose-700 text-xs font-bold cursor-pointer transition"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Bersihkan TTD</span>
                    </button>
                  </div>

                  <div className="relative border-2 border-dashed border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner flex items-center justify-center">
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={120}
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
                      <span className="absolute text-slate-400 text-xs pointer-events-none font-medium">
                        Goreskan tanda tangan petugas di sini
                      </span>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Tombol Simpan */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Menyimpan...' : 'Simpan & Verifikasi Rincian Ranap'}</span>
              </button>
            </div>

          </form>

        </div>

      </main>

      {/* Footer */}
      <KasirFooter />

    </div>
  );
}