'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, ShieldCheck, Save, Loader2, AlertTriangle, CheckCircle2, RefreshCcw } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function MaintenanceControlPage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [allowedEmailsInput, setAllowedEmailsInput] = useState<string>('mohdikbal1207@gmail.com');
  const [estimatedFinish, setEstimatedFinish] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (data?.value) {
        setIsActive(Boolean(data.value.is_active));
        setMessage(data.value.message || '');
        setEstimatedFinish(data.value.estimated_finish || '');
        if (Array.isArray(data.value.allowed_emails)) {
          setAllowedEmailsInput(data.value.allowed_emails.join(', '));
        }
      }
    } catch (err) {
      console.error('Gagal memuat sistem setting:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const emailsArray = allowedEmailsInput
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

      if (!emailsArray.includes('mohdikbal1207@gmail.com')) {
        emailsArray.push('mohdikbal1207@gmail.com');
      }

      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: 'maintenance_mode',
          value: {
            is_active: isActive,
            message: message.trim(),
            allowed_emails: emailsArray,
            estimated_finish: estimatedFinish.trim() || null
          },
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setStatusMessage('Pengaturan Maintenance Mode berhasil diperbarui secara realtime!');
      fetchSettings();
    } catch (err: any) {
      alert(`Gagal menyimpan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Maintenance Control"
        badgeText="Super Admin"
        showBackButton={true}
        backUrl="/admin"
      />

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900">Kontrol Maintenance Mode</h1>
                <p className="text-xs text-slate-500">Aktifkan untuk mengunci seluruh pengoperasian staf & kasir secara instan.</p>
              </div>
            </div>

            <button onClick={fetchSettings} className="p-2 text-slate-400 hover:text-slate-700">
              <RefreshCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {statusMessage && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
              <p className="text-xs">Memuat konfigurasi sistem...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              {/* Sakelar On/Off Maintenance */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase text-slate-800 block">Status Fitur Maintenance</span>
                  <span className="text-[11px] text-slate-500">
                    {isActive ? '⚠️ Sistem Terkunci! Hanya email terdaftar yang bisa masuk.' : '🟢 Sistem Berjalan Normal (Dapat Diakses Seluruh Staf).'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive} 
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* Pesan Pemeliharaan */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-600">Pesan Pengumuman untuk Staf:</label>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Contoh: Sistem sedang perbaikan database harian..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              {/* Email Pengecualian */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-600">Email yang Tetap Diizinkan Akses (Bypass):</label>
                <input
                  type="text"
                  value={allowedEmailsInput}
                  onChange={(e) => setAllowedEmailsInput(e.target.value)}
                  placeholder="mohdikbal1207@gmail.com, admin2@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-slate-400">Pisahkan dengan koma jika lebih dari satu email.</p>
              </div>

              {/* Estimasi Selesai */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-600">Estimasi Selesai (Opsional):</label>
                <input
                  type="text"
                  value={estimatedFinish}
                  onChange={(e) => setEstimatedFinish(e.target.value)}
                  placeholder="Contoh: 19 September 2026, 22:00 WIB"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan Pengaturan Maintenance</span>
              </button>
            </form>
          )}
        </div>
      </main>

      <AdminFooter />
    </div>
  );
}