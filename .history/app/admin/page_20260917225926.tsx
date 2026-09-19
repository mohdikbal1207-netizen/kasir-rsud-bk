'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Users, 
  UserCheck, 
  FileText, 
  Settings, 
  ArrowRight, 
  LogOut, 
  Building2,
  AlertCircle,
  RefreshCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function AdminDashboardPage() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State untuk Monitoring Sesi Aktif Staf
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const router = useRouter();

  // 1. Hitung jumlah data yang masih pending verifikasi untuk badge notifikasi
  useEffect(() => {
    async function fetchPendingCount() {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', false);

        if (!error && count !== null) {
          setPendingCount(count);
        }
      } catch (err) {
        console.error('Gagal mengambil jumlah pending:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPendingCount();
  }, []);

  // 2. Ambil daftar staf yang sedang aktif (login)
  const fetchActiveSessions = async () => {
    setIsSessionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('is_active', true)
        .order('login_at', { ascending: false });

      if (!error && data) {
        setActiveSessions(data);
      }
    } catch (err) {
      console.error('Gagal mengambil sesi aktif:', err);
    } finally {
      setIsSessionsLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveSessions();
  }, []);

  // Handler Force Logout oleh Admin
  const handleForceLogout = async (userId: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin mengakhiri sesi login secara paksa untuk ${nama}?`)) return;

    setActionLoadingId(userId);
    try {
      const response = await fetch('/api/admin/force-logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal mengakhiri sesi.');

      alert(`Sesi untuk ${nama} berhasil dihentikan.`);
      fetchActiveSessions(); // Segarkan daftar sesi aktif
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Terjadi kesalahan saat memproses permintaan.');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Menggunakan Header khusus Admin */}
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Panel Utama Administrator Sistem"
        badgeText="Admin Pusat"
        showBackButton={false}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8 relative z-10">
        
        {/* Banner Selamat Datang */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl text-emerald-700 text-xs font-bold shadow-sm">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Sistem Akses Administrator Terverifikasi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Dashboard Panel Admin RSUD
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Kelola seluruh kontrol sistem informasi, validasi akun pegawai baru, dan pemantauan sesi aktif layanan kesehatan RSUD Bukit Kerman secara terpusat.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs px-4 py-3 rounded-2xl transition flex items-center space-x-2 cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Keluar Sesi Admin</span>
          </button>
        </div>

        {/* Grid Card Menu Utama */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">
            Modul &amp; Kontrol Utama
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Modul Verifikasi & Manajemen Pegawai (Mengarah ke /admin/users) */}
            <div 
              onClick={() => router.push('/admin/users')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-emerald-400 cursor-pointer relative overflow-group group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Users className="w-6 h-6" />
                  </div>
                  {!isLoading && pendingCount > 0 && (
                    <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      {pendingCount} Pending
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    Verifikasi &amp; Data Pegawai
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Tinjau, setujui, atau kelola hak akses akun staf dan tenaga medis yang baru mendaftar ke sistem.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Modul Pengguna</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: Modul Laporan & Kasir BLUD */}
            <div 
              onClick={() => router.push('/kasir')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-teal-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-2xl text-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                    Portal Kasir &amp; Billing
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Akses langsung ke loket pembayaran dan pencatatan transaksi tarif layanan pasien BLUD.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Portal Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 3: Pengaturan Sistem */}
            <div 
              className="bg-white/60 border border-slate-200/70 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6 relative overflow-hidden opacity-80"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-800">
                    Konfigurasi Sistem
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Pengaturan parameter rumah sakit, backup database, dan manajemen tarif (Segera Hadir).
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 text-xs font-semibold text-slate-400">
                <span>Modul Terkunci</span>
              </div>
            </div>

          </div>
        </div>

        {/* MODUL BARU: Monitoring Sesi Aktif & Kontrol Akses Pengguna Masuk */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6 backdrop-blur-xl">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Monitoring Sesi Staf Aktif
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                Daftar pegawai dan staf yang sedang masuk (*online*) ke dalam sistem. Anda dapat mengakhiri sesi jika diperlukan.
              </p>
            </div>

            <button
              onClick={fetchActiveSessions}
              disabled={isSessionsLoading}
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-slate-500 ${isSessionsLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang Sesi</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-2xl">Nama Staf &amp; Gelar</th>
                  <th className="p-3.5">Peran / Unit Tugas</th>
                  <th className="p-3.5">Waktu Masuk Sesi</th>
                  <th className="p-3.5 rounded-r-2xl text-center">Aksi Administrator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isSessionsLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      Memuat data sesi aktif...
                    </td>
                  </tr>
                ) : activeSessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      Tidak ada staf yang sedang aktif atau tercatat masuk saat ini.
                    </td>
                  </tr>
                ) : (
                  activeSessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-slate-900 font-bold flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>{session.nama_lengkap || 'Tanpa Nama'}</span>
                      </td>
                      <td className="p-3.5 text-slate-600 uppercase font-semibold">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg">
                          {session.role || '-'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono">
                        {new Date(session.login_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleForceLogout(session.user_id, session.nama_lengkap)}
                          disabled={actionLoadingId === session.user_id}
                          className="inline-flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer disabled:opacity-50 shadow-sm"
                        >
                          {actionLoadingId === session.user_id ? (
                            <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <LogOut className="w-3.5 h-3.5 text-rose-500" />
                          )}
                          <span>Akhiri Sesi</span>
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

      {/* Menggunakan Footer khusus Admin */}
      <AdminFooter />
    </div>
  );
}