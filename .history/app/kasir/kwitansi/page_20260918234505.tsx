'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  Printer, 
  Plus, 
  X, 
  Lock, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface KwitansiRecord {
  id: number;
  nomor_bukti: string;
  kode_akun: string;
  sudah_terima_dari: string;
  banyaknya_uang: string;
  untuk_pembayaran: string;
  jumlah_uang: number;
  status_verifikasi: string;
  is_locked: boolean;
  created_at: string;
}

export default function KasirKwitansiPage() {
  const [records, setRecords] = useState<KwitansiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form State
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [kodeAkun, setKodeAkun] = useState<string>('5.2.2.01.01');
  const [sudahTerimaDari, setSudahTerimaDari] = useState<string>('');
  const [banyaknyaUang, setBanyaknyaUang] = useState<string>('');
  const [untukPembayaran, setUntukPembayaran] = useState<string>('');
  const [jumlahUang, setJumlahUang] = useState<number>(0);

  // Print Preview State
  const [printRecord, setPrintRecord] = useState<KwitansiRecord | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('kwitansi_header')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as KwitansiRecord[]);
      }
    } catch (err) {
      console.error('Gagal memuat kwitansi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    const channel = supabase
      .channel('kasir_realtime_kwitansi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kwitansi_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  const generateNomorBukti = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `KWT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomNum}`;
  };

  const handleOpenNewModal = () => {
    setKodeAkun('5.2.2.01.01');
    setSudahTerimaDari('');
    setBanyaknyaUang('');
    setUntukPembayaran('');
    setJumlahUang(0);
    setShowFormModal(true);
  };

  const handleSaveKwitansi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sudahTerimaDari || !untukPembayaran || jumlahUang <= 0) {
      showToast('Harap lengkapi seluruh kolom wajib dengan benar.', 'error');
      return;
    }

    try {
      const nomorBukti = generateNomorBukti();
      const payload = {
        nomor_bukti: nomorBukti,
        kode_akun: kodeAkun,
        sudah_terima_dari: sudahTerimaDari,
        banyaknya_uang: banyaknyaUang || `${jumlahUang.toLocaleString('id-ID')} Rupiah`,
        untuk_pembayaran: untukPembayaran,
        jumlah_uang: jumlahUang,
        status_verifikasi: 'Menunggu Verifikasi',
        is_locked: true
      };

      const { error } = await supabase.from('kwitansi_header').insert([payload]);
      if (error) throw error;

      showToast(`Kwitansi ${nomorBukti} berhasil diterbitkan dan dikirim!`, 'success');
      setShowFormModal(false);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err.message}`, 'error');
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const filteredRecords = records.filter(r => 
    (r.sudah_terima_dari || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.nomor_bukti || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Penerbitan Kwitansi Resmi" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-sky-600" /> Daftar Kwitansi Kasir
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Input kwitansi pembayaran. Data yang dikirim akan otomatis terkunci dan diverifikasi oleh Super Admin.</p>
          </div>
          <button
            onClick={handleOpenNewModal}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Buat Kwitansi Baru
          </button>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari Nomor Bukti, Penerima..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">Total: {filteredRecords.length} Kwitansi</span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">Nomor Bukti &amp; Akun</th>
                  <th className="p-3.5">Sudah Terima Dari</th>
                  <th className="p-3.5">Untuk Pembayaran</th>
                  <th className="p-3.5 text-right">Jumlah Uang</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi Cetak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">Memuat data...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-slate-400">Belum ada data kwitansi.</td></tr>
                ) : (
                  filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {r.nomor_bukti}
                        <span className="block text-[10px] text-slate-400 font-normal">Akun: {r.kode_akun}</span>
                      </td>
                      <td className="p-3.5 font-bold text-slate-800">{r.sudah_terima_dari}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.untuk_pembayaran}</td>
                      <td className="p-3.5 text-right font-mono font-black text-slate-900">{formatRupiah(r.jumlah_uang)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                          r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                          r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status_verifikasi}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setPrintRecord(r)}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl font-bold transition flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Cetak Kwitansi
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

      {/* MODAL INPUT KWITANSI */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-sky-600" /> Form Input Kwitansi RSUD Bukit Kerman
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <form onSubmit={handleSaveKwitansi} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Akun</label>
                  <input
                    type="text"
                    value={kodeAkun}
                    onChange={(e) => setKodeAkun(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sudah terima dari *</label>
                  <input
                    type="text"
                    placeholder="Contoh: BPJS CABANG MUARO BUNGO"
                    value={sudahTerimaDari}
                    onChange={(e) => setSudahTerimaDari(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Untuk Pembayaran *</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan pembayaran..."
                  value={untukPembayaran}
                  onChange={(e) => setUntukPembayaran(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jumlah Uang (Rp) *</label>
                  <input
                    type="number"
                    value={jumlahUang}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setJumlahUang(val);
                      setBanyaknyaUang(`${val.toLocaleString('id-ID')} Rupiah`);
                    }}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Banyaknya Uang (Terbilang) *</label>
                  <input
                    type="text"
                    value={banyaknyaUang}
                    onChange={(e) => setBanyaknyaUang(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 uppercase"
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Data yang dikirim akan terkunci otomatis dan diverifikasi oleh Super Admin.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow cursor-pointer">Kirim Kwitansi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CETAK PERSIS TEMPLAT RESMI */}
      {printRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <h3 className="text-sm font-black uppercase text-slate-900">Cetak Kwitansi Resmi RSUD Bukit Kerman</h3>
              <button onClick={() => setPrintRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {/* AREA CETAK PERSIS SEPERTI GAMBAR */}
            <div className="p-8 border-2 border-slate-900 rounded-xl space-y-4 bg-white text-slate-900 font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-center border">Logo Kab.</div>
                <div className="text-center flex-1 px-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-black uppercase tracking-wide">DINAS KESEHATAN</h2>
                  <h1 className="text-base font-black uppercase tracking-wider">RSUD BUKIT KERMAN</h1>
                  <p className="text-[10px] text-slate-700 mt-0.5">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
                  <p className="text-[9px] text-blue-600 underline">Website: https://rsudbukitkerman.kerincikab.go.id &nbsp;&nbsp;|&nbsp;&nbsp; e-mail: rsubukitkerman@gmail.com</p>
                </div>
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-center border text-emerald-700">Logo RSUD</div>
              </div>

              <div className="grid grid-cols-2 text-xs font-mono font-bold pt-2">
                <div>NOMOR BUKTI &nbsp;&nbsp;: &nbsp;&nbsp;{printRecord.nomor_bukti}</div>
                <div>KODE AKUN &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: &nbsp;&nbsp;{printRecord.kode_akun}</div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-base font-black uppercase underline tracking-widest">KWITANSI</h2>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Sudah terima dari</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 font-black uppercase">{printRecord.sudah_terima_dari}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Banyaknya Uang</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 font-bold italic uppercase bg-slate-50 p-1 border rounded">{printRecord.banyaknya_uang}</span>
                </div>
                <div className="grid grid-cols-12 gap-1">
                  <span className="col-span-3 font-bold">Untuk Pembayaran</span>
                  <span className="col-span-1 text-center">:</span>
                  <span className="col-span-8 uppercase leading-relaxed">{printRecord.untuk_pembayaran}</span>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <div className="border-t-2 border-b-2 border-slate-900 py-2.5 flex items-center justify-between">
                  <span className="text-sm font-black italic uppercase tracking-wider">JUMLAH &nbsp;&nbsp;:</span>
                  <span className="text-lg font-black font-mono">{formatRupiah(printRecord.jumlah_uang)}</span>
                </div>
              </div>

              <div className="flex justify-between items-end pt-4 text-xs">
                <div className="space-y-1 text-[11px] text-slate-700">
                  <p className="font-bold">Keterangan :</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;Lembar 1 &nbsp;&nbsp;: Pembukuan</p>
                  <p>&nbsp;&nbsp;&nbsp;&nbsp;Lembar 2 &nbsp;&nbsp;: Penerimaan</p>
                </div>
                <div className="text-center space-y-1">
                  <p>Bukit Kerman, {new Date(printRecord.created_at).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>
                  <div className="h-14"></div>
                  <p className="font-bold uppercase">dr. SYAFRIAL</p>
                  <p className="font-mono text-[11px]">NIP. 197004162001121001</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 print:hidden">
              <button onClick={() => window.print()} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow">
                <Printer className="w-4 h-4" /> Cetak Kwitansi Resmi
              </button>
              <button onClick={() => setPrintRecord(null)} className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}