'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Printer, Building2, User, Calendar, 
  MapPin, Stethoscope, FileText, CheckCircle2, Calculator, Plus, Trash2, CreditCard, ShieldCheck 
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
  ditanggung: number; // Ditanggung Pihak ke III (BPJS/Asuransi)
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

  // State Identitas Pasien & Penjaminan
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
    petugasEmail: ''
  });

  // Otomatis Ambil Data User/Petugas Login dari Supabase Auth
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const displayName = 
            user.user_metadata?.full_name || 
            user.user_metadata?.name || 
            user.email || 
            'Petugas Kasir';

          setPatientData(prev => ({
            ...prev,
            bendahara: displayName,
            petugasEmail: user.email || ''
          }));
        } else {
          setPatientData(prev => ({
            ...prev,
            bendahara: 'Petugas Kasir'
          }));
        }
      } catch (err) {
        console.error('Gagal mengambil data autentikasi:', err);
      }
    };

    fetchCurrentUser();
  }, []);

  // Preset Cepat Penjaminan
  const handleApplyPreset = (type: 'umum' | 'spesialis' | 'bpjs') => {
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

  // State Rincian Biaya
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

  // Simpan Ke Supabase
  const handleSubmitToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.namaPasien) {
      alert('Nama pasien wajib diisi!');
      return;
    }

    if (patientData.jenisPenjaminan === 'BPJS KESEHATAN' && !patientData.noSep) {
      if (!confirm('Nomor SEP BPJS masih kosong. Apakah Anda yakin ingin melanjutkan?')) {
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
          status_verifikasi: 'VERIFIED_ADMIN'
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

      alert('Rincian Biaya Rawat Inap Berhasil Disimpan & Dikirim untuk Verifikasi Admin!');
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
              KASIR / ADMIN
            </span>
          </div>
        </div>

        {/* Form Utama */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          
          {/* Kop Surat RSUD */}
          <div className="text-center pb-6 border-b border-slate-200 space-y-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900">PEMERINTAH KABUPATEN KERINCI — DINAS KESEHATAN</h2>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-700">RSUD KELAS D BUKIT KERMAN</h3>
            <p className="text-[11px] text-slate-500">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
            <div className="mt-2 inline-block bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
              PERINCIAN BIAYA PELAYANAN RAWAT INAP
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

            {/* Pilihan Tanggal Kunjungan & Penjaminan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Input / Kunjungan</label>
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

            {/* Bagian Input Data Pasien */}
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

              {/* Input Khusus Jika Penjaminan BPJS */}
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

            {/* Tabel Perincian Biaya */}
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

            {/* Bagian Penandatangan & Identitas Penginput Login */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dokter Yang Merawat</label>
                <input 
                  type="text" 
                  placeholder="Nama Dokter"
                  value={patientData.dokterMerawat}
                  onChange={(e) => setPatientData({...patientData, dokterMerawat: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Kepala Ruangan</label>
                <input 
                  type="text" 
                  placeholder="Nama Kepala Ruangan"
                  value={patientData.kepalaRuangan}
                  onChange={(e) => setPatientData({...patientData, kepalaRuangan: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="block text-xs font-bold text-slate-700 mb-1">Petugas Penginput Data (Penanggung Jawab)</label>
                <input 
                  type="text" 
                  value={patientData.bendahara}
                  onChange={(e) => setPatientData({...patientData, bendahara: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-emerald-300 text-xs font-bold text-emerald-900 bg-emerald-50/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">Status Akses: <span className="text-emerald-700 font-bold">VERIFIED KASIR</span></p>
              </div>
            </div>

            {/* Tombol Simpan & Kirim */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl text-xs font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer"
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