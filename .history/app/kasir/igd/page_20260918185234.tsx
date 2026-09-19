'use client';

import React, { useState, useMemo } from 'react';
import { 
  Printer, Save, Calculator, Stethoscope, Search, UserCheck, 
  ShieldCheck, History, CheckCircle2, Clock, AlertCircle, FileText 
} from 'lucide-react';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface ItemTindakan {
  id: string;
  nama: string;
  tarif: number;
  kategori: string;
}

interface RiwayatVerifikasi {
  id: number;
  tanggal: string;
  adminName: string;
  status: 'Disetujui' | 'Direvisi' | 'Menunggu';
  catatan: string;
}

const daftarTindakanIGD: ItemTindakan[] = [
  { id: '1', nama: 'Jahit Luka - Kecil (1-5 jahitan)', tarif: 100000, kategori: 'Bedah Minor' },
  { id: '2', nama: 'Jahit Luka - Sedang (6-15 jahitan)', tarif: 150000, kategori: 'Bedah Minor' },
  { id: '3', nama: 'Jahit Luka - Besar (15-20 jahitan)', tarif: 200000, kategori: 'Bedah Minor' },
  { id: '4', nama: 'Jahit Luka - Sangat Besar/Penyulit (>20 jahitan)', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '5', nama: 'Ekstraksi kuku', tarif: 150000, kategori: 'Bedah Minor' },
  { id: '6', nama: 'Incisi Abses', tarif: 160000, kategori: 'Bedah Minor' },
  { id: '7', nama: 'Angkat Peluru/gram', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '8', nama: 'Ekstraksi Corpus Alienum Mata', tarif: 250000, kategori: 'Tindakan Khusus' },
  { id: '9', nama: 'Ekstraksi Corpus Alienum THT', tarif: 150000, kategori: 'Tindakan Khusus' },
  { id: '10', nama: 'Debridement Luka Kecil', tarif: 100000, kategori: 'Perawatan Luka' },
  { id: '11', nama: 'Debridement Luka Digigit Binatang (Diluar Obat Anti Bisa)', tarif: 150000, kategori: 'Perawatan Luka' },
  { id: '12', nama: 'Pemasangan Dower Kateter', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '13', nama: 'Explorasi Luka (Tidak Tembus)', tarif: 200000, kategori: 'Bedah Minor' },
  { id: '14', nama: 'Explorasi Luka Tusuk Paku', tarif: 100000, kategori: 'Bedah Minor' },
  { id: '15', nama: 'Angkat Jahitan 1-10 Jahitan', tarif: 50000, kategori: 'Perawatan Luka' },
  { id: '16', nama: 'Pasang NGT', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '17', nama: 'Pasang IVFD (Infus)', tarif: 50000, kategori: 'Tindakan Keperawatan' },
  { id: '18', nama: 'Bilas Lambung + dengan NGT', tarif: 150000, kategori: 'Tindakan Khusus' },
  { id: '19', nama: 'Punctie Thorax', tarif: 200000, kategori: 'Tindakan Medis' },
  { id: '20', nama: 'Pasang Spalk Jari', tarif: 50000, kategori: 'Ortopedi' },
  { id: '21', nama: 'Pasang Spalk Tungkai Atas (Tangan)', tarif: 90000, kategori: 'Ortopedi' },
  { id: '22', nama: 'Pasang Spalk Tungkai Bawah (Kaki)', tarif: 100000, kategori: 'Ortopedi' },
  { id: '23', nama: 'Suctioning/isap lendir jalan nafas (pertindakan)', tarif: 40000, kategori: 'Resusitasi' },
  { id: '24', nama: 'Pemberian Stesolid', tarif: 10000, kategori: 'Farmasi/Tindakan' },
  { id: '25', nama: 'Pasang Gips', tarif: 400000, kategori: 'Ortopedi' },
  { id: '26', nama: 'Anuscopy', tarif: 150000, kategori: 'Diagnostik' },
  { id: '27', nama: 'Rectal Toucher / Vagina Toucher', tarif: 50000, kategori: 'Diagnostik' },
  { id: '28', nama: 'Nebulizer Inhalation', tarif: 100000, kategori: 'Resusitasi' },
  { id: '29', nama: 'Resusitasi Jantung Paru Dewasa', tarif: 250000, kategori: 'Emergensi' },
  { id: '30', nama: 'Resusitasi Jantung Paru Anak / Bayi', tarif: 250000, kategori: 'Emergensi' },
  { id: '31', nama: 'Debridement Luka Bakar: 1-9%', tarif: 80000, kategori: 'Luka Bakar' },
  { id: '32', nama: 'Debridement Luka Bakar: 9-18%', tarif: 100000, kategori: 'Luka Bakar' },
  { id: '33', nama: 'Debridement Luka Bakar: 18-36%', tarif: 150000, kategori: 'Luka Bakar' },
  { id: '34', nama: 'Debridement Luka Bakar: >36%', tarif: 250000, kategori: 'Luka Bakar' },
  { id: '35', nama: 'Vena Sectio', tarif: 320000, kategori: 'Bedah Minor' },
  { id: '36', nama: 'Pasang Tampon Hidung/ Epistaksis', tarif: 100000, kategori: 'Tindakan Khusus' },
  { id: '37', nama: 'Pasang ETT (Endo Tracheal Tube)/ Intubasi', tarif: 300000, kategori: 'Emergensi' },
  { id: '38', nama: 'DC Shock', tarif: 350000, kategori: 'Emergensi' },
  { id: '39', nama: 'Ganti Perban', tarif: 50000, kategori: 'Perawatan Luka' },
  { id: '40', nama: 'Pasang Guide', tarif: 20000, kategori: 'Alat Bantu' },
  { id: '41', nama: 'EKG', tarif: 100000, kategori: 'Diagnostik' },
  { id: '42', nama: 'Monitor Vital Sign', tarif: 100000, kategori: 'Observasi' },
  { id: '43', nama: 'Syringe Pump', tarif: 100000, kategori: 'Alat Medis' },
  { id: '44', nama: 'Infus Pump', tarif: 100000, kategori: 'Alat Medis' },
  { id: '45', nama: 'Glukotest', tarif: 30000, kategori: 'Diagnostik' },
  { id: '46', nama: 'Doppler', tarif: 50000, kategori: 'Diagnostik' },
  { id: '47', nama: 'Tracheostomi', tarif: 400000, kategori: 'Bedah Minor' },
  { id: '48', nama: 'Spalk Kecil', tarif: 50000, kategori: 'Ortopedi' },
  { id: '49', nama: 'Spalk Sedang', tarif: 75000, kategori: 'Ortopedi' },
  { id: '50', nama: 'Spalk Besar', tarif: 100000, kategori: 'Ortopedi' },
  { id: '51', nama: 'Pasang spalk infus anak', tarif: 50000, kategori: 'Ortopedi' },
  { id: '52', nama: 'Konsul dokter Spesialis', tarif: 50000, kategori: 'Konsultasi' },
  { id: '53', nama: 'Infus Intra Osteus', tarif: 100000, kategori: 'Tindakan Khusus' },
  { id: '54', nama: 'Infus Intra Umbilical', tarif: 200000, kategori: 'Tindakan Khusus' },
  { id: '55', nama: 'ODC (One Day Care) diluar obat dan tindakan', tarif: 100000, kategori: 'Perawatan' },
  { id: '56', nama: 'Irigasi mata', tarif: 50000, kategori: 'Tindakan Khusus' },
  { id: '57', nama: 'Perawatan bayi baru lahir di UGD (Tali pusat)', tarif: 50000, kategori: 'Kebidanan' },
  { id: '58', nama: 'Incubator', tarif: 80000, kategori: 'Fasilitas' },
  { id: '59', nama: 'Bebat tekan luka', tarif: 75000, kategori: 'Perawatan Luka' },
  { id: '60', nama: 'Pasang elastis verban fraktur clavikula', tarif: 80000, kategori: 'Ortopedi' },
  { id: '61', nama: 'Pasang cervical collar', tarif: 50000, kategori: 'Ortopedi' },
  { id: '62', nama: 'Rectal Suppos', tarif: 20000, kategori: 'Farmasi/Tindakan' },
  { id: '63', nama: 'Pasang elastis verband', tarif: 50000, kategori: 'Ortopedi' },
  { id: '64', nama: 'Reposisi Mandibula', tarif: 300000, kategori: 'Bedah Minor' },
  { id: '65', nama: 'WSD (Chest Tube)', tarif: 500000, kategori: 'Bedah Minor' },
  { id: '66', nama: 'Aspirasi cairan pleura', tarif: 100000, kategori: 'Tindakan Medis' },
  { id: '67', nama: 'Pasang stogger', tarif: 40000, kategori: 'Alat Bantu' },
  { id: '68', nama: 'Pasang Katheter Urine', tarif: 100000, kategori: 'Tindakan Keperawatan' },
  { id: '69', nama: 'Visum', tarif: 100000, kategori: 'Legal Medis' },
  { id: '70', nama: 'Pemeriksaan Surat Keterangan Klaim Asuransi', tarif: 100000, kategori: 'Administrasi' },
  { id: '71', nama: 'Pungsi supra pubic', tarif: 150000, kategori: 'Tindakan Medis' },
  { id: '72', nama: 'Extubasi', tarif: 50000, kategori: 'Emergensi' },
  { id: '73', nama: 'Pemasangan selimut pemanas', tarif: 480000, kategori: 'Fasilitas' },
  { id: '74', nama: 'Pasang Jackson Reis', tarif: 100000, kategori: 'Alat Medis' },
  { id: '75', nama: 'Pemasangan Oxymetri', tarif: 30000, kategori: 'Monitoring' },
];

export default function FormKasirIGD() {
  // Akun Kasir Aktif
  const activeCashier = {
    nama: 'KONIA',
    id: '15588518525811158',
    role: 'VERIFIED KASIR'
  };

  const [formData, setFormData] = useState({
    nama: '',
    ttl: '',
    alamat: '',
    noRm: '',
    tanggal: new Date().toISOString().split('T')[0],
    dokter: '',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});

  // Contoh Data Riwayat Verifikasi Admin
  const [riwayatVerifikasi] = useState<RiwayatVerifikasi[]>([
    { id: 1, tanggal: '18/09/2026 14:20 WIB', adminName: 'Admin Verifikator 1', status: 'Disetujui', catatan: 'Rincian biaya tindakan IGD sesuai dengan rekam medis fisik.' },
    { id: 2, tanggal: '17/09/2026 09:10 WIB', adminName: 'Admin Verifikator 2', status: 'Disetujui', catatan: 'Validasi klaim darurat sukses.' }
  ]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQtyChange = (id: string, qty: number) => {
    const updated = { ...selectedItems };
    if (qty <= 0) {
      delete updated[id];
    } else {
      updated[id] = qty;
    }
    setSelectedItems(updated);
  };

  const filteredTindakan = useMemo(() => {
    return daftarTindakanIGD.filter((item) =>
      item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const totalTarif = Object.entries(selectedItems).reduce((sum, [id, qty]) => {
    const item = daftarTindakanIGD.find((t) => t.id === id);
    return sum + (item ? item.tarif * qty : 0);
  }, 0);

  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      <KasirHeader
        {...({ cashierName: activeCashier.nama, cashierId: activeCashier.id } as unknown as React.ComponentProps<typeof KasirHeader>)}
      />

      <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
        <div className="bg-white text-slate-800 shadow-2xl rounded-3xl p-6 sm:p-10 border border-slate-200">
          
          {/* KOP SURAT RESMI RSUD BUKIT KERMAN */}
          <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">PEMERINTAH KABUPATEN KERINCI</p>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600">DINAS KESEHATAN</p>
            <h1 className="text-xl font-black uppercase tracking-wide text-slate-900 mt-1">RSUD BUKIT KERMAN</h1>
            <p className="text-[11px] text-slate-500">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
            <p className="text-[11px] text-slate-500">Website: https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
            
            <div className="inline-block bg-slate-900 text-white text-xs font-extrabold px-6 py-1.5 rounded-full mt-3 uppercase tracking-widest shadow">
              FORMULIR PEMERIKSAAN &amp; RINCIAN BIAYA IGD
            </div>
          </div>

          {/* INFORMASI PETUGAS PENGINPUT DATA (PENANGGUNG JAWAB SESI) */}
          <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-black shadow-inner">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700">Petugas Penginput Data (Penanggung Jawab Sesi)</p>
                <p className="text-sm font-black text-slate-900">{activeCashier.nama} <span className="text-xs font-medium text-slate-500">(NIP / ID: {activeCashier.id})</span></p>
              </div>
            </div>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-emerald-300">
              STATUS AKSES: {activeCashier.role}
            </span>
          </div>

          {/* FORM INPUT DATA PASIEN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6">
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nama Pasien</label>
              <input 
                type="text" 
                name="nama" 
                value={formData.nama} 
                onChange={handleInputChange} 
                placeholder="Masukkan nama lengkap pasien" 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nomor Rekam Medis (No RM)</label>
              <input 
                type="text" 
                name="noRm" 
                value={formData.noRm} 
                onChange={handleInputChange} 
                placeholder="Contoh: 00-12-34" 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tempat, Tanggal Lahir (TTL)</label>
              <input 
                type="text" 
                name="ttl" 
                value={formData.ttl} 
                onChange={handleInputChange} 
                placeholder="Contoh: Kerinci, 12 Januari 1990" 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tanggal Pemeriksaan</label>
              <input 
                type="date" 
                name="tanggal" 
                value={formData.tanggal} 
                onChange={handleInputChange} 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Alamat Lengkap</label>
              <input 
                type="text" 
                name="alamat" 
                value={formData.alamat} 
                onChange={handleInputChange} 
                placeholder="Masukkan alamat domisili pasien" 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Dokter Pemeriksa IGD</label>
              <input 
                type="text" 
                name="dokter" 
                value={formData.dokter} 
                onChange={handleInputChange} 
                placeholder="Nama Dokter Jaga IGD" 
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          {/* PENCARIAN & TABEL PEMERIKSAAN IGD */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-sky-600" /> Daftar Tindakan &amp; Pemeriksaan IGD
            </h3>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari tindakan medis..." 
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-6 shadow-sm max-h-[450px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-900 text-white uppercase text-[10px] z-10">
                <tr>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Jenis Pemeriksaan / Tindakan Medis IGD</th>
                  <th className="p-3 text-right">Tarif (Rp)</th>
                  <th className="p-3 text-center w-24">Jumlah (Qty)</th>
                  <th className="p-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTindakan.length > 0 ? (
                  filteredTindakan.map((item) => {
                    const qty = selectedItems[item.id] || 0;
                    const subtotal = qty * item.tarif;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-bold text-[10px] text-sky-700 uppercase">{item.kategori}</td>
                        <td className="p-3 font-bold text-slate-800">{item.nama}</td>
                        <td className="p-3 text-right text-slate-600">{formatRupiah(item.tarif)}</td>
                        <td className="p-3 text-center">
                          <input 
                            type="number" 
                            min="0" 
                            value={qty === 0 ? '' : qty} 
                            onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)} 
                            placeholder="0"
                            className="w-16 p-1.5 text-center border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500"
                          />
                        </td>
                        <td className="p-3 text-right font-black text-sky-700">
                          {subtotal > 0 ? formatRupiah(subtotal) : '-'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      Tindakan tidak ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAL KESELURUHAN TARIF */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-lg">
            <div className="flex items-center space-x-2">
              <Calculator className="w-6 h-6 text-sky-400" />
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Biaya Tindakan IGD</p>
                <p className="text-lg font-black text-white">Akumulasi Seluruh Pemeriksaan</p>
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight font-mono">
              {formatRupiah(totalTarif)}
            </div>
          </div>

          {/* DATA RIWAYAT VERIFIKASI ADMIN */}
          <div className="mb-8 border border-slate-200 rounded-2xl p-5 bg-slate-50">
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-sky-600" /> Riwayat Verifikasi Admin RSUD
            </h4>
            <div className="space-y-2.5">
              {riwayatVerifikasi.map((item) => (
                <div key={item.id} className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
                  <div className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900">{item.adminName}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">{item.status}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5">{item.catatan}</p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {item.tanggal}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TANDA TANGAN / LEMBAR PENGESAHAN */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs font-medium text-slate-700 mb-8 pt-4">
            <div>
              <p className="mb-16">Pasien / PJ Pasien / Keluarga</p>
              <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[180px] uppercase">
                ({formData.nama || '...........................................'})
              </p>
            </div>
            <div>
              <p className="mb-1">Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="mb-14">Petugas Kasir (Penanggung Jawab)</p>
              <p className="font-bold border-b border-slate-400 pb-1 inline-block min-w-[180px] uppercase">
                ( {activeCashier.nama} )
              </p>
            </div>
          </div>

          {/* TOMBOL AKSI CETAK / SIMPAN */}
          <div className="flex items-center justify-end gap-3 print:hidden border-t border-slate-200 pt-4">
            <button 
              onClick={handlePrint}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
            >
              <Printer className="w-4 h-4 text-sky-400" /> Cetak Formulir
            </button>
            <button 
              onClick={() => alert('Data rincian biaya IGD berhasil disimpan & direkam oleh kasir!')}
              className="px-6 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
            >
              <Save className="w-4 h-4" /> Simpan &amp; Kirim ke Admin
            </button>
          </div>

        </div>
      </main>

      <KasirFooter />
    </div>
  );
}