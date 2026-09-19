'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Printer, Building2, User, Calendar, 
  MapPin, Stethoscope, FileText, CheckCircle2, Calculator, Plus, Trash2 
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

  // State Identitas Pasien Rawat Inap
  const [patientData, setPatientData] = useState({
    noReg: 'REG-RANAP-2026-001',
    namaPasien: '',
    umur: '',
    alamat: '',
    diagnosa: '',
    ruangPerawatan: 'VIP Melati',
    masukTgl: '',
    keluarTgl: '',
    dokterMerawat: '',
    kepalaRuangan: '',
    bendahara: 'Mohd. Ikbal, S.Tr.Kes'
  });

  // State Daftar Rincian Biaya Sesuai Format Resmi RSUD Bukit Kerman (Tarif Default 0)
  const [billingItems, setBillingItems] = useState<BillingItem[]>([
    // I. Ruangan Perawatan/Bagian
    { id: '1', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Super VIP', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '2', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'VIP', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '3', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas Utama', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '4', kategori: 'I. RUANGAN PERAWATAN / BAGIAN', uraian: 'Kelas III', volume: 0, tarif: 0, ditanggung: 0 },
    
    // II. Makan
    { id: '5', kategori: 'II. MAKAN', uraian: 'Makan Pasien Ranap', volume: 0, tarif: 0, ditanggung: 0 },
    
    // III. Visit
    { id: '6', kategori: 'III. VISIT', uraian: '1. Visit Dokter Spesialis', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '7', kategori: 'III. VISIT', uraian: '2. Visit / Visite Lainnya', volume: 0, tarif: 0, ditanggung: 0 },

    // IV. Obat-obatan
    { id: '8', kategori: 'IV. OBAT-OBATAN', uraian: 'a. Injeksi & Infus', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '9', kategori: 'IV. OBAT-OBATAN', uraian: 'b. Tablet / Oral', volume: 0, tarif: 0, ditanggung: 0 },

    // V. Operasi & Tindakan
    { id: '10', kategori: 'V. OPERASI', uraian: '1. Operasi Kecil', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '11', kategori: 'V. OPERASI', uraian: '2. Operasi Sedang', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '12', kategori: 'V. OPERASI', uraian: '3. Operasi Besar', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '13', kategori: 'V. OPERASI', uraian: '4. Curratage', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '14', kategori: 'V. OPERASI', uraian: '5. Partus Normal', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '15', kategori: 'V. OPERASI', uraian: '6. Partus Sulit', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '16', kategori: 'V. OPERASI', uraian: '7. Lainnya - a', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '17', kategori: 'V. OPERASI', uraian: '7. Lainnya - b', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '18', kategori: 'V. OPERASI', uraian: '7. Lainnya - c', volume: 0, tarif: 0, ditanggung: 0 },

    // VI. Penunjang Medik
    { id: '19', kategori: 'VI. PENUNJANG MEDIK', uraian: 'a. Laboratorium', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '20', kategori: 'VI. PENUNJANG MEDIK', uraian: 'b. Pemeriksaan Penunjang b', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '21', kategori: 'VI. PENUNJANG MEDIK', uraian: 'c. Pemeriksaan Penunjang c', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '22', kategori: 'VI. PENUNJANG MEDIK', uraian: 'd. USG', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '23', kategori: 'VI. PENUNJANG MEDIK', uraian: 'e. EKG', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '24', kategori: 'VI. PENUNJANG MEDIK', uraian: 'f. Rontgen', volume: 0, tarif: 0, ditanggung: 0 },

    // VII. Lain-lain
    { id: '25', kategori: 'VII. LAIN LAIN', uraian: 'a. Visite Apoteker', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '26', kategori: 'VII. LAIN LAIN', uraian: 'b. Konsultasi Gizi', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '27', kategori: 'VII. LAIN LAIN', uraian: 'c. Ambulance', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '28', kategori: 'VII. LAIN LAIN', uraian: 'd. ADM', volume: 0, tarif: 0, ditanggung: 0 },
    { id: '29', kategori: 'VII. LAIN LAIN', uraian: 'e. Tindakan / Biaya Lainnya', volume: 0, tarif: 0, ditanggung: 0 }
  ]);

  // Handler Perubahan Nilai pada Item Tabel
  const handleItemChange = (id: string, field: 'uraian' | 'volume' | 'tarif' | 'ditanggung', value: any) => {
    setBillingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: field === 'uraian' ? value : (value >= 0 ? value : 0) };
      }
      return item;
    }));
  };

  // Fungsi Tambah Baris Dinamis Berdasarkan Kategori
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

  // Fungsi Hapus Baris
  const handleRemoveRow = (id: string) => {
    setBillingItems(prev => prev.filter(item => item.id !== id));
  };

  // Kalkulasi Total Keseluruhan
  const totalJumlah = billingItems.reduce((acc, item) => acc + (item.volume * item.tarif), 0);
  const totalDitanggung = billingItems.reduce((acc, item) => acc + Number(item.ditanggung), 0);
  const totalSelisih = totalJumlah - totalDitanggung;

  // Fungsi Simpan ke Supabase (Dengan onConflict no_reg)
  const handleSubmitToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.namaPasien) {
      alert('Nama pasien wajib diisi!');
      return;
    }

    setLoading(true);
    try {
      const { error: headerError } = await supabase
        .from('ranap_billing_header')
        .upsert({
          no_reg: patientData.noReg,
          nama_pasien: patientData.namaPasien,
          umur: patientData.umur,
          alamat: patientData.alamat,
          diagnosa: patientData.diagnosa,
          ruang: patientData.ruangPerawatan,
          masuk_tgl: patientData.masukTgl ? new Date(patientData.masukTgl).toISOString() : null,
          keluar_tgl: patientData.keluarTgl ? new Date(patientData.keluarTgl).toISOString() : null,
          dokter_merawat: patientData.dokterMerawat,
          kepala_ruangan: patientData.kepalaRuangan,
          bendahara_penerima: patientData.bendahara,
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
        
        {/* Tombol Kembali */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu Kasir</span>
          </button>
          
          <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
            Form Resmi Perincian Biaya Perawatan Ranap (Dinamis)
          </div>
        </div>

        {/* Form Utama */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          
          {/* Kop Surat RSUD */}
          <div className="text-center pb-6 border-b border-slate-200 space-y-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900">PEMERINTAH KABUPATEN KERINCI</h2>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-700">DINAS KESEHATAN — RSUD BUKIT KERMAN</h3>
            <p className="text-[11px] text-slate-500">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
            <div className="mt-2 text-xs font-bold tracking-widest text-slate-700 uppercase underline">
              PERINCIAN BIAYA PERAWATAN
            </div>
          </div>

          <form onSubmit={handleSubmitToDatabase} className="space-y-6">
            
            {/* Bagian Input Data Pasien */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">No. Registrasi / RM</label>
                <input 
                  type="text" 
                  value={patientData.noReg}
                  onChange={(e) => setPatientData({...patientData, noReg: e.target.value})}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pasien</label>
                <input 
                  type="text" 
                  placeholder="Masukkan nama lengkap"
                  value={patientData.namaPasien}
                  onChange={(e) => setPatientData({...patientData, namaPasien: e.target.value})}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Umur</label>
                <input 
                  type="text" 
                  placeholder="Contoh: 42 Tahun"
                  value={patientData.umur}
                  onChange={(e) => setPatientData({...patientData, umur: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Alamat Pasien</label>
                <input 
                  type="text" 
                  placeholder="Alamat lengkap tempat tinggal"
                  value={patientData.alamat}
                  onChange={(e) => setPatientData({...patientData, alamat: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ruang / Kelas Perawatan</label>
                <input 
                  type="text" 
                  value={patientData.ruangPerawatan}
                  onChange={(e) => setPatientData({...patientData, ruangPerawatan: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-600 mb-1">Diagnosa Penyakit</label>
                <input 
                  type="text" 
                  placeholder="Masukkan diagnosa medis"
                  value={patientData.diagnosa}
                  onChange={(e) => setPatientData({...patientData, diagnosa: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Masuk</label>
                <input 
                  type="date" 
                  value={patientData.masukTgl}
                  onChange={(e) => setPatientData({...patientData, masukTgl: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Keluar</label>
                <input 
                  type="date" 
                  value={patientData.keluarTgl}
                  onChange={(e) => setPatientData({...patientData, keluarTgl: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-white"
                />
              </div>
            </div>

            {/* Tabel Perincian Biaya Berdasarkan Kategori Terstruktur */}
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
                        {/* Header Kategori */}
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

                        {/* Daftar Item dalam Kategori Tersebut */}
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

            {/* Bagian Penandatangan / Verifikasi */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dokter Yang Merawat</label>
                <input 
                  type="text" 
                  placeholder="Nama Dokter"
                  value={patientData.dokterMerawat}
                  onChange={(e) => setPatientData({...patientData, dokterMerawat: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Kepala Ruangan</label>
                <input 
                  type="text" 
                  placeholder="Nama Kepala Ruangan"
                  value={patientData.kepalaRuangan}
                  onChange={(e) => setPatientData({...patientData, kepalaRuangan: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bendahara / Verifikator Admin</label>
                <input 
                  type="text" 
                  value={patientData.bendahara}
                  onChange={(e) => setPatientData({...patientData, bendahara: e.target.value})}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-100 font-bold text-emerald-800"
                />
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