'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Receipt, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit3, 
  Lock, 
  Unlock, 
  Printer, 
  X, 
  Save 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

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

export default function AdminKwitansiPage() {
  const [records, setRecords] = useState<KwitansiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [editingRecord, setEditingRecord] = useState<KwitansiRecord | null>(null);
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
      console.error('Gagal memuat rekap:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    const channel = supabase
      .channel('admin_realtime_kwitansi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kwitansi_header' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  const handleApprove = async (id: number) => {
    await supabase.from('kwitansi_header').update({ status_verifikasi: 'Disetujui' }).eq('id', id);
    showToast('Kwitansi disetujui.', 'success');
    fetchRecords();
  };

  const handleReject = async (id: number) => {
    const reason = prompt("Masukkan alasan penolakan kwitansi:");
    if (reason === null) return;
    await supabase.from('kwitansi_header').update({ status_verifikasi: 'Ditolak' }).eq('id', id);
    showToast(`Kwitansi ditolak. Catatan: ${reason}`, 'error');
    fetchRecords();
  };

  const handleToggleLock = async (id: number, currentLocked: boolean) => {
    await supabase.from('kwitansi_header').update({ is_locked: !currentLocked }).eq('id', id);
    showToast(`Status kunci diubah menjadi ${!currentLocked ? 'Locked' : 'Unlocked'}.`, 'info');
    fetchRecords();
  };

  const handleDelete = async (id: number) => {
    if (confirm('Hapus permanen data kwitansi ini?')) {
      await supabase.from('kwitansi_header').delete().eq('id', id);
      showToast('Kwitansi berhasil dihapus.', 'error');
      fetchRecords();
    }
  };

  const handleSaveSuperAdminEdit = async () => {
    if (!editingRecord) return;
    try {
      await supabase.from('kwitansi_header').update({
        sudah_terima_dari: editingRecord.sudah_terima_dari,
        untuk_pembayaran: editingRecord.untuk_pembayaran,
        jumlah_uang: editingRecord.jumlah_uang,
        banyaknya_uang: editingRecord.banyaknya_uang,
        kode_akun: editingRecord.kode_akun
      }).eq('id', editingRecord.id);

      showToast('Kwitansi berhasil diperbarui oleh Super Admin!', 'success');
      setEditingRecord(null);
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal: ${err.message}`, 'error');
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.sudah_terima_dari || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.nomor_bukti || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true :
      statusFilter === 'pending' ? r.status_verifikasi === 'Menunggu Verifikasi' :
      statusFilter === 'disetujui' ? r.status_verifikasi === 'Disetujui' : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <AdminHeader title="RSUD BUKIT KERMAN" subtitle="Master Kwitansi — Super Admin Control" badgeText="Super Admin" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Receipt className="w-6 h-6 text-purple-600" /> Master Arsip Kwitansi
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Kelola, verifikasi, ubah, dan cetak ulang seluruh arsip kwitansi.</p>
          </div>
          <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition flex items-center gap-1.5 cursor-pointer">
            <Printer className="w-4 h-4 text-purple-600" /> Cetak Rekap
          </button>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 print:hidden">
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
            <div className="flex items-center gap-2 text-xs font-bold">
              <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Semua ({records.length})</button>
              <button onClick={() => setStatusFilter('pending')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Pending</button>
              <button onClick={() => setStatusFilter('disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'disetujui' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Disetujui</button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">Nomor Bukti &amp; Akun</th>
                  <th className="p-3.5">Sudah Terima Dari</th>
                  <th className="p-3.5">Untuk Pembayaran</th>
                  <th className="p-3.5 text-right">Jumlah Uang</th>
                  <th className="p-3.5 text-center">Kunci</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Aksi Super Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={7} className="text-center py-8 text-slate-400">Memuat data...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-400">Tidak ada data.</td></tr>
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
                        <button
                          onClick={() => handleToggleLock(r.id, r.is_locked)}
                          className={`p-1.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 mx-auto cursor-pointer ${
                            r.is_locked ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {r.is_locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          <span>{r.is_locked ? 'Locked' : 'Unlocked'}</span>
                        </button>
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
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setPrintRecord(r)} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer" title="Cetak Resmi"><Printer className="w-3.5 h-3.5 text-purple-600" /></button>
                          <button onClick={() => handleApprove(r.id)} className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer" title="Setujui"><CheckCircle2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleReject(r.id)} className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl cursor-pointer" title="Tolak"><XCircle className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingRecord(r)} className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 rounded-xl cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL EDIT SUPER ADMIN */}
      {editingRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900">Edit Kwitansi — Super Admin</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kode Akun</label>
                  <input type="text" value={editingRecord.kode_akun} onChange={(e) => setEditingRecord({ ...editingRecord, kode_akun: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono" />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Sudah terima dari</label>
                  <input type="text" value={editingRecord.sudah_terima_dari} onChange={(e) => setEditingRecord({ ...editingRecord, sudah_terima_dari: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 font-bold uppercase" />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Untuk Pembayaran</label>
                <textarea rows={2} value={editingRecord.untuk_pembayaran} onChange={(e) => setEditingRecord({ ...editingRecord, untuk_pembayaran: e.target.value })} className="w-full bg-slate-50 border rounded-xl p-2 uppercase" />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Jumlah Uang (Rp)</label>
                <input type="number" value={editingRecord.jumlah_uang} onChange={(e) => setEditingRecord({ ...editingRecord, jumlah_uang: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl p-2 font-mono font-bold" />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button onClick={() => setEditingRecord(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
              <button onClick={handleSaveSuperAdminEdit} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow cursor-pointer flex items-center gap-1">
                <Save className="w-4 h-4" /> Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW CETAK DI ADMIN */}
      {printRecord && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-3 print:hidden">
              <h3 className="text-sm font-black uppercase text-slate-900">Cetak Arsip Kwitansi</h3>
              <button onClick={() => setPrintRecord(null)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="p-8 border-2 border-slate-900 rounded-xl space-y-4 bg-white text-slate-900 font-sans">
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
                <div className="w-16 h-16 bg-slate-200 rounded-lg flex items-center justify-center text-[10px] font-bold text-center border">Logo Kab.</div>
                <div className="text-center flex-1 px-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</h3>
                  <h2 className="text-sm font-black uppercase tracking-wide">DINAS KESEHATAN</h2>
                  <h1 className="text-base font-black uppercase tracking-wider">RSUD BUKIT KERMAN</h1>
                  <p className="text-[10px] text-slate-700 mt-0.5">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176</p>
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

      <AdminFooter />
    </div>
  );
}