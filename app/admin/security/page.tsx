'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Globe, 
  Clock, 
  Trash2, 
  Unlock, 
  AlertTriangle,
  Search,
  ArrowLeft,
  Radio
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';
import Link from 'next/link';

interface IpLog {
  id: string;
  ip_address: string;
  failed_count: number;
  last_failed_at: string;
  is_blacklisted: boolean;
  blacklisted_until: string | null;
}

export default function AdminSecurityLogsPage() {
  const [ipLogs, setIpLogs] = useState<IpLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Ambil data log IP dari database Supabase
  const fetchIpLogs = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('ip_security_logs')
        .select('*')
        .order('last_failed_at', { ascending: false });

      if (error) throw error;
      setIpLogs(data || []);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal memuat log keamanan: ${err.message}` });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIpLogs();

    // Real-time listener jika ada IP baru yang masuk / diblokir
    const channel = supabase
      .channel('ip-security-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ip_security_logs' }, () => {
        fetchIpLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchIpLogs]);

  // Fungsi untuk membuka blokir IP secara manual
  const handleUnblockIp = async (id: string, ip: string) => {
    if (!confirm(`Apakah Anda yakin ingin membuka blokir untuk alamat IP ${ip}?`)) return;
    setActionLoadingId(id);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('ip_security_logs')
        .update({
          is_blacklisted: false,
          blacklisted_until: null,
          failed_count: 0
        })
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: `Alamat IP ${ip} berhasil dilepas dari daftar hitam.` });
      fetchIpLogs();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal membuka blokir IP: ${err.message}` });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Fungsi hapus log IP
  const handleDeleteLog = async (id: string) => {
    if (!confirm('Hapus catatan riwayat IP ini dari sistem?')) return;
    setActionLoadingId(id);
    try {
      const { error } = await supabase
        .from('ip_security_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Riwayat IP berhasil dihapus.' });
      setIpLogs((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage({ type: 'error', text: `Gagal menghapus: ${err.message}` });
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredLogs = ipLogs.filter((log) => 
    log.ip_address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-rose-200/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Panel Administrator — Pusat Keamanan & Pemantauan IP"
        badgeText="Modul Keamanan"
        showBackButton={true}
        backUrl="/admin"
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24">
        
        {/* HEADER KONTROL */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center space-x-2 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl text-rose-700 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Brute-Force Defense Monitor</span>
              <span className="inline-flex items-center space-x-1 bg-rose-100 text-rose-800 text-[9px] px-2 py-0.5 rounded-full font-mono ml-2">
                <Radio className="w-2.5 h-2.5 text-rose-600 animate-pulse" />
                <span>Live Active</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Pemantauan Alamat IP &amp; Auto-Blacklist
            </h1>
            <p className="text-xs text-slate-500">
              Daftar alamat IP yang mendeteksi percobaan login mencurigakan atau gagal secara berulang.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Cari Alamat IP..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/25 font-medium"
              />
            </div>

            <button
              onClick={fetchIpLogs}
              disabled={isLoading}
              className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
              title="Segarkan Data"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs flex items-start space-x-2.5 border shadow-sm ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {/* TABEL DATA IP LOGS */}
        <div className="bg-white/90 border border-slate-200/90 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden backdrop-blur-xl">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <span>Daftar Log Alamat IP Pengunjung</span>
            </h2>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-3 py-1 rounded-xl">
              Total Tercatat: {filteredLogs.length} IP
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
              <p className="text-xs text-slate-500">Memuat data keamanan jaringan...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">Tidak Ada Ancaman Terdeteksi</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Belum ada alamat IP luar yang mencoba melakukan percobaan login gagal atau sistem dalam kondisi aman.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase font-mono text-[10px]">
                    <th className="py-3 px-4">Alamat IP</th>
                    <th className="py-3 px-4">Jumlah Gagal</th>
                    <th className="py-3 px-4">Aktivitas Terakhir</th>
                    <th className="py-3 px-4">Status Keamanan</th>
                    <th className="py-3 px-4 text-right">Aksi Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredLogs.map((log) => {
                    const isProcessing = actionLoadingId === log.id;
                    const isCurrentlyBlacklisted = log.is_blacklisted && (!log.blacklisted_until || new Date(log.blacklisted_until) > new Date());

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 flex items-center space-x-2">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.ip_address}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold ${
                            log.failed_count >= 5 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.failed_count}x Percobaan
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                          {new Date(log.last_failed_at).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3.5 px-4">
                          {isCurrentlyBlacklisted ? (
                            <span className="inline-flex items-center space-x-1 bg-rose-50 border border-rose-200 text-rose-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>DIBLOKIR OTOMATIS</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              <span>NORMAL / DIAWASI</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          {isCurrentlyBlacklisted && (
                            <button
                              onClick={() => handleUnblockIp(log.id, log.ip_address)}
                              disabled={isProcessing}
                              className="bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 font-bold px-3 py-1.5 rounded-xl transition inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                              title="Buka Blokir IP"
                            >
                              <Unlock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Buka Blokir</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            disabled={isProcessing}
                            className="bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-700 p-2 rounded-xl transition inline-flex items-center justify-center cursor-pointer disabled:opacity-50"
                            title="Hapus Catatan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <AdminFooter />
    </div>
  );
}