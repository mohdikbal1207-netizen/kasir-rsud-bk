'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Save, Printer, Building2, User, Calendar, 
  MapPin, Stethoscope, FileText, CheckCircle2, Calculator 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/KasirHeader';
import KasirFooter from '@/components/KasirFooter';

interface BillingItem {
  id: string;
  kategori: string;
  uraian: string;
  volume: number;
  tarif: number;
  ditanggung: number; // Ditanggung Pihak ke III (BPJS/Asuransi)
}

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

  // State Daftar Rincian Biaya (Sesuai Format Formulir Resmi RSUD Bukit Kerman)
  const [billingItems, setBillingItems] = useState<BillingItem[]>([
    // I. Ruangan
    { id: '1', kategori: 'RUANGAN', uraian: 'Super VIP', volume: 0, tarif: 500000, ditanggung: 0 },
    { id: '2', kategori: 'RUANGAN', uraian: 'VIP', volume: 3, tarif: 350000, ditanggung: 1050000 },
    { id: '3', kategori: 'RUANGAN', uraian: 'Kelas Utama', volume: 0, tarif: 250000, ditanggung: 0 },
    { id: '4', kategori: 'RUANGAN', uraian: 'Kelas III', volume: 0, tarif: 100000, ditanggung: 0 },
    
    // II. Makan
    { id: '5', kategori: 'MAKAN', uraian: 'Makan Pasien Ranap', volume: 3, tarif: 45000, ditanggung: 135000 },
    
    // III. Visit
    { id: '6', kategori: 'VISIT', uraian: 'Visit 1 (Dokter Spesialis)', volume: 3, tarif: 75000, ditanggung: 225000 },
    { id: '7', kategori: 'VISIT', uraian: 'Visit 2 (Dokter / Visite Lain)', volume: 0, tarif: 50000, ditanggung: 0 },

    // IV. Obat-obatan
    { id: '8', kategori: 'OBAT', uraian: 'a. Injeksi & Infus', volume: 2, tarif: 200000, ditanggung: 400000 },
    { id: '9', kategori: 'OBAT', uraian: 'b. Tablet / Oral', volume: 1, tarif: 150000, ditanggung: 150000 },

    // V. Operasi & Tindakan
    { id: '10', kategori: 'OPERASI', uraian: '1. Operasi Kecil', volume: 0, tarif: 750000, ditanggung: 0 },
    { id: '11', kategori: 'OPERASI', uraian: '2. Operasi Sedang', volume: 0, tarif: 1500000, ditanggung: 0 },
    { id: '12', kategori: 'OPERASI', uraian: '3. Operasi Besar', volume: 0, tarif: 3000000, ditanggung: 0 },
    { id: '13', kategori: 'OPERASI', uraian: '5. Partus Normal', volume: 0, tarif: 1000000, ditanggung: 0 },

    // VI. Penunjang Medik
    { id: '14', kategori: 'PENUNJANG', uraian: 'a. Laboratorium Darah Rutin', volume: 1, tarif: 250000, ditanggung: 250000 },
    { id: '15', kategori: 'PENUNJANG', uraian: 'd. USG', volume: 0, tarif: 200000, ditanggung: 0 },
    { id: '16', kategori: 'PENUNJANG', uraian: 'e. EKG', volume: 0, tarif: 150000, ditanggung: 0 },
    { id: '17', kategori: 'PENUNJANG', uraian: 'f. Rontgen / Thorax', volume: 0, tarif: 250000, ditanggung: 0 },

    // VII. Lain-lain
    { id: '18', kategori: 'LAINNYA', uraian: 'a. Visite Apoteker', volume: 3, tarif: 15000, ditanggung: 45000 },
    { id: '19', kategori: 'LAINNYA', uraian: 'b. Konsultasi Gizi', volume: 1, tarif: 30000, ditanggung: 30000 },
    { id: '20', kategori: 'LAINNYA', uraian: 'c. Ambulance', volume: 0, tarif: 350000, ditanggung: 0 },
    { id: '21', kategori: 'LAINNYA', uraian: 'd. ADM (Administrasi RS)', volume: 1, tarif: 50000, ditanggung: 0 }
  ]);

  // Handler Perubahan Nilai pada Item Tabel
  const handleItemChange = (id: string, field: 'volume' | 'tarif' | 'ditanggung', value: number) => {
    setBillingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value >= 0 ? value : 0 };
      }
      return item;
    }));
  };

  // Kalkulasi Total Keseluruhan
  const totalJumlah = billingItems.reduce((acc, item) => acc + (item.volume * item.tarif), 0);
  const totalDitanggung = billingItems.reduce((acc, item) => acc + Number(item.ditanggung), 0);
  const totalSelisih = totalJumlah - totalDitanggung;

  // Fungsi Simpan ke Supabase (Untuk Verifikasi Admin & Data Pasien)
  const handleSubmitToDatabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientData.namaPasien) {
      alert('Nama pasien wajib diisi!');
      return;
    }

    setLoading(true);
    try {
      // 1. Simpan Header Pasien Ranap
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
        });

      if (headerError) throw headerError;

      // 2. Bersihkan item lama untuk nomor reg ini, lalu masukkan yang baru
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

      const { error: itemsError } = await supabase
        .from('ranap_billing_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      alert('Rincian Biaya Rawat Inap Berhasil Disimpan & Dikirim untuk Verifikasi Admin!');
      router.push('/kasir');
    } catch (err: any) {
      console.error('Gagal menyimpan:', err);
      alert('Gagal menyimpan data: ' + err.message);
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
            Form Resmi Perincian Biaya Perawatan Ranap
          </div>
        </div>

        {/* Form Utama */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-6">
          
          {/* Kop Surat RSUD */}
          <div className="text-center pb-6 border-b border-slate-200 space-y-1">
            <h2 className="text-sm sm:text-base font-black text-slate-900">PEMERINTAH KABUPATEN KERINCI</h2>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-700">DINAS KESEHATAN — RSUD BUKIT KERMAN</h3>
            <p className="text-[11px] text-slate-500">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
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

            {/* Tabel Perincian Biaya */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                    <th className="p-3">Uraian Biaya / Layanan Medis</th>
                    <th className="p-3 text-center">Volume / Hari</th>
                    <th className="p-3 text-right">Tarif Satuan (Rp)</th>
                    <th className="p-3 text-right">Jumlah Total (Rp)</th>
                    <th className="p-3 text-right">Ditanggung (Pihak III)</th>
                    <th className="p-3 text-right">Selisih (Pasien Umum)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {billingItems.map((item) => {
                    const subTotal = item.volume * item.tarif;
                    const selisih = subTotal - Number(item.ditanggung);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-800">{item.uraian}</td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            value={item.volume}
                            onChange={(e) => handleItemChange(item.id, 'volume', parseFloat(e.target.value) || 0)}
                            className="w-16 text-center px-2 py-1 rounded-lg border border-slate-300 bg-white"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            value={item.tarif}
                            onChange={(e) => handleItemChange(item.id, 'tarif', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right px-2 py-1 rounded-lg border border-slate-300 bg-white"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900">
                          Rp {subTotal.toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right">
                          <input 
                            type="number" 
                            value={item.ditanggung}
                            onChange={(e) => handleItemChange(item.id, 'ditanggung', parseFloat(e.target.value) || 0)}
                            className="w-28 text-right px-2 py-1 rounded-lg border border-slate-300 text-emerald-700 font-semibold bg-white"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-rose-700">
                          Rp {selisih > 0 ? selisih.toLocaleString('id-ID') : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-emerald-50/80 font-black text-slate-900 border-t-2 border-emerald-500">
                    <td colSpan={3} className="p-3 text-right uppercase">JUMLAH KESELURUHAN:</td>
                    <td className="p-3 text-right text-emerald-900 text-sm">Rp {totalJumlah.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right text-emerald-700 text-sm">Rp {totalDitanggung.toLocaleString('id-ID')}</td>
                    <td className="p-3 text-right text-rose-700 text-sm">Rp {totalSelisih > 0 ? totalSelisih.toLocaleString('id-ID') : '0'}</td>
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