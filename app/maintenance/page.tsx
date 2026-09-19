'use client';

import { useEffect, useState, useCallback } from 'react';
import { Wrench, ShieldAlert, RefreshCcw, Building2, PhoneCall, LogIn, Activity, Clock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function MaintenancePublicPage() {
  const [message, setMessage] = useState<string>('Sistem SIMRS RSUD Bukit Kerman sedang dalam pemeliharaan rutin.');
  const [estimatedFinish, setEstimatedFinish] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Sound Feedback untuk tombol interaktif
  const playClickSound = useCallback(() => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      gain.gain.setValueAtTime(0.03, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.04);
    } catch {}
  }, []);

  const fetchMaintenanceInfo = async () => {
    setIsChecking(true);
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'maintenance_mode')
        .maybeSingle();

      if (data?.value) {
        // Jika admin sudah mematikan maintenance mode, otomatis lempar balik ke login
        if (!data.value.is_active) {
          window.location.href = '/login';
          return;
        }
        if (data.value.message) setMessage(data.value.message);
        if (data.value.estimated_finish) setEstimatedFinish(data.value.estimated_finish);
      }
    } catch {
      // Abaikan error koneksi sementara
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceInfo();
    const interval = setInterval(fetchMaintenanceInfo, 15000); // Auto-cek status tiap 15 detik

    // FITUR BARU: Realtime Listener Supabase agar langsung redirect begitu admin mematikan mode
    const channel = supabase
      .channel('public_maintenance_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_settings', filter: 'key=eq.maintenance_mode' },
        (payload: any) => {
          const newVal = payload.new?.value;
          if (newVal) {
            if (!newVal.is_active) {
              window.location.href = '/login';
            } else {
              if (newVal.message) setMessage(newVal.message);
              if (newVal.estimated_finish !== undefined) setEstimatedFinish(newVal.estimated_finish);
            }
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 select-none relative overflow-hidden">
      
      {/* Efek Cahaya Estetik Background Ganda */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      {/* Header Identitas RSUD */}
      <div className="flex items-center justify-between max-w-4xl mx-auto w-full pt-4 relative z-10">
        <div className="flex items-center space-x-2.5">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 shadow-sm">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase text-slate-200">RSUD BUKIT KERMAN</h1>
            <p className="text-[10px] text-slate-400">Sistem Informasi Manajemen Rumah Sakit</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Indikator Sinyal Realtime */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Sync Active</span>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider shadow-sm">
            <ShieldAlert className="w-3.5 h-3.5" /> Maintenance Active
          </span>
        </div>
      </div>

      {/* Konten Utama Peringatan */}
      <main className="max-w-lg mx-auto w-full text-center space-y-6 my-auto py-12 relative z-10">
        <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-3xl flex items-center justify-center mx-auto shadow-2xl relative backdrop-blur-md">
          <Wrench className="w-10 h-10 animate-bounce" />
          <span className="w-3 h-3 bg-amber-400 rounded-full absolute top-2 right-2 animate-ping"></span>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Sistem Sedang Pemeliharaan</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {message}
          </p>
        </div>

        {estimatedFinish && (
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl inline-block shadow-inner backdrop-blur-sm space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Estimasi Layanan Normal Kembali:
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-emerald-400">{estimatedFinish}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => { playClickSound(); fetchMaintenanceInfo(); }}
            disabled={isChecking}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-6 py-3.5 rounded-2xl transition shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 border border-slate-700/50"
          >
            <RefreshCcw className={`w-3.5 h-3.5 text-amber-400 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Cek Status Server Sekarang</span>
          </button>

          {/* Tombol Pintasan Coba Login */}
          <a
            href="/login"
            onClick={playClickSound}
            className="inline-flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-5 py-3.5 rounded-2xl transition shadow-lg active:scale-95"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Coba Masuk (Login)</span>
          </a>
        </div>
      </main>

      {/* Footer Bantuan IT Support dengan Sentuhan UX Interaktif */}
      <div className="max-w-4xl mx-auto w-full text-center border-t border-slate-900 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-3 relative z-10">
        <span className="flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Kendala mendesak atau butuh akses darurat? Hubungi IT Coordinator
        </span>
        <a 
          href="https://wa.me/6282281155614?text=Halo%20IT%20Support,%20saya%20ingin%20menanyakan%20status%20maintenance%20SIMRS%20RSUD%20Bukit%20Kerman." 
          target="_blank" 
          rel="noreferrer" 
          className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
        >
          <PhoneCall className="w-3.5 h-3.5" /> WhatsApp IT Support RSUD
        </a>
      </div>
    </div>
  );
}