'use client';

import { useState } from 'react';
import { 
  KeyRound, 
  Mail, 
  User, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  PhoneCall,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export default function LupaPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!identifier.trim()) {
      setErrorMessage('NIP / Username / Email wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      // Simulasi Permintaan Reset Kata Sandi
      await new Promise((resolve) => setTimeout(resolve, 1200));

      setIsSubmitted(true);
    } catch (err: unknown) {
      setErrorMessage('Gagal memproses permintaan reset password. Silakan hubungi Admin IT.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectWhatsApp = () => {
    const message = encodeURIComponent(
      `Halo Admin IT RSUD Bukit Kerman, saya lupa kata sandi akun Kasir BLUD. Berikut ID/NIP saya: ${identifier || '-'}. Mohon bantuan reset password.`
    );
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Glow Latar Cerah */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir & Pembayaran Tarif BLUD"
        badgeText="Reset Password"
        showBackButton={true}
        backUrl="/login"
      />

      <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-md space-y-4">
          
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative overflow-hidden">
            
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 shadow-sm mb-1">
                <KeyRound className="w-7 h-7" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Lupa Kata Sandi?
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan NIP, Username, atau Email akun Kasir Anda untuk memproses verifikasi pemulihan kata sandi.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    NIP / Username / Email
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan NIP atau Username..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 rounded-2xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer min-h-[44px] disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Kirim Permintaan Reset</span>
                    </>
                  )}
                </button>

              </form>
            ) : (
              <div className="space-y-4 text-center animate-in fade-in">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Permintaan Berhasil Dikirim!</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Instruksi pemulihan kata sandi untuk ID <span className="font-semibold text-emerald-700">{identifier}</span> telah disebarkan ke antrean verifikasi Admin IT.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDirectWhatsApp}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-2xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Konfirmasi Cepat via WhatsApp IT</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-emerald-600 font-bold transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Halaman Login</span>
              </Link>
            </div>

          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-600 backdrop-blur-md shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] font-medium">Bantuan Otentikasi Keamanan SIMRS</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">BLUD</span>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}