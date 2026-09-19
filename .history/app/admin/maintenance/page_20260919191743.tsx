'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Wrench, ShieldCheck, Save, Loader2, AlertTriangle, CheckCircle2, RefreshCcw, ArrowLeft, Activity, Lock, Unlock, ExternalLink, Sparkles, Clock, Mail, Eye, X, ShieldAlert, PhoneCall } from 'lucide-react';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

export default function MaintenanceControlPage() {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [allowedEmailsInput, setAllowedEmailsInput] = useState<string>('mohdikbal1207@gmail.com');
  const [estimatedFinish, setEstimatedFinish] = useState<string>('');
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Fitur Baru: State Modal Simulasi Preview Publik
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);

  // Sound Feedback & Toast State
  const playSound = useCallback((type: 'success' | 'click') => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (type === 'success') {
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      }
    } catch {}
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value, updated_at')
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
      if (data?.updated_at) {
        setLastUpdatedTime(new Date(data.updated_at).toLocaleString('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'medium'
        }));
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
      playSound('success');
      fetchSettings();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(`Gagal menyimpan: ${err.message}`);
      } else {
        alert('Terjadi kesalahan saat menyimpan pengaturan.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Preset Template Pesan Cepat
  const applyPresetMessage = (presetType: string) => {
    playSound('click');
    if (presetType === 'database') {
      setMessage('Sistem SIMRS RSUD Bukit Kerman sedang melakukan optimasi dan pemeliharaan database rutin. Seluruh layanan kasir dan rekam medis ditutup sementara.');
    } else if (presetType === 'update') {
      setMessage('Pembaruan versi sistem (System Update) sedang berlangsung. Layanan akan kembali normal setelah proses sinkronisasi selesai.');
    } else if (presetType === 'darurat') {
      setMessage('Maintenance darurat infrastruktur server pusat sedang dilakukan demi keamanan data pasien. Mohon bersabar.');
    }
  };

  // Preset Quick Time Estimasi
  const applyQuickTime = (hoursAhead: number) => {
    playSound('click');
    const targetDate = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const options: Intl.DateTimeFormatOptions = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    };
    setEstimatedFinish(targetDate.toLocaleDateString('id-ID', options));
  };

  // Parsed email array untuk visualisasi chip
  const parsedEmails = allowedEmailsInput.split(',').map(e => e.trim()).filter(Boolean);

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
              <Wrench className="w-4 h-4 text-amber-600 animate-spin" />
              <span>Kontrol Keamanan & Perbaikan Sistem</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Maintenance Mode Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl leading-relaxed">
              Aktifkan mode pemeliharaan untuk mengunci akses seluruh staf, kasir, dan unit pelayanan secara instan saat pemeliharaan database atau update SIMRS berlangsung.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* FITUR BARU: Tombol Simulasi Preview Modal */}
            <button
              type="button"
              onClick={() => { playSound('click'); setShowPreviewModal(true); }}
              className="inline-flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition cursor-pointer active:scale-95"
              title="Simulasi Tampilan Layar Staf"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Simulasi Layar</span>
            </button>

            <a 
              href="/maintenance"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3.5 py-3 rounded-2xl transition"
              title="Pratinjau Halaman Maintenance Publik"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>Tab Baru</span>
            </a>

            <button 
              type="button"
              onClick={fetchSettings}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3 rounded-2xl transition cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <RefreshCcw className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>

        {/* FITUR BARU: Informasi Audit Trail / Terakhir Diperbarui */}
        {lastUpdatedTime && (
          <div className="px-5 py-3 bg-slate-100/80 border border-slate-200 rounded-2xl flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Terakhir diperbarui di database: <strong className="text-slate-700">{lastUpdatedTime}</strong>
            </span>
            <span className={`px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${isActive ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
              {isActive ? 'Mode Terkunci' : 'Mode Normal'}
            </span>
          </div>
        )}

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
                  onChange={(e) => { playSound('click'); setIsActive(e.target.checked); }}
                  className="sr-only peer" 
                />
                <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500 shadow-inner"></div>
              </label>
            </div>

            {/* Input Pesan Pengumuman dengan Preset Cepat */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pesan Pengumuman Pemeliharaan (Tampil di Layar Staf):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Preset:</span>
                  <button type="button" onClick={() => applyPresetMessage('database')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer">DB Rutin</button>
                  <button type="button" onClick={() => applyPresetMessage('update')} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer">Update Sistem</button>
                  <button type="button" onClick={() => applyPresetMessage('darurat')} className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[10px] font-semibold transition cursor-pointer">Darurat</button>
                  {message && (
                    <button type="button" onClick={() => { playSound('click'); setMessage(''); }} className="text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1" title="Bersihkan teks">✕</button>
                  )}
                </div>
              </div>
              <textarea
                required
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contoh: Sistem SIMRS RSUD Bukit Kerman sedang dalam pemeliharaan database rutin..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white transition font-medium leading-relaxed"
              />
            </div>

            {/* Input Email Bypass dengan Visualizer Chips */}
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
              
              {/* Chips Pratinjau Email */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedEmails.map((email, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {email}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-400">
                Pisahkan dengan koma jika mendaftarkan lebih dari satu email admin/developer.
              </p>
            </div>

            {/* Input Estimasi Selesai dengan Quick Button */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Estimasi Selesai Perbaikan (Opsional):
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Cepat:</span>
                  <button type="button" onClick={() => applyQuickTime(1)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer">+1 Jam</button>
                  <button type="button" onClick={() => applyQuickTime(3)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer">+3 Jam</button>
                  <button type="button" onClick={() => applyQuickTime(24)} className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-semibold transition cursor-pointer">Besok</button>
                  {estimatedFinish && (
                    <button type="button" onClick={() => { playSound('click'); setEstimatedFinish(''); }} className="text-slate-400 hover:text-rose-600 text-[10px] font-bold px-1" title="Bersihkan estimasi">✕</button>
                  )}
                </div>
              </div>
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

      {/* FITUR BARU: Modal Simulasi Tampilan Layar Publik (Preview) */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col relative text-white">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-xs font-mono text-slate-400 ml-2">Simulasi Layar Staf / Publik</span>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body Preview Content */}
            <div className="p-8 text-center space-y-6 my-auto">
              <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner relative">
                <Wrench className="w-8 h-8 animate-bounce" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <h3 className="text-xl font-black text-white tracking-tight">Sistem Sedang Pemeliharaan</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {message || 'Sistem SIMRS RSUD Bukit Kerman sedang dalam pemeliharaan rutin.'}
                </p>
              </div>

              {estimatedFinish && (
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl inline-block shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">Estimasi Layanan Normal:</span>
                  <span className="text-xs font-mono font-bold text-emerald-400">{estimatedFinish}</span>
                </div>
              )}

              <div className="pt-4 border-t border-slate-900 text-[11px] text-slate-500 flex items-center justify-center gap-2">
                <span>Butuh akses darurat? Hubungi</span>
                <a href="https://wa.me/6282281155614" target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline">
                  IT Support RSUD
                </a>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 text-center">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-6 py-2.5 rounded-xl transition cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

      <AdminFooter />
    </div>
  );
}