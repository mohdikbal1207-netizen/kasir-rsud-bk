'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, ArrowLeft, RefreshCcw, FileText, Search, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const router = useRouter();

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

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

  const filteredLogs = logs.filter(log => 
    log.table_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.changed_by?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang Log</span>
          </button>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari berdasarkan tabel / aksi..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {filteredLogs.length} Log</span>
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
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Memuat data audit logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Belum ada catatan log aktivitas yang terekam.
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
                        <span className={`px-2 py-1 rounded-md text-[10px] ${
                          log.action === 'INSERT' ? 'bg-sky-100 text-sky-700' :
                          log.action === 'UPDATE' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">
                        {log.record_id || '-'}
                      </td>
                      <td className="p-3.5 text-slate-600 font-mono max-w-xs truncate">
                        <details className="cursor-pointer">
                          <summary className="text-emerald-600 font-bold hover:underline">Lihat Detail JSON</summary>
                          <pre className="mt-2 p-2 bg-slate-900 text-slate-100 rounded-xl text-[10px] overflow-x-auto max-h-40">
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