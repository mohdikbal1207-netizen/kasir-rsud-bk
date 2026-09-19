'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, RefreshCcw, FileText, Search, Database, Download, Filter, Activity, PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const router = useRouter();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data) {
        setLogs(data);
      }
    } catch (err) {
      console.error('Gagal memuat audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Hitung Statistik Log untuk Kartu Ringkasan
  const stats = useMemo(() => {
    const total = logs.length;
    const inserts = logs.filter(l => l.action === 'INSERT').length;
    const updates = logs.filter(l => l.action === 'UPDATE').length;
    const deletes = logs.filter(l => l.action === 'DELETE').length;
    return { total, inserts, updates, deletes };
  }, [logs]);

  // Filter Log Berdasarkan Search Term & Action Filter
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        (log.table_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.changed_by || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.record_id || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  // Fungsi Ekspor ke CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('Tidak ada data log untuk diekspor.');
      return;
    }

    const headers = ['Waktu', 'Nama Tabel', 'Aksi', 'ID Record', 'Changed By'];
    const rows = filteredLogs.map(log => [
      `"${new Date(log.created_at).toLocaleString('id-ID')}"`,
      `"${log.table_name || '-'}"`,
      `"${log.action || '-'}"`,
      `"${log.record_id || '-'}"`,
      `"${log.changed_by || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Logs_RSUD_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Pusat Log Jejak Audit Database"
        badgeText="Audit Logs"
        showBackButton={true}
        backUrl="/admin"
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* Banner Utama */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-emerald-700 text-xs font-bold">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Rekaman Otomatis Tingkat Database</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Daftar Jejak Audit (Audit Trail)
            </h1>
            <p className="text-xs text-slate-500">
              Memantau setiap aktivitas perubahan, penambahan, atau penghapusan data secara real-time.
            </p>
          </div>

          <div className="flex items-center space-x-3 w-full md:w-auto">
            <button
              onClick={handleExportCSV}
              className="flex-1 md:flex-none inline-flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="inline-flex items-center justify-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <RefreshCcw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {/* Kartu Statistik Ringkasan (Baru) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Log</span>
              <span className="text-lg font-black text-slate-900">{stats.total}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Insert Data</span>
              <span className="text-lg font-black text-sky-700">{stats.inserts}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Update Data</span>
              <span className="text-lg font-black text-amber-700">{stats.updates}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-sm flex items-center space-x-3">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delete Data</span>
              <span className="text-lg font-black text-rose-700">{stats.deletes}</span>
            </div>
          </div>
        </div>

        {/* Tabel Data & Kontrol Filter */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Input Pencarian */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan tabel / record ID / user..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Filter Berdasarkan Jenis Aksi */}
            <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map((action) => (
                <button
                  key={action}
                  onClick={() => setActionFilter(action)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                    actionFilter === action 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
            <span>Menampilkan {filteredLogs.length} dari {logs.length} total rekaman log</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 rounded-l-2xl">Waktu</th>
                  <th className="p-3.5">Nama Tabel</th>
                  <th className="p-3.5">Aksi</th>
                  <th className="p-3.5">ID Record</th>
                  <th className="p-3.5 rounded-r-2xl">Detail Perubahan (JSON)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Memuat data audit logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-400">
                      Belum ada catatan log aktivitas yang terekam atau sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3.5 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {log.table_name}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] ${
                          log.action === 'INSERT' ? 'bg-sky-100 text-sky-700 border border-sky-200' :
                          log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {log.record_id || '-'}
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono max-w-xs">
                        <details className="cursor-pointer group">
                          <summary className="text-emerald-600 font-bold hover:underline inline-flex items-center space-x-1">
                            <span>Lihat Detail JSON</span>
                          </summary>
                          <pre className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-2xl text-[10px] overflow-x-auto max-h-48 shadow-inner">
                            {JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <AdminFooter />
    </div>
  );
}