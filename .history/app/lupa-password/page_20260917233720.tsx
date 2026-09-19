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
  HelpCircle,
  Sparkles,
  X
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export default function LupaPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Memproses Permintaan...');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);

  // Deteksi tipe masukan secara instan (Email, NIP, atau Username)
  const getIdentifierType = (val: string) => {
    if (!val) return '';
    if (val.includes('@')) return 'Format Email Kedinasan';
    if (/^\d+$/.test(val)) return 'Format Nomor NIP / ID';
    return 'Format Username / Nama';
  };

  // Fungsi memanggil API Internal WhatsApp Gateway yang diselaraskan dengan server route
  const sendWhatsAppNotificationToAdmin = async (targetIdentifier: string) => {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nama_lengkap: `[PERMINTAAN RESET PASSWORD] - ID: ${targetIdentifier}`,
          unit_kerja: 'Manajemen / Kasir BLUD RSUD Bukit Kerman',
          nip: targetIdentifier,
          email: targetIdentifier.includes('@') ? targetIdentifier : '-',
          no_telepon: '6282281155614', // Nomor darurat IT Coordinator (Mohd. Ikbal)
        }),
      });
    } catch (err) {
      console.error('Gagal memicu pengiriman WhatsApp otomatis:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown) return;
    setErrorMessage(null);

    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setErrorMessage('NIP / Username / Email wajib diisi terlebih dahulu!');
      return;
    }

    setIsLoading(true);

    try {
      setLoadingStepText('Memeriksa data akun di database SIMRS...');
      
      // Cek apakah identifier ada di tabel profiles (berdasarkan NIP, email, atau nama)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap, unit_kerja, email, nip')
        .or(`nip.eq.${cleanIdentifier},email.eq.${cleanIdentifier},nama_lengkap.ilike.%${cleanIdentifier}%`)
        .maybeSingle();

      if (profileError) {
        console.warn('Peringatan pencarian profil:', profileError.message);
      }

      // Jika menggunakan Supabase Auth reset password untuk email valid
      if (cleanIdentifier.includes('@')) {
        setLoadingStepText('Mengirim tautan pemulihan via Supabase Auth...');
        const { error: authResetError } = await supabase.auth.resetPasswordForEmail(cleanIdentifier, {
          redirectTo: `${window.location.origin}/auth/update-password`,
        });
        if (authResetError) {
          console.warn('Catatan Auth Reset:', authResetError.message);
        }
      }

      setLoadingStepText('Mengirim notifikasi darurat ke Admin IT...');
      // Kirim notifikasi otomatis ke WhatsApp Admin IT (Mohd. Ikbal)
      await sendWhatsAppNotificationToAdmin(cleanIdentifier);

      setIsSubmitted(true);
      
      // Aktifkan cooldown selama 10 detik untuk mencegah spam klik
      setCooldown(true);
      setTimeout(() => setCooldown(false), 10000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal memproses permintaan reset password. Silakan hubungi Admin IT.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStepText('Memproses Permintaan...');
    }
  };

  const handleDirectWhatsApp = () => {
    const message = encodeURIComponent(
      `Halo Admin IT RSUD Bukit Kerman (Mohd. Ikbal), saya lupa kata sandi akun Kasir/SIMRS. Berikut ID/NIP/Email saya: ${identifier || '-'}. Mohon bantuan verifikasi dan reset password.`
    );
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  const idType = getIdentifierType(identifier);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      {/* Glow Latar Cerah */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir &amp; Pembayaran Tarif BLUD"
        badgeText="Reset Password"
        showBackButton={true}
        backUrl="/login"
      />

      <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        <div className="w-full max-w-md space-y-4">
          
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative overflow-hidden">
            
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 shadow-sm mb-1">
                <KeyRound className="w-7 h-7" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Lupa Kata Sandi?
              </h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                Masukkan NIP, Username, atau Email akun Anda untuk memproses verifikasi pemulihan kata sandi melalui Administrator IT.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 shadow-sm animate-in fade-in" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {!isSubmitted ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      NIP / Username / Email
                    </label>
                    {idType && (
                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {idType}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Masukkan NIP, Username, atau Email..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium shadow-inner"
                    />
                    {identifier && (
                      <button
                        type="button"
                        onClick={() => setIdentifier('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-0.5 cursor-pointer"
                        title="Bersihkan teks"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || cooldown}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer min-h-[46px] disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{loadingStepText}</span>
                    </>
                  ) : cooldown ? (
                    <span>Tunggu beberapa detik...</span>
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
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 space-y-2.5 shadow-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="font-bold text-sm">Permintaan Berhasil Dikirim!</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Instruksi pemulihan kata sandi untuk ID <span className="font-semibold text-emerald-700">{identifier}</span> telah dicatat dalam sistem dan notifikasi darurat telah diteruskan secara otomatis ke WhatsApp Admin IT (Mohd. Ikbal).
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDirectWhatsApp}
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-3.5 rounded-2xl transition shadow-md flex items-center justify-center space-x-2 cursor-pointer active:scale-95"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Konfirmasi Cepat via WhatsApp IT</span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <Link
                href="/login"
                className="inline-flex items-center space-x-1.5 text-xs text-slate-600 hover:text-emerald-600 font-bold transition cursor-pointer hover:underline"
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
            <span className="text-[10px] font-mono text-slate-400 font-semibold">BLUD v2.6</span>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}