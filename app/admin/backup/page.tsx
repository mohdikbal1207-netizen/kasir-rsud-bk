'use client';

import { useState } from 'react';
import { Database, Download, Loader2, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function AdminBackupPage() {
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDownloadBackup = async () => {
    try {
      setIsDownloading(true);
      setSuccessMessage(null);
      setErrorMessage(null);

      const response = await fetch('/api/admin/backup');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Gagal membuat backup database.');
      }

      // Ambil file .sql dari response server
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Mentrigger unduhan otomatis di browser
      const dateStr = new Date().toISOString().split('T')[0];
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_full_supabase_${dateStr}.sql`;
      document.body.appendChild(a);
      a.click();
      
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`File backup database (backup_full_supabase_${dateStr}.sql) berhasil diunduh.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem.';
      setErrorMessage(msg);
    }  finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        <div className="flex items-center gap-4">
          <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Pusat Backup Database</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Modul Administrator untuk mengunduh salinan cadangan lengkap (Skema Tabel &amp; Isinya) RSUD Bukit Kerman.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Informasi Penting Backup:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>File hasil unduhan berformat <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">.sql</code>.</li>
            <li>Mencakup struktur skema <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">CREATE TABLE</code> dan seluruh data <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">INSERT INTO</code>.</li>
            <li>Simpan file di media penyimpanan aman yang terisolasi dari server utama.</li>
          </ul>
        </div>

        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleDownloadBackup}
          disabled={isDownloading}
          className="w-full py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Sedang Menggenerasi &amp; Mengunduh File SQL...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> Unduh Backup Full SQL
            </>
          )}
        </button>

      </div>
    </div>
  );
}