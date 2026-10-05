'use client';

import { useState } from 'react';
import { 
  Database, 
  Download, 
  Loader2, 
  CheckCircle2, 
  ShieldAlert, 
  CloudUpload, 
  HardDrive,
  ExternalLink,
  Clock,
  Zap,
  Calendar,
  Copy,
  Check,
  FileCode,
  Terminal
} from 'lucide-react';

export default function AdminBackupPage() {
  const [loadingAction, setLoadingAction] = useState<'download' | 'gdrive' | 'both' | 'auto_test' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driveLink, setDriveLink] = useState<string | null>(null);
  
  // State tambahan untuk kenyamanan admin (UX Refinement)
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const handleExecuteBackup = async (actionType: 'download' | 'gdrive' | 'both' | 'auto_test') => {
    try {
      setLoadingAction(actionType);
      setSuccessMessage(null);
      setErrorMessage(null);
      setDriveLink(null);
      setCopiedLink(false);

      // Jika simulasi auto test, gunakan parameter action=gdrive
      const targetAction = actionType === 'auto_test' ? 'gdrive' : actionType;
      const response = await fetch(`/api/admin/backup?action=${targetAction}`);
      const contentType = response.headers.get('content-type') || '';

      if (!response.ok) {
        let errorText = 'Gagal memproses backup database.';
        if (contentType.includes('application/json')) {
          const errData = await response.json().catch(() => ({}));
          errorText = errData.error || errorText;
        }
        throw new Error(errorText);
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeFormatted = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const fileName = `backup_full_supabase_${dateStr}.sql`;

      setLastBackupTime(`${dateStr} pukul ${timeFormatted} WIB`);

      // Handling opsi 'gdrive' atau 'auto_test' (Response berupa JSON)
      if (actionType === 'gdrive' || actionType === 'auto_test') {
        const data = await response.json();
        if (actionType === 'auto_test') {
          setSuccessMessage('Simulasi Backup Otomatis Berhasil! File .sql berhasil terkirim ke Google Drive RSUD.');
        } else {
          setSuccessMessage('File backup database berhasil diunggah otomatis ke Google Drive RSUD!');
        }
        
        if (data.file?.webViewLink) {
          setDriveLink(data.file.webViewLink);
        }
        return;
      }

      // Handling opsi 'download' atau 'both' (Response berupa file .sql)
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      if (actionType === 'both') {
        setSuccessMessage(`File backup (${fileName}) berhasil diunduh dan diproses pengunggahannya ke Google Drive.`);
      } else {
        setSuccessMessage(`File backup database (${fileName}) berhasil diunduh ke komputer Anda.`);
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan sistem saat memproses backup.';
      setErrorMessage(msg);
    } finally {
      setLoadingAction(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isProcessing = loadingAction !== null;

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        
        {/* Header Modul */}
        <div className="flex items-center gap-4">
          <div className="p-4 bg-teal-50 text-teal-700 rounded-2xl border border-teal-100 shadow-sm">
            <Database className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900">Pusat Backup Database</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Modul Administrator untuk mengunduh salinan cadangan lengkap (Skema Tabel &amp; Isinya) RSUD Bukit Kerman.
            </p>
          </div>
        </div>

        {/* Informasi Penting */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" /> Informasi Penting Backup:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-500">
            <li>File hasil unduhan berformat <code className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">.sql</code> murni uncompressed.</li>
            <li>Mencakup struktur skema <code className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">CREATE TABLE</code>, <code className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">PRIMARY KEY</code>, dan seluruh data <code className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">INSERT INTO</code>.</li>
            <li>Dapat diunggah secara otomatis ke **Google Drive RSUD** atau **Diunduh ke Komputer Lokal**.</li>
          </ul>
        </div>

        {/* Status Jadwal Backup Otomatis */}
        <div className="p-5 bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-2xl space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-teal-500/20 text-teal-300 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Status Backup Otomatis (Cron Job)</h3>
                <p className="text-[11px] text-teal-200">Sistem dijadwalkan melakukan backup otomatis tanpa intervensi manual</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full text-[10px] font-extrabold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              AKTIF BERJALAN
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-teal-400" /> Frekuensi Eksekusi
              </span>
              <p className="font-bold text-teal-200">Setiap Hari (Daily)</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-teal-400" /> Jam Otomatis
              </span>
              <p className="font-bold text-teal-200">Pukul 00:00 WIB / Tengah Malam</p>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 space-y-1">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                <CloudUpload className="w-3 h-3 text-teal-400" /> Target Penyimpanan
              </span>
              <p className="font-bold text-teal-200">Folder Google Drive RSUD</p>
            </div>
          </div>

          {/* Riwayat Waktu Terakhir Dijalankan */}
          {lastBackupTime && (
            <div className="text-[11px] text-teal-300/90 bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-800/50 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sesi ini berhasil memproses backup terakhir pada: <strong className="text-white">{lastBackupTime}</strong></span>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => handleExecuteBackup('auto_test')}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[11px] px-3.5 py-2 rounded-xl transition cursor-pointer disabled:opacity-50 active:scale-95 shadow"
            >
              {loadingAction === 'auto_test' ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Menjalankan Simulasi Backup...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Uji Coba Eksekusi Auto-Backup Sekarang</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Pesan Berhasil */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
            {driveLink && (
              <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-3">
                <a 
                  href={driveLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-700 underline font-extrabold hover:text-emerald-900"
                >
                  <span>Lihat File di Google Drive</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={() => copyToClipboard(driveLink)}
                  className="inline-flex items-center gap-1 text-[11px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1 rounded-lg transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-emerald-600" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pesan Error */}
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pilihan Kartu Metode Backup Manual */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Atau Eksekusi Backup Manual Instan:
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Opsi 1: Unduh Lokal */}
            <button
              type="button"
              onClick={() => handleExecuteBackup('download')}
              disabled={isProcessing}
              className="p-5 bg-white hover:bg-teal-50/50 border border-slate-200 hover:border-teal-500 rounded-2xl text-left transition space-y-3 group cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-teal-50 border border-teal-200 text-teal-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                {loadingAction === 'download' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-teal-700">Unduh Ke Komputer</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Simpan file <code className="font-mono text-[10px]">.sql</code> secara langsung ke penyimpanan perangkat Anda.
                </p>
              </div>
            </button>

            {/* Opsi 2: Google Drive Cloud */}
            <button
              type="button"
              onClick={() => handleExecuteBackup('gdrive')}
              disabled={isProcessing}
              className="p-5 bg-white hover:bg-sky-50/50 border border-slate-200 hover:border-sky-500 rounded-2xl text-left transition space-y-3 group cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-sky-50 border border-sky-200 text-sky-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                {loadingAction === 'gdrive' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CloudUpload className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-sky-700">Upload Google Drive</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Kirim dan amankan file backup otomatis ke folder Google Drive RSUD.
                </p>
              </div>
            </button>

            {/* Opsi 3: Keduanya (Drive + Download) */}
            <button
              type="button"
              onClick={() => handleExecuteBackup('both')}
              disabled={isProcessing}
              className="p-5 bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-500 rounded-2xl text-left transition space-y-3 group cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-10 h-10 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-center justify-center group-hover:scale-105 transition">
                {loadingAction === 'both' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <HardDrive className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Drive &amp; Unduh Sekaligus</h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Proses pengunggahan ke Google Drive sekaligus simpan salinan lokal.
                </p>
              </div>
            </button>

          </div>
        </div>

        {/* Tombol Utama Pengunduhan Cepat */}
        <button
          onClick={() => handleExecuteBackup('download')}
          disabled={isProcessing}
          className="w-full py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed mt-4 active:scale-98"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> 
              <span>Sedang Memproses Backup ({loadingAction === 'gdrive' || loadingAction === 'auto_test' ? 'Google Drive' : loadingAction === 'both' ? 'Drive & Unduh' : 'Lokal'})...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" /> 
              <span>Unduh Backup Full SQL (Cepat)</span>
            </>
          )}
        </button>

        {/* Panduan Ringkas Restorasi Data (Prosedur Darurat) */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
            <Terminal className="w-4 h-4 text-slate-600" />
            <span>Panduan Pemulihan Data (Restore Procedures)</span>
          </div>
          <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono text-[11px] space-y-2">
            <p className="text-teal-400 font-sans font-semibold">Gunakan perintah psql untuk mengembalikan data jika server mengalami kegagalan:</p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300 overflow-x-auto selection:bg-teal-500 selection:text-white">
              <code>psql &quot;postgresql://postgres:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres&quot; -f nama_file_backup.sql</code>
            </div>
            <p className="text-slate-400 text-[10px] font-sans">
              Atau tempelkan isi teks file <code className="text-amber-300 font-mono">.sql</code> langsung ke menu <strong>SQL Editor</strong> di dashboard Supabase Console Anda.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}