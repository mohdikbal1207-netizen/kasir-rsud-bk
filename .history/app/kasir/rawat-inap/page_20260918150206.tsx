'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calculator, Save, CheckCircle2, FileText, User, Calendar, MapPin, Stethoscope, Building2 } from 'lucide-react';

interface BillingItemRow {
  kategori: string;
  namaItem: string;
  volume: number;
  tarif: number;
  ditanggung: number;
}

export default function RanapBillingForm() {
  // State Data Pasien
  const [formData, setFormData] = useState({
    noReg: 'REG-RANAP-2026-001',
    nama: '',
    umur: '',
    alamat: '',
    diagnosa: '',
    ruang: 'VIP Melati',
    masukTgl: '',
    keluarTgl: '',
    dokterMerawat: '',
    kepalaRuangan: '',
    bendahara: 'Mohd. Ikbal, S.Tr.Kes'
  });

  // State Item Rincian Biaya (Berdasarkan Form PDF Resmi)
  const [items, setItems] = useState<BillingItemRow[]>([
    { kategori: 'RUANGAN', namaItem: 'VIP', volume: 3, tarif: 350000, ditanggung: 1000000 },
    { kategori: 'MAKAN', namaItem: 'Makan Pasien Ranap', volume: 3, tarif: 45000, ditanggung: 135000 },
    { kategori: 'VISIT', namaItem: 'Visit Dokter Spesialis (1)', volume: 3, tarif: 75000, ditanggung: 225000 },
    { kategori: 'OBAT', namaItem: 'a. Injeksi & Infus', volume: 1, tarif: 450000, ditanggung: 400000 },
    { kategori: 'OBAT', namaItem: 'b. Tablet / Oral', volume: 1, tarif: 150000, ditanggung: 150000 },
    { kategori: 'PENUNJANG', namaItem: 'a. Laboratorium Darah Rutin', volume: 1, tarif: 250000, ditanggung: 250000 },
    { kategori: 'LAINNYA', namaItem: 'd. ADM / Administrasi RS', volume: 1, tarif: 50000, ditanggung: 0 }
  ]);

  const [loading, setLoading] = useState(false);

  // Handler Perubahan Data Item
  const handleItemChange = (index: number, field: keyof BillingItemRow, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  // Kalkulasi Total Keseluruhan
  const totalJumlah = items.reduce((acc, item) => acc + (item.volume * item.tarif), 0);
  const totalDitanggung = items.reduce((acc, item) => acc + Number(item.ditanggung), 0);
  const totalSelisih = totalJumlah - totalDitanggung;

  // Simpan ke Supabase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Simpan Header
      const { error: headerError } = await supabase
        .from('ranap_billing_header')
        .upsert({
          no_reg: formData.noReg,
          nama_pasien: formData.nama,
          umur: formData.umur,
          alamat: formData.alamat,
          diagnosa: formData.diagnosa,
          ruang: formData.ruang,
          masuk_tgl: formData.masukTgl ? new Date(formData.masukTgl).toISOString() : null,
          keluar_tgl: formData.keluarTgl ? new Date(formData.keluarTgl).toISOString() : null,
          dokter_merawat: formData.dokterMerawat,
          kepala_ruangan: formData.kepalaRuangan,
          bendahara_penerima: formData.bendahara,
          status_verifikasi: 'VERIFIED_ADMIN'
        });

      if (headerError) throw headerError;

      // 2. Hapus item lama untuk nomor reg ini lalu masukkan yang baru
      await supabase.from('ranap_billing_items').delete().eq('no_reg', formData.noReg);

      const itemsToInsert = items.map(item => ({
        no_reg: formData.noReg,
        kategori_biaya: item.kategori,
        nama_item: item.namaItem,
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

      alert('Rincian Biaya Rawat Inap Berhasil Disimpan & Diverifikasi!');
    } catch (err: any) {
      console.error('Gagal menyimpan:', err);
      alert('Terjadi kesalahan saat menyimpan data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-3xl shadow-xl border border-slate-200 text-slate-800">
      
      {/* Header Surat RSUD */}
      <div className="text-center pb-6 border-b border-slate-200 mb-6">
        <h2 className="text-xl font-black text-slate-900 tracking-tight">PEMERINTAH KABUPATEN KERINCI</h2>
        <h3 className="text-base font-bold text-emerald-700">RSUD BUKIT KERMAN</h3>
        <p className="text-xs text-slate-500 mt-1">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
        <div className="mt-3 inline-block bg-emerald-50 text-emerald-800 text-xs font-bold px-4 py-1 rounded-full border border-emerald-200 uppercase">
          Form Perincian Biaya Perawatan Pasien Rawat Inap (Ranap)
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Bagian Data Identitas Pasien */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">No. Registrasi / RM</label>
            <input 
              type="text" 
              value={formData.noReg}
              onChange={(e) => setFormData({...formData, noReg: e.target.value})}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nama Pasien</label>
            <input 
              type="text" 
              placeholder="Nama lengkap pasien"
              value={formData.nama}
              onChange={(e) => setFormData({...formData, nama: e.target.value})}
              required
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Umur</label>
            <input 
              type="text" 
              placeholder="Contoh: 45 Tahun"
              value={formData.umur}
              onChange={(e) => setFormData({...formData, umur: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-600 mb-1">Alamat</label>
            <input 
              type="text" 
              placeholder="Alamat lengkap pasien"
              value={formData.alamat}
              onChange={(e) => setFormData({...formData, alamat: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Ruang / Kelas Perawatan</label>
            <input 
              type="text" 
              value={formData.ruang}
              onChange={(e) => setFormData({...formData, ruang: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Diagnosa Penyakit</label>
            <input 
              type="text" 
              placeholder="Diagnosa medis"
              value={formData.diagnosa}
              onChange={(e) => setFormData({...formData, diagnosa: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Masuk</label>
            <input 
              type="date" 
              value={formData.masukTgl}
              onChange={(e) => setFormData({...formData, masukTgl: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Keluar</label>
            <input 
              type="date" 
              value={formData.keluarTgl}
              onChange={(e) => setFormData({...formData, keluarTgl: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Tabel Rincian Biaya */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                <th className="p-3">Uraian Biaya / Layanan</th>
                <th className="p-3 text-center">Vol</th>
                <th className="p-3 text-right">Tarif Satuan (Rp)</th>
                <th className="p-3 text-right">Jumlah Total (Rp)</th>
                <th className="p-3 text-right">Ditanggung (Pihak III)</th>
                <th className="p-3 text-right">Selisih (Pasien)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {items.map((item, idx) => {
                const subTotal = item.volume * item.tarif;
                const selisih = subTotal - Number(item.ditanggung);
                return (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="p-3 font-semibold text-slate-800">{item.namaItem}</td>
                    <td className="p-3 text-center">
                      <input 
                        type="number" 
                        value={item.volume}
                        onChange={(e) => handleItemChange(idx, 'volume', parseFloat(e.target.value) || 0)}
                        className="w-16 text-center px-2 py-1 rounded-lg border border-slate-300"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input 
                        type="number" 
                        value={item.tarif}
                        onChange={(e) => handleItemChange(idx, 'tarif', parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-1 rounded-lg border border-slate-300"
                      />
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">
                      Rp {subTotal.toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right">
                      <input 
                        type="number" 
                        value={item.ditanggung}
                        onChange={(e) => handleItemChange(idx, 'ditanggung', parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-1 rounded-lg border border-slate-300 text-emerald-700 font-semibold"
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
              <tr className="bg-emerald-50/60 font-black text-slate-900 border-t-2 border-emerald-500">
                <td colSpan={3} className="p-3 text-right uppercase">Jumlah Total Perawatan:</td>
                <td className="p-3 text-right text-emerald-900 text-sm">Rp {totalJumlah.toLocaleString('id-ID')}</td>
                <td className="p-3 text-right text-emerald-700 text-sm">Rp {totalDitanggung.toLocaleString('id-ID')}</td>
                <td className="p-3 text-right text-rose-700 text-sm">Rp {totalSelisih > 0 ? totalSelisih.toLocaleString('id-ID') : '0'}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bagian Tanda Tangan / Verifikasi Admin */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Dokter Yang Merawat</label>
            <input 
              type="text" 
              placeholder="Nama Dokter"
              value={formData.dokterMerawat}
              onChange={(e) => setFormData({...formData, dokterMerawat: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Kepala Ruangan</label>
            <input 
              type="text" 
              placeholder="Nama Kepala Ruangan"
              value={formData.kepalaRuangan}
              onChange={(e) => setFormData({...formData, kepalaRuangan: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Bendahara / Verifikator Admin</label>
            <input 
              type="text" 
              value={formData.bendahara}
              onChange={(e) => setFormData({...formData, bendahara: e.target.value})}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium bg-slate-100 font-bold text-emerald-800"
            />
          </div>
        </div>

        {/* Tombol Aksi Simpan */}
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
  );
}