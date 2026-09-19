'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Plus,
  Trash2,
  Edit3,
  Megaphone,
  ArrowLeft,
  X,
  Save,
  CheckCircle2,
  Info,
  AlertTriangle,
  Calendar,
  User,
  Target,
  ShieldAlert,
  Flame
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface Pengumuman {
  id: number;
  nomor_pengumuman: string;
  judul: string;
  isi: string;
  kategori: 'MENDESAK' | 'INFORMASI' | 'SISTEM' | 'DOKTER';
  prioritas: 'TINGGI' | 'NORMAL' | 'RENDAH';
  target_role: 'SEMUA' | 'KASIR' | 'ADMIN' | 'DOKTER' | 'FARMASI';
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminPengumumanPage() {
  const router = useRouter();
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form State Lengkap Sesuai Tabel SQL Baru
  const [judul, setJudul] = useState<string>('');
  const [isi, setIsi] = useState<string>('');
  const [kategori, setKategori] = useState<'MENDESAK' | 'INFORMASI' | 'SISTEM' | 'DOKTER'>('INFORMASI');
  const [prioritas, setPrioritas] = useState<'TINGGI' | 'NORMAL' | 'RENDAH'>('NORMAL');
  const [targetRole, setTargetRole] = useState<'SEMUA' | 'KASIR' | 'ADMIN' | 'DOKTER' | 'FARMASI'>('SEMUA');
  const [tanggalMulai, setTanggalMulai] = useState<string>(new Date().toISOString().slice(0, 16));
  const [tanggalSelesai, setTanggalSelesai] = useState<string>('');
  const [createdBy, setCreatedBy] = useState<string>('Admin Pusat');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pengumuman')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setAnnouncements(data as Pengumuman[]);
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    const channel = supabase
      .channel('admin_pengumuman_changes_full')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAnnouncements]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setJudul('');
    setIsi('');
    setKategori('INFORMASI');
    setPrioritas('NORMAL');
    setTargetRole('SEMUA');
    setTanggalMulai(new Date().toISOString().slice(0, 16));
    setTanggalSelesai('');
    setCreatedBy('Admin Pusat');
    setIsActive(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (p: Pengumuman) => {
    setEditingId(p.id);
    setJudul(p.judul);
    setIsi(p.isi);
    setKategori(p.kategori);
    setPrioritas(p.prioritas || 'NORMAL');
    setTargetRole(p.target_role || 'SEMUA');
    setTanggalMulai(p.tanggal_mulai ? new Date(p.tanggal_mulai).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setTanggalSelesai(p.tanggal_selesai ? new Date(p.tanggal_selesai).toISOString().slice(0, 16) : '');
    setCreatedBy(p.created_by || 'Admin Pusat');
    setIsActive(p.is_active);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!judul || !isi) return alert('Judul dan isi pengumuman wajib diisi!');

    try {
      const payload = {
        judul,
        isi,
        kategori,
        prioritas,
        target_role: targetRole,
        tanggal_mulai: tanggalMulai ? new Date(tanggalMulai).toISOString() : new Date().toISOString(),
        tanggal_selesai: tanggalSelesai ? new Date(tanggalSelesai).toISOString() : null,
        created_by: createdBy || 'Admin Pusat',
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (editingId) {
        const { error } = await supabase
          .from('pengumuman')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        showToast('Pengumuman berhasil diperbarui!', 'success');
      } else {
        const nextNum = `ANN-${String(announcements.length + 1).padStart(3, '0')}`;
        const { error } = await supabase.from('pengumuman').insert([
          {
            nomor_pengumuman: nextNum,
            ...payload
          }
        ]);

        if (error) throw error;
        showToast('Pengumuman baru berhasil diterbitkan!', 'success');
      }

      setShowModal(false);
      fetchAnnouncements();
    } catch (err: any) {
      showToast(`Gagal menyimpan: ${err?.message || JSON.stringify(err)}`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Apakah Anda yakin ingin menghapus pengumuman ini?')) {
      try {
        const { error } = await supabase.from('pengumuman').delete().eq('id', id);
        if (error) throw error;
        showToast('Pengumuman berhasil dihapus.', 'success');
        fetchAnnouncements();
      } catch (err: any) {
        showToast(`Gagal menghapus: ${err?.message}`, 'error');
      }
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await supabase.from('pengumuman').update({ is_active: !currentStatus }).eq('id', id);
      showToast(`Status pengumuman diperbarui.`, 'success');
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <AdminHeader title="RSUD BUKIT KERMAN" subtitle="Manajemen Pengumuman & Broadcast Alert RSUD" badgeText="Admin Pusat" />

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        {/* HEADER BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer border border-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Megaphone className="w-6 h-6 text-purple-600" /> Modul Kelola Pengumuman System
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Terbitkan pengumuman dengan prioritas, target pengguna, dan jadwal penayangan teratur.</p>
            </div>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4" /> Buat Pengumuman Baru
          </button>
        </div>

        {/* LIST PENGUMUMAN */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Memuat daftar pengumuman...</div>
          ) : announcements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p>Belum ada pengumuman yang dibuat.</p>
            </div>
          ) : (
            announcements.map((p) => (
              <div
                key={p.id}
                className={`bg-white border rounded-3xl p-6 shadow-sm transition flex flex-col sm:flex-row items-start justify-between gap-4 relative overflow-hidden ${
                  !p.is_active ? 'opacity-50 border-slate-200 bg-slate-50/50' : p.prioritas === 'TINGGI' ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    p.prioritas === 'TINGGI' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {p.prioritas === 'TINGGI' ? <Flame className="w-6 h-6 animate-pulse" /> : <Info className="w-6 h-6" />}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.kategori === 'MENDESAK' ? 'bg-rose-600 text-white' : 'bg-sky-600 text-white'
                      }`}>
                        {p.kategori}
                      </span>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        p.prioritas === 'TINGGI' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        Prioritas: {p.prioritas}
                      </span>

                      <span className="bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase">
                        Target: {p.target_role}
                      </span>

                      <button
                        onClick={() => toggleStatus(p.id, p.is_active)}
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full cursor-pointer ${
                          p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.is_active ? '● Aktif' : 'Nonaktif'}
                      </button>
                    </div>

                    <h3 className="text-base font-black text-slate-900 tracking-tight">{p.judul}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{p.isi}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono pt-1">
                      <span>No: {p.nomor_pengumuman}</span>
                      <span>•</span>
                      <span>Oleh: {p.created_by}</span>
                      <span>•</span>
                      <span>Tayang: {new Date(p.tanggal_mulai).toLocaleDateString('id-ID')} {p.tanggal_selesai ? `s/d ${new Date(p.tanggal_selesai).toLocaleDateString('id-ID')}` : '(Tanpa Batas)'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    onClick={() => handleOpenEditModal(p)}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                    title="Ubah Pengumuman"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                    title="Hapus Pengumuman"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* MODAL BUAT/EDIT PENGUMUMAN LENGKAP */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-600" /> {editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Kategori</label>
                  <select
                    value={kategori}
                    onChange={(e: any) => setKategori(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500"
                  >
                    <option value="INFORMASI">INFORMASI</option>
                    <option value="MENDESAK">MENDESAK</option>
                    <option value="SISTEM">SISTEM</option>
                    <option value="DOKTER">DOKTER</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prioritas Tampil</label>
                  <select
                    value={prioritas}
                    onChange={(e: any) => setPrioritas(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-amber-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="TINGGI">TINGGI (Atas)</option>
                    <option value="NORMAL">NORMAL (Biasa)</option>
                    <option value="RENDAH">RENDAH (Bawah)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Target Penerima</label>
                  <select
                    value={targetRole}
                    onChange={(e: any) => setTargetRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-purple-700 focus:outline-none focus:border-purple-500"
                  >
                    <option value="SEMUA">SEMUA ROLE</option>
                    <option value="KASIR">KASIR SAJA</option>
                    <option value="ADMIN">ADMIN SAJA</option>
                    <option value="DOKTER">DOKTER SAJA</option>
                    <option value="FARMASI">FARMASI SAJA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Pengumuman *</label>
                <input
                  type="text"
                  placeholder="Contoh: PEMELIHARAAN SISTEM & BRIDGING BPJS"
                  value={judul}
                  onChange={(e) => setJudul(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-900 focus:outline-none focus:border-purple-500 uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Isi Pesan Pengumuman *</label>
                <textarea
                  rows={4}
                  placeholder="Tuliskan isi pesan rinci yang akan ditayangkan..."
                  value={isi}
                  onChange={(e) => setIsi(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Mulai Tayang</label>
                  <input
                    type="datetime-local"
                    value={tanggalMulai}
                    onChange={(e) => setTanggalMulai(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-800 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tanggal Selesai Tayang (Opsional)</label>
                  <input
                    type="datetime-local"
                    value={tanggalSelesai}
                    onChange={(e) => setTanggalSelesai(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-mono text-slate-800 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Diterbitkan Oleh (Pembuat)</label>
                <input
                  type="text"
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 font-bold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="isActiveCheck" className="font-bold text-slate-700 cursor-pointer">
                  Terbitkan Langsung ke Dashboard (Status Aktif)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-lg shadow-purple-600/20 cursor-pointer flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> Simpan &amp; Terbitkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}