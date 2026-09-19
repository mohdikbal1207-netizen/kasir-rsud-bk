'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, ShieldCheck, Save, Loader2, AlertTriangle, CheckCircle2, RefreshCcw, ArrowLeft, Activity, Lock, Unlock } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-amber-500 selection:text-white relative overflow-hidden">
      
      {/* Efek Background Blur Estetik */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-amber-200/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-teal-200/20 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Maintenance Control Pusat"
        badgeText="Super Admin"
        showBackButton={true}
        backUrl="/admin"
      />

      <main className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-10 flex-1 space-y-6 relative z-10">
        
        {/* Header Banner Kartu */}
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-200 px-3.5 py-1.5 rounded-xl text-amber-700 text-xs font-bold shadow-sm">
              <Wrench className="w-4 h-4 text-amber-600 animate-spin-slow" />
              <span>Kontrol Keamanan & Perbaikan Sistem</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Maintenance Mode Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Aktifkan mode pemeliharaan untuk mengunci akses seluruh staf, kasir, dan unit pelayanan secara instan saat pemeliharaan database atau update SIMRS berlangsung.
            </p>
          </div>

          <button 
            onClick={fetchSettings}
            disabled={isLoading}
            className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCcw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 shadow-sm animate-in fade-in">
            <div className="p-1 bg-emerald-500 text-white rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <span>{statusMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
            <p className="text-xs font-bold text-slate-400">Memuat konfigurasi maintenance...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-6">
            
            {/* Kartu Sakelar Utama */}
            <div className={`p-5 sm:p-6 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isActive ? 'bg-amber-50/70 border-amber-300 shadow-lg shadow-amber-500/5' : 'bg-slate-50 border-slate-200'}`}>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  {isActive ? (
                    <span className="flex h-2.5 w-2.5 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                  )}
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Status Fitur Maintenance: <span className={isActive ? 'text-amber-600' : 'text-emerald-600'}>{isActive ? 'AKTIF (Terkunci)' : 'TIDAK AKTIF (Normal)'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                  {isActive 
                    ? '⚠️ Saat ini seluruh rute staf, kasir, dan manajemen sedang dikunci. Hanya email yang terdaftar pada daftar bypass yang dapat masuk.' 
                    : '🟢 Sistem berjalan normal. Seluruh pegawai dapat mengakses modul layanan kesehatan seperti biasa.'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input 
                  type="checkbox" 
                  checked={isActive} 
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
              </label>
            </div>

            {/* Input Pesan Pengumuman */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Pesan Pengumuman Pemeliharaan (Tampil di Layar Staf):
              </label>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contoh: Sistem SIMRS RSUD Bukit Kerman sedang dalam pemeliharaan database rutin..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition font-medium leading-relaxed"
              />
            </div>

            {/* Input Email Bypass */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Email Pengecualian Akses (Bypass Whitelist):
              </label>
              <input
                type="text"
                value={allowedEmailsInput}
                onChange={(e) => setAllowedEmailsInput(e.target.value)}
                placeholder="mohdikbal1207@gmail.com, admin@rsud.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Pisahkan dengan koma jika mendaftarkan lebih dari satu email admin/developer.
              </p>
            </div>

            {/* Input Estimasi Selesai */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Estimasi Selesai Perbaikan (Opsional):
              </label>
              <input
                type="text"
                value={estimatedFinish}
                onChange={(e) => setEstimatedFinish(e.target.value)}
                placeholder="Contoh: 19 September 2026, pukul 22:00 WIB"
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition font-medium"
              />
            </div>

            {/* Tombol Simpan */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs px-8 py-3.5 rounded-2xl transition shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Simpan & Terapkan Pengaturan</span>
              </button>
            </div>

          </form>
        )}

      </main>

      <AdminFooter />
    </div>
  );
}