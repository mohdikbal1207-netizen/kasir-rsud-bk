'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Search, 
  CheckCircle2, 
  Plus, 
  X, 
  Lock, 
  Clock,
  AlertTriangle,
  FileText,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface AbsensiRecord {
  id: number;
  uuid: string;
  user_id?: string;
  email_user?: string;
  nama_pegawai: string;
  jabatan: string;
  unit_kerja?: string;
  shift: string;
  status_kehadiran: string;
  keterangan: string;
  status_verifikasi: string;
  catatan_penolakan?: string;
  is_locked: boolean;
  created_at: string;
}

export default function KasirAbsensiPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Session Activity Logs State
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  // Form State Kasir Input Only
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [namaPegawai, setNamaPegawai] = useState<string>('');
  const [jabatan, setJabatan] = useState<string>('Petugas Kasir / Loket');
  const [shift, setShift] = useState<string>('Pagi');
  const [statusKehadiran, setStatusKehadiran] = useState<string>('Hadir');
  const [keterangan, setKeterangan] = useState<string>('');
  const [selectedRejectionNote, setSelectedRejectionNote] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLogs(prev => [`[${timeStr}] ${message}`, ...prev.slice(0, 4)]);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as AbsensiRecord[]);
      }
    } catch (err) {
      console.error('Gagal memuat rekap absensi:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    addLog('Modul Absensi Kasir terhubung.');
    const channel = supabase
      .channel('kasir_realtime_absensi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_records' }, () => {
        fetchRecords();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRecords]);

  // Listener Pintasan Keyboard '/' untuk fokus pencarian
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('search-kasir-absensi')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveAbsensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaPegawai) {
      showToast('Harap masukkan nama pegawai / petugas.', 'error');
      return;
    }

    // Ambil data sesi user aktif dari localStorage (atau state auth Anda)
    const sessionUser = JSON.parse(localStorage.getItem('user_session') || '{}');

    try {
      const payload = {
        user_id: sessionUser?.id || null, // Terikat dengan tabel public.users
        email_user: sessionUser?.email || 'kasir@rsudbukitkerman.go.id',
        nama_pegawai: namaPegawai.toUpperCase(),
        jabatan,
        shift,
        status_kehadiran: statusKehadiran,
        keterangan: keterangan || 'Hadir bertugas sesuai jadwal.',
        status_verifikasi: 'Menunggu Verifikasi',
        is_locked: true
      };

      const { error } = await supabase.from('absensi_records').insert([payload]);
      if (error) throw error;

      showToast('Absensi berhasil dikirim dan menunggu verifikasi Super Admin!', 'success');
      addLog(`Mengirim absensi untuk ${namaPegawai} (${shift})`);
      setShowFormModal(false);
      setNamaPegawai('');
      setKeterangan('');
      fetchRecords();
    } catch (err: any) {
      showToast(`Gagal mengirim absensi: ${err.message}`, 'error');
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.nama_pegawai || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true : r.status_verifikasi.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.created_at?.slice(0, 10) === todayStr);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const totalRejected = records.filter(r => r.status_verifikasi === 'Ditolak').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Absensi &amp; Kehadiran Petugas" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {totalRejected > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 px-6 flex items-center justify-between gap-4 text-rose-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide">Perhatian Kasir</h4>
                <p className="text-xs text-rose-700">Terdapat {totalRejected} absensi yang ditolak oleh Super Admin. Klik badge status ditolak pada tabel untuk melihat catatan revisi.</p>
              </div>
            </div>
            <button 
              onClick={() => { setStatusFilter('Ditolak'); setCurrentPage(1); }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shadow"
            >
              Lihat Ditolak
            </button>
          </div>
        )}

        {/* HEADER DAN TOMBOL KEMBALI */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200 shadow-sm"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-sky-600" /> Absensi Shift Kasir &amp; Loket
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Kirimkan absensi kehadiran Anda. Data bersifat terkunci otomatis dan diverifikasi oleh Super Admin.</p>
            </div>
          </div>
          <button
            onClick={() => { setShowFormModal(true); addLog('Membuka form input absensi.'); }}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center gap-2 shadow cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Absen Sekarang
          </button>
        </div>

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Absensi Masuk Hari Ini</span>
              <h3 className="text-lg font-black text-slate-900">{todayRecords.length} Pegawai</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Menunggu Verifikasi Admin</span>
              <h3 className="text-lg font-black text-amber-600">{totalPending} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TABEL DATA */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="search-kasir-absensi"
                type="text"
                placeholder="Cari nama pegawai... (Tekan '/' untuk fokus)"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold flex-wrap">
              <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
              <button onClick={() => setStatusFilter('Menunggu Verifikasi')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Menunggu Verifikasi' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
              <button onClick={() => setStatusFilter('Disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
              <button onClick={() => setStatusFilter('Ditolak')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Ditolak' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500'}`}>Ditolak</button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">Nama Pegawai &amp; Jabatan</th>
                  <th className="p-3.5">Shift</th>
                  <th className="p-3.5 text-center">Kehadiran</th>
                  <th className="p-3.5">Keterangan</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Memuat rekap absensi...</td></tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">Tidak ada data absensi ditemukan.</td></tr>
                ) : (
                  paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5 font-bold text-slate-900">
                        {r.nama_pegawai}
                        <span className="block text-[10px] text-slate-400 font-normal">{r.jabatan}</span>
                      </td>
                      <td className="p-3.5 font-bold text-sky-700">{r.shift}</td>
                      <td className="p-3.5 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          r.status_kehadiran === 'Hadir' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status_kehadiran}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">{r.keterangan || '-'}</td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (r.status_verifikasi === 'Ditolak') {
                              setSelectedRejectionNote(r.catatan_penolakan || 'Ditolak oleh Super Admin.');
                            }
                          }}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' :
                            r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800 cursor-pointer animate-pulse' : 'bg-amber-100 text-amber-800'
                          }`}
                          title={r.status_verifikasi === 'Ditolak' ? 'Klik untuk melihat alasan penolakan' : ''}
                        >
                          {r.status_verifikasi} {r.status_verifikasi === 'Ditolak' && ' ℹ️'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {filteredRecords.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-500 gap-3">
              <span>Menampilkan halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filteredRecords.length} total data)</span>
              <div className="flex items-center gap-1">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition">Sebelumnya</button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-xl font-bold cursor-pointer transition">Selanjutnya</button>
              </div>
            </div>
          )}
        </div>

        {/* LOG AKTIVITAS KASIR */}
        <div className="bg-slate-900 text-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-2xl flex items-center justify-center text-sky-400 shrink-0 border border-slate-700">
              <Activity className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-white">Log Aktivitas Kasir Sesi Ini</h4>
              <p className="text-[11px] text-slate-400">Pencatatan aktivitas pengiriman absensi shift di RSUD Bukit Kerman.</p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-300 space-y-1 w-full md:w-auto bg-slate-950 p-3 rounded-2xl border border-slate-800">
            {activityLogs.length === 0 ? <span className="text-slate-500 italic">Belum ada aktivitas tercatat.</span> : activityLogs.map((log, index) => <div key={index} className="truncate max-w-md">{log}</div>)}
          </div>
        </div>
      </main>

      {/* FORM MODAL INPUT ABSENSI */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" /> Form Absensi Kehadiran
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <form onSubmit={handleSaveAbsensi} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pegawai *</label>
                <input
                  type="text"
                  placeholder="Contoh: NIKEN PRATIWI, A.Md.Keb"
                  value={namaPegawai}
                  onChange={(e) => setNamaPegawai(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift Petugas</label>
                  <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Kehadiran</label>
                  <select value={statusKehadiran} onChange={(e) => setStatusKehadiran(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Catatan Shift</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 uppercase"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-[11px] font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>Setelah dikirim, data terkunci otomatis dan diverifikasi oleh Super Admin.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold shadow cursor-pointer">Kirim Absensi</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATATAN PENOLAKAN */}
      {selectedRejectionNote !== null && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-sm font-black uppercase text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Catatan Penolakan Admin
            </h3>
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-xs text-rose-900 leading-relaxed font-medium">
              {selectedRejectionNote}
            </div>
            <p className="text-[11px] text-slate-500">Silakan buat absensi baru atau koordinasikan dengan Super Admin RSUD Bukit Kerman jika terdapat kekeliruan.</p>
            <div className="flex justify-end pt-2 border-t">
              <button onClick={() => setSelectedRejectionNote(null)} className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}