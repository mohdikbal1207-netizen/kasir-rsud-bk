'use client';

import React, { useState } from 'react';
import { Megaphone, Plus, Trash2, Edit3, ArrowLeft, ShieldCheck, CheckCircle2, AlertTriangle, BellRing, Info, Search } from 'lucide-react';
import Link from 'next/link';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  priority: 'darurat' | 'mendesak' | 'informasi';
  created_at: string;
  is_active: boolean;
  author: string;
}

export default function AdminPengumumanPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([
    {
      id: 'ANN-001',
      title: 'PEMELIHARAAN SISTEM & BRIDGING BPJS',
      message: 'Diberitahukan kepada seluruh petugas kasir dan staf admin, akan dilakukan sinkronisasi data bridging BPJS harian pada pukul 23:00 WIB. Pastikan seluruh transaksi terverifikasi sebelum jam tersebut.',
      priority: 'mendesak',
      created_at: '2026-09-18T22:00:00Z',
      is_active: true,
      author: 'Administrator Pusat'
    },
    {
      id: 'ANN-002',
      title: 'UPDATE TARIF TINDAKAN MEDIS IGD',
      message: 'Perubahan penyesuaian Perda tarif baru tindakan IGD berlaku efektif per 1 Oktober 2026.',
      priority: 'informasi',
      created_at: '2026-09-15T10:30:00Z',
      is_active: true,
      author: 'Admin Verifikator'
    }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    priority: 'informasi' as 'darurat' | 'mendesak' | 'informasi'
  });

  const handleCreateNew = (e: React.FormEvent) => {
    e.preventDefault();
    const newItem: AnnouncementItem = {
      id: `ANN-00${announcements.length + 1}`,
      title: formData.title,
      message: formData.message,
      priority: formData.priority,
      created_at: new Date().toISOString(),
      is_active: true,
      author: 'Administrator Pusat'
    };
    setAnnouncements([newItem, ...announcements]);
    setIsModalOpen(false);
    setFormData({ title: '', message: '', priority: 'informasi' });
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus pengumuman ini secara permanen?')) {
      setAnnouncements(announcements.filter(a => a.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Manajemen Pengumuman & Broadcast Alert RSUD"
        badgeText="Admin Pusat"
        showBackButton={true}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Link href="/admin" className="p-1.5 hover:bg-slate-100 rounded-xl transition">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </Link>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-emerald-600" /> Modul Kelola Pengumuman System
              </h1>
            </div>
            <p className="text-xs text-slate-500 pl-7">Terbitkan pesan pengumuman atau peringatan darurat ke seluruh dashboard staf & kasir RSUD.</p>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Buat Pengumuman Baru
          </button>
        </div>

        {/* DAFTAR PENGUMUMAN */}
        <div className="space-y-4">
          {announcements.map((item) => (
            <div key={item.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3.5 rounded-2xl flex-shrink-0 ${
                  item.priority === 'darurat' ? 'bg-rose-100 text-rose-700' :
                  item.priority === 'mendesak' ? 'bg-amber-100 text-amber-800' :
                  'bg-sky-100 text-sky-800'
                }`}>
                  {item.priority === 'darurat' ? <AlertTriangle className="w-6 h-6" /> :
                   item.priority === 'mendesak' ? <BellRing className="w-6 h-6" /> :
                   <Info className="w-6 h-6" />}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      item.priority === 'darurat' ? 'bg-rose-600 text-white' :
                      item.priority === 'mendesak' ? 'bg-amber-500 text-slate-950' :
                      'bg-sky-600 text-white'
                    }`}>
                      {item.priority}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-400">{item.id}</span>
                    <span className="text-[10px] text-slate-400">• {new Date(item.created_at).toLocaleString('id-ID')}</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">{item.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition cursor-pointer"
                  title="Hapus Pengumuman"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL INPUT PENGUMUMAN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border space-y-4">
            <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2 border-b pb-3">
              <Megaphone className="w-5 h-5 text-emerald-600" /> Terbitkan Pengumuman Baru
            </h3>
            <form onSubmit={handleCreateNew} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Judul Pengumuman</label>
                <input
                  type="text"
                  required
                  placeholder="Judul Pengumuman..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tingkat Prioritas Alert</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold focus:outline-none"
                >
                  <option value="informasi">Informasi Umum</option>
                  <option value="mendesak">Mendesak / Penting</option>
                  <option value="darurat">Darurat System / Kritis</option>
                </select>
              </div>
              <div>
                <label className="font-bold text-slate-700 block mb-1">Isi Pesan Broadcast</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tulis pesan lengkap..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold cursor-pointer shadow">Terbitkan</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}