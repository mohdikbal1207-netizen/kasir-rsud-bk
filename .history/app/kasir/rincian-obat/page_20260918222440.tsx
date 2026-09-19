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
  FileText
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
  status_verifikasi: string;
  is_locked: boolean;
  created_at: string;
  rincian_obat_detail?: DetailItem[];
}

export default function KasirRincianObatPage() {
  const router = useRouter();
  const [records, setRecords] = useState<RincianObatRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [noRm, setNoRm] = useState('');
  const [namaPasien, setNamaPasien] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState('Rawat Jalan');
  const [penanggungJawab, setPenanggungJawab] = useState('Apoteker RSUD Bukit Kerman');
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

    // Subscribe Realtime
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

  const totalObatCalculated = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noRm || !namaPasien || items.some(i => !i.nama_obat_obhp || i.harga_satuan <= 0)) {
      alert('Mohon lengkapi No RM, Nama Pasien, serta Rincian Obat/OBHP.');
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
      setNoRm('');
      setNamaPasien('');
      setItems([{ nama_obat_obhp: '', jumlah: 1, harga_satuan: 0, subtotal: 0 }]);
      fetchRecords();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const filteredRecords = records.filter(r => 
    r.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.no_rm.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.no_transaksi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <KasirHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Input & Cetak Rincian Biaya Obat-Obatan & OBHP"
        showBackButton={true}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 print:p-0 print:max-w-none">
        
        {/* TOP BAR ACTION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-6 h-6 text-emerald-600" /> Rincian Biaya Obat &amp; OBHP (Kasir)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Input formulir lembar rincian obat per pasien. Data langsung terkunci begitu terkirim.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Input Rincian Obat Baru
          </button>
        </div>

        {/* REKAPAN TABEL DATA KASIR */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4 print:hidden">
          <div className="flex justify-between items-center gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pasien, RM, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">Total: {filteredRecords.length} Transaksi</span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">No. Transaksi</th>
                  <th className="p-3.5">Pasien / RM</th>
                  <th className="p-3.5">Layanan</th>
                  <th className="p-3.5 text-right">Total Biaya</th>
                  <th className="p-3.5 text-center">Akses Kasir</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                  <th className="p-3.5 text-center">Cetak</th>
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
                      <td className="p-3.5 font-mono font-bold text-slate-900">{r.no_transaksi}</td>
                      <td className="p-3.5">
                        <strong className="block text-slate-800">{r.nama_pasien}</strong>
                        <span className="text-[10px] text-amber-700 font-mono">{r.no_rm}</span>
                      </td>
                      <td className="p-3.5">{r.jenis_layanan}</td>
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
                        <button
                          onClick={() => setPrintRecord(r)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition cursor-pointer"
                          title="Pratinjau Lembar Rincian Cetak"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* MODAL INPUT FORMULIR RINCIAN OBAT & OBHP */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col justify-between">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase text-slate-900">Formulir Rincian Biaya Obat &amp; OBHP</h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">No. Rekam Medis (RM) *</label>
                  <input
                    type="text"
                    required
                    placeholder="RM-2026-001"
                    value={noRm}
                    onChange={(e) => setNoRm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pasien *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nama Pasien"
                    value={namaPasien}
                    onChange={(e) => setNamaPasien(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
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
              </div>

              {/* RINCIAN DINAMIS ITEM OBAT / OBHP */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 uppercase text-[11px]">Daftar Item Obat / OBHP</span>
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
                              required
                              placeholder="Contoh: Paracetamol 500mg / Spuit 3cc"
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

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex justify-between items-center">
                <span className="font-extrabold text-amber-900 uppercase">TOTAL OBAT / OBHP:</span>
                <span className="font-mono text-base font-black text-amber-900">{formatRupiah(totalObatCalculated)}</span>
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

      {/* MODAL PRATINJAU CETAKAN PERSIS GAMBAR LAMPIRAN */}
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
                <span>LAYANAN: {printRecord.jenis_layanan}</span>
              </div>
            </div>

            {/* TABEL HASIL FORMULIR PERSIS RANCANGAN GAMBAR */}
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
                  {/* Row Kosong Tambahan untuk Mengikuti Estetika Lembar Cetak */}
                  {[...Array(Math.max(0, 10 - (printRecord.rincian_obat_detail?.length || 0)))].map((_, i) => (
                    <tr key={`empty-${i}`} className="border-b border-black h-6">
                      <td className="border-r-2 border-black"></td>
                      <td className="border-r-2 border-black"></td>
                      <td></td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black font-black">
                    <td className="p-2 border-r-2 border-black uppercase font-bold text-left">TOTAL OBAT</td>
                    <td className="p-2 border-r-2 border-black"></td>
                    <td className="p-2 text-right font-mono">: {formatRupiah(printRecord.total_biaya)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* TANDA TANGAN PENANGGUNG JAWAB APOTEK */}
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

      <KasirFooter />
    </div>
  );
}