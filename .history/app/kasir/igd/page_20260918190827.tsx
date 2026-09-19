'use client';

import React, { useState, useMemo } from 'react';
import { 
  Printer, Save, Calculator, Stethoscope, Search, UserCheck, 
  History, CheckCircle2, Clock, FileText, Eye, Trash2, AlertCircle, RefreshCw, ArrowLeft, X 
} from 'lucide-react';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface ItemTindakan {
  id: string;
  nama: string;
  tarif: number;
  kategori: string;
}

interface TagihanRecord {
  id: string;
  noRm: string;
  namaPasien: string;
  ttl: string;
  alamat: string;
  tanggal: string;
  dokter: string;
  items: { [key: string]: number };
  totalTarif: number;
  status: 'Menunggu Verifikasi' | 'Disetujui' | 'Direvisi';
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
  const [activeTab, setActiveTab] = useState<'form' | 'riwayat'>('form');
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TagihanRecord | null>(null);

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
  const [riwayatSearchTerm, setRiwayatSearchTerm] = useState('');
  const [selectedItems, setSelectedItems] = useState<{ [key: string]: number }>({});

  // KOSONGKAN DATA DUMMY (Murni berdasarkan input kasir)
  const [riwayatTagihan, setRiwayatTagihan] = useState<TagihanRecord[]>([]);

  // DETEKSI OTOMATIS JIKA PASIEN SUDAH PERNAH BEROBAT BERDASARKAN NO RM
  const pasienPreviousHistory = useMemo(() => {
    if (!formData.noRm.trim()) return [];
    return riwayatTagihan.filter(
      (item) => item.noRm.toLowerCase().trim() === formData.noRm.toLowerCase().trim()
    );
  }, [formData.noRm, riwayatTagihan]);

  const autofillPasienData = (rec: TagihanRecord) => {
    setFormData((prev) => ({
      ...prev,
      nama: rec.namaPasien,
      ttl: rec.ttl,
      alamat: rec.alamat,
    }));
  };

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

  const filteredRiwayat = useMemo(() => {
    return riwayatTagihan.filter((item) =>
      item.noRm.toLowerCase().includes(riwayatSearchTerm.toLowerCase()) ||
      item.namaPasien.toLowerCase().includes(riwayatSearchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(riwayatSearchTerm.toLowerCase())
    );
  }, [riwayatTagihan, riwayatSearchTerm]);

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

  const handleSaveAndSend = () => {
    if (!formData.nama || !formData.noRm) {
      alert('Mohon lengkapi Nama Pasien dan Nomor Rekam Medis (No RM) terlebih dahulu!');
      return;
    }
    if (Object.keys(selectedItems).length === 0) {
      alert('Mohon pilih minimal 1 tindakan medis / pemeriksaan!');
      return;
    }

    const newRecord: TagihanRecord = {
      id: `IGD-${new Date().getFullYear()}-${String(riwayatTagihan.length + 1).padStart(3, '0')}`,
      noRm: formData.noRm,
      namaPasien: formData.nama,
      ttl: formData.ttl,
      alamat: formData.alamat,
      tanggal: new Date().toLocaleDateString('id-ID'),
      dokter: formData.dokter || 'Dokter Jaga IGD',
      items: { ...selectedItems },
      totalTarif: totalTarif,
      status: 'Menunggu Verifikasi'
    };

    setRiwayatTagihan([newRecord, ...riwayatTagihan]);
    alert(`Data rincian biaya IGD untuk pasien ${formData.nama} (RM: ${formData.noRm}) berhasil disimpan & dikirim!`);
    
    // Reset Form untuk Input Berikutnya
    setFormData({
      nama: '',
      ttl: '',
      alamat: '',
      noRm: '',
      tanggal: new Date().toISOString().split('T')[0],
      dokter: '',
    });
    setSelectedItems({});
    setActiveTab('riwayat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      <div className="print:hidden">
        <KasirHeader 
          title="RSUD BUKIT KERMAN"
          subtitle="Modul Input Perincian Biaya IGD (Kasir)"
          userName={activeCashier.nama} 
        />
      </div>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-6 sm:py-8 w-full">
        
        {/* TOMBOL KEMBALI & NAVIGASI UTAMA */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali</span>
            </button>
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shadow-sm ${
                activeTab === 'form' 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-md' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Form Input Pemeriksaan IGD</span>
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold transition cursor-pointer shadow-sm ${
                activeTab === 'riwayat' 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20 shadow-md' 
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Daftar Riwayat &amp; Akumulasi Tagihan ({riwayatTagihan.length})</span>
            </button>
          </div>
        </div>

        {/* KONTEN TAB 1: FORM INPUT */}
        {activeTab === 'form' && (
          <div className="bg-white text-slate-800 shadow-2xl rounded-3xl p-6 sm:p-10 border border-slate-200 print:shadow-none print:border-none print:p-0">
            
            {/* KOP SURAT RESMI DENGAN LOGO PEMKAB KERINCI & RSUD BUKIT KERMAN */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                <img src="/logo-kerinci.png" alt="Pemkab Kerinci" className="max-h-full max-w-full object-contain" />
              </div>
              
              <div className="text-center px-2 flex-grow">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">PEMERINTAH KABUPATEN KERINCI</p>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-700">DINAS KESEHATAN</p>
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-wide text-slate-900 mt-0.5">RSUD BUKIT KERMAN</h1>
                <p className="text-[10px] sm:text-[11px] text-slate-600">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                <p className="text-[10px] sm:text-[11px] text-slate-600">Website: https://rsudbukitkerman.kerincikab.go.id | e-mail: rsubukitkerman@gmail.com</p>
              </div>

              <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 flex items-center justify-center">
                <img src="/logo-rsud.jpeg" alt="RSUD Bukit Kerman" className="max-h-full max-w-full object-contain rounded-lg" />
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="inline-block bg-slate-900 text-white text-xs font-extrabold px-6 py-1.5 rounded-full uppercase tracking-widest shadow print:border print:border-slate-900 print:text-black print:bg-transparent">
                FORMULIR PEMERIKSAAN &amp; RINCIAN BIAYA IGD
              </div>
            </div>

            {/* INFORMASI PETUGAS PENGINPUT DATA */}
            <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm print:hidden">
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

            {/* NOTIFIKASI DETEKSI PASIEN BEROBAT >1 KALI */}
            {pasienPreviousHistory.length > 0 && (
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-2xl mb-6 shadow-sm print:hidden">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-grow">
                    <p className="text-xs font-black text-amber-900 uppercase">
                      Pasien Ditemukan! Terdeteksi {pasienPreviousHistory.length} Kali Kunjungan IGD Sebelumnya.
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Nomor RM <span className="font-bold">{formData.noRm}</span> sudah terdaftar atas nama <span className="font-bold">{pasienPreviousHistory[0].namaPasien}</span>.
                    </p>
                    <button
                      onClick={() => autofillPasienData(pasienPreviousHistory[0])}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold transition shadow cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Isi Otomatis Biodata Pasien
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* FORM INPUT DATA PASIEN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-6 print:bg-transparent print:border-none print:p-0">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nomor Rekam Medis (No RM)</label>
                <input 
                  type="text" 
                  name="noRm" 
                  value={formData.noRm} 
                  onChange={handleInputChange} 
                  placeholder="Ketik No RM untuk pencarian otomatis (Contoh: 00-12-34)" 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-sky-800 focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Nama Pasien</label>
                <input 
                  type="text" 
                  name="nama" 
                  value={formData.nama} 
                  onChange={handleInputChange} 
                  placeholder="Masukkan nama lengkap pasien" 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
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
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Tanggal Pemeriksaan</label>
                <input 
                  type="date" 
                  name="tanggal" 
                  value={formData.tanggal} 
                  onChange={handleInputChange} 
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
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
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
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
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-sky-500 print:border-none print:p-0"
                />
              </div>
            </div>

            {/* PENCARIAN & TABEL PEMERIKSAAN IGD */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-3 print:hidden">
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

            <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-6 shadow-sm max-h-[450px] overflow-y-auto print:max-h-none print:border-slate-800 print:rounded-none">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 bg-slate-900 text-white uppercase text-[10px] z-10 print:static print:bg-slate-200 print:text-black">
                  <tr>
                    <th className="p-3 border-b">Kategori</th>
                    <th className="p-3 border-b">Jenis Pemeriksaan / Tindakan Medis IGD</th>
                    <th className="p-3 text-right border-b">Tarif (Rp)</th>
                    <th className="p-3 text-center w-24 border-b">Jumlah (Qty)</th>
                    <th className="p-3 text-right border-b">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                  {filteredTindakan.length > 0 ? (
                    filteredTindakan.map((item) => {
                      const qty = selectedItems[item.id] || 0;
                      const subtotal = qty * item.tarif;
                      
                      if (typeof window !== 'undefined' && window.matchMedia('print').matches && qty === 0) {
                        return null;
                      }

                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-bold text-[10px] text-sky-700 uppercase print:text-black">{item.kategori}</td>
                          <td className="p-3 font-bold text-slate-800">{item.nama}</td>
                          <td className="p-3 text-right text-slate-600">{formatRupiah(item.tarif)}</td>
                          <td className="p-3 text-center">
                            <input 
                              type="number" 
                              min="0" 
                              value={qty === 0 ? '' : qty} 
                              onChange={(e) => handleQtyChange(item.id, parseInt(e.target.value) || 0)} 
                              placeholder="0"
                              className="w-16 p-1.5 text-center border border-slate-300 rounded-lg text-xs font-bold bg-white focus:ring-2 focus:ring-sky-500 print:border-none"
                            />
                          </td>
                          <td className="p-3 text-right font-black text-sky-700 print:text-black">
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
            <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow-lg print:bg-slate-100 print:text-black print:border print:border-slate-800 print:shadow-none">
              <div className="flex items-center space-x-2">
                <Calculator className="w-6 h-6 text-sky-400 print:text-black" />
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold print:text-black">Total Biaya Tindakan IGD</p>
                  <p className="text-lg font-black text-white print:text-black">Akumulasi Seluruh Pemeriksaan</p>
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-sky-400 tracking-tight font-mono print:text-black">
                {formatRupiah(totalTarif)}
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
                onClick={handleSaveAndSend}
                className="px-6 py-2.5 bg-sky-700 hover:bg-sky-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
              >
                <Save className="w-4 h-4" /> Simpan &amp; Kirim ke Admin
              </button>
            </div>

          </div>
        )}

        {/* KONTEN TAB 2: DAFTAR RIWAYAT & AKUMULASI TAGIHAN */}
        {activeTab === 'riwayat' && (
          <div className="bg-white text-slate-800 shadow-2xl rounded-3xl p-6 sm:p-10 border border-slate-200 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-sm font-black uppercase text-slate-900">Daftar Riwayat &amp; Akumulasi Tagihan IGD</h2>
                <p className="text-xs text-slate-500">Semua rekapitulasi tagihan pasien IGD yang telah diinput oleh loket kasir.</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-grow sm:w-64">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input 
                    type="text" 
                    value={riwayatSearchTerm}
                    onChange={(e) => setRiwayatSearchTerm(e.target.value)}
                    placeholder="Cari No RM / Nama Pasien..." 
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('form')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer flex-shrink-0"
                >
                  + Input Baru
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-3">ID Transaksi</th>
                    <th className="p-3">No RM / Nama Pasien</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Dokter Pemeriksa</th>
                    <th className="p-3 text-right">Total Tarif</th>
                    <th className="p-3 text-center">Status (Admin)</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRiwayat.length > 0 ? (
                    filteredRiwayat.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-bold text-sky-700">{item.id}</td>
                        <td className="p-3">
                          <p className="font-bold text-slate-900">{item.namaPasien}</p>
                          <p className="text-[10px] text-slate-500 font-mono font-bold">RM: {item.noRm}</p>
                        </td>
                        <td className="p-3 text-slate-600">{item.tanggal}</td>
                        <td className="p-3 text-slate-700 font-medium">{item.dokter}</td>
                        <td className="p-3 text-right font-black text-emerald-700">{formatRupiah(item.totalTarif)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            item.status === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 
                            item.status === 'Direvisi' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button 
                              onClick={() => setSelectedDetailRecord(item)}
                              className="p-1.5 bg-slate-100 hover:bg-sky-100 hover:text-sky-600 rounded-lg transition cursor-pointer"
                              title="Lihat Rincian & Status Admin"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                setRiwayatTagihan(riwayatTagihan.filter(r => r.id !== item.id));
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 hover:text-rose-600 rounded-lg transition cursor-pointer"
                              title="Hapus Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                        {riwayatTagihan.length === 0 
                          ? 'Belum ada data riwayat tagihan IGD yang diinput.' 
                          : 'Pencarian pasien tidak ditemukan.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* MODAL RINCIAN & STATUS ADMIN (READ-ONLY) */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 print:p-0">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-slate-900">Rincian Tagihan &amp; Status Admin</h3>
                <p className="text-[11px] text-slate-500 font-mono">ID Transaksi: {selectedDetailRecord.id}</p>
              </div>
              <button 
                onClick={() => setSelectedDetailRecord(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* STATUS BANNER */}
            <div className={`p-4 rounded-2xl mb-5 flex items-center justify-between border ${
              selectedDetailRecord.status === 'Disetujui' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
              selectedDetailRecord.status === 'Direvisi' ? 'bg-rose-50 border-rose-200 text-rose-900' :
              'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Status Verifikasi oleh Admin Rumah Sakit</p>
                <p className="text-sm font-black uppercase mt-0.5">{selectedDetailRecord.status}</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-white/80 rounded-full shadow-sm">
                {selectedDetailRecord.status === 'Disetujui' ? 'Tervalidasi' : 'Dalam Pengecekan'}
              </span>
            </div>

            {/* BIODATA PASIEN */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-500 font-medium">No. RM:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.noRm}</span></div>
                <div><span className="text-slate-500 font-medium">Tanggal:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.tanggal}</span></div>
                <div><span className="text-slate-500 font-medium">Nama Pasien:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.namaPasien}</span></div>
                <div><span className="text-slate-500 font-medium">Dokter:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.dokter}</span></div>
                <div className="col-span-2"><span className="text-slate-500 font-medium">Alamat:</span> <span className="font-bold text-slate-900">{selectedDetailRecord.alamat || '-'}</span></div>
              </div>
            </div>

            {/* TABEL ITEM RINCIAN TINDAKAN */}
            <h4 className="text-xs font-black uppercase text-slate-900 mb-2">Item Pemeriksaan &amp; Tindakan Medis</h4>
            <div className="border border-slate-200 rounded-2xl overflow-hidden mb-6">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-white uppercase text-[10px]">
                  <tr>
                    <th className="p-2.5">Nama Tindakan</th>
                    <th className="p-2.5 text-center">Qty</th>
                    <th className="p-2.5 text-right">Tarif</th>
                    <th className="p-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(selectedDetailRecord.items).map(([id, qty]) => {
                    const item = daftarTindakanIGD.find(t => t.id === id);
                    if (!item) return null;
                    const subtotal = qty * item.tarif;
                    return (
                      <tr key={id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-800">{item.nama}</td>
                        <td className="p-2.5 text-center font-bold">{qty}</td>
                        <td className="p-2.5 text-right text-slate-600">{formatRupiah(item.tarif)}</td>
                        <td className="p-2.5 text-right font-black text-sky-700">{formatRupiah(subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TOTAL */}
            <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-2xl mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Keseluruhan Biaya</span>
              <span className="text-lg font-black font-mono text-sky-400">{formatRupiah(selectedDetailRecord.totalTarif)}</span>
            </div>

            {/* TOMBOL TUTUP */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedDetailRecord(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Tutup Rincian
              </button>
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