'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  WifiOff,
  Receipt,
  PhoneCall,
  KeyRound,
  UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export default function LoginPage() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');

  // Deteksi Status Koneksi Internet
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handler Login Sesuai Role Presisi dengan Hard Refresh
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!emailOrUsername.trim() || !password.trim()) {
      setErrorMessage('Email/Username dan Kata Sandi wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      const loginEmail = emailOrUsername.includes('@') 
        ? emailOrUsername.trim() 
        : `${emailOrUsername.trim().toLowerCase().replace(/\s+/g, '')}@rsudbukitkerman.id`;

      // 1. Autentikasi Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError || !authData.user) {
        throw new Error('Email/Username atau Kata Sandi yang Anda masukkan salah.');
      }

      // 2. Ambil data dari tabel `users` berdasarkan UUID `id` authData.user.id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role, is_active, nama_lengkap')
        .eq('id', authData.user.id)
        .single();

      if (userError || !userData) {
        await supabase.auth.signOut();
        throw new Error('Data profil pengguna tidak ditemukan di database SIMRS.');
      }

      // 3. Validasi status keaktifan akun
      if (!userData.is_active) {
        await supabase.auth.signOut();
        throw new Error('Akun Anda belum diverifikasi atau dinonaktifkan oleh Administrator.');
      }

      setSuccessMessage(`Login berhasil! Selamat datang, ${userData.nama_lengkap || 'Staf'}. Mengalihkan...`);

      // 4. Pengarahan mutlak dengan window.location.href agar sesi tersinkronisasi penuh
      const userRole = userData.role?.toLowerCase() || '';

      setTimeout(() => {
        let targetUrl = '/kasir';
        
        if (redirectTo) {
          targetUrl = redirectTo;
        } else if (userRole === 'admin') {
          targetUrl = '/admin';
        } else if (userRole === 'manajemen' || userRole === 'management') {
          targetUrl = '/manajemen';
        } else if (userRole === 'kasir') {
          targetUrl = '/kasir';
        }

        window.location.href = targetUrl;
      }, 1000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Kontak Bantuan IT
  const handleContactIT = () => {
    const message = encodeURIComponent(
      `Halo Admin IT RSUD Bukit Kerman, saya mengalami kendala login pada Portal Kasir BLUD (Akun: ${emailOrUsername || '-'}). Mohon bantuan reset/akses.`
    );
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute -bottom-10 left-10 w-[400px] h-[400px] bg-sky-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir &amp; Pembayaran Tarif BLUD"
        badgeText="Portal Login Staf"
        showBackButton={true}
        backUrl="/"
      />

      <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        
        <div className="w-full max-w-md space-y-4">
          
          {isOffline && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-xs flex items-center space-x-2.5 animate-pulse shadow-sm">
              <WifiOff className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>Koneksi internet terputus. Silakan periksa jaringan Anda.</span>
            </div>
          )}

          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative overflow-hidden">
            
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 shadow-sm mb-1">
                <Receipt className="w-7 h-7" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Login Portal Kasir BLUD
              </h1>
              <p className="text-xs text-slate-500">
                Akses Terbatas Petugas Keuangan &amp; Billing RSUD Bukit Kerman
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start space-x-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Email / Username Staf
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Masukkan Email atau Username..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Kata Sandi / Password
                  </label>
                  <Link
                    href="/lupa-password"
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 font-bold transition cursor-pointer hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan Kata Sandi..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    aria-label={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer w-4 h-4"
                  />
                  <span>Ingat sesi perangkat ini</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading || isOffline}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk Portal Kasir</span>
                  </>
                )}
              </button>

            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-3">
              
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 flex items-center justify-between">
                <div className="text-left">
                  <p className="text-[11px] font-bold text-slate-800">Staf Baru / Belum Punya Akun?</p>
                  <p className="text-[10px] text-slate-500">Ajukan hak akses loket kasir Anda.</p>
                </div>
                <Link
                  href="/daftar"
                  className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition shadow-sm active:scale-95 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Daftar Akun</span>
                </Link>
              </div>

              <div className="pt-1">
                <p className="text-[11px] text-slate-500 mb-1">Butuh bantuan darurat kendala login?</p>
                <button
                  type="button"
                  onClick={handleContactIT}
                  className="inline-flex items-center space-x-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-bold transition cursor-pointer hover:underline"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hubungi IT Coordinator (Mohd. Ikbal)</span>
                </button>
              </div>

            </div>

          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-600 backdrop-blur-md shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] font-medium">Sistem Terenkripsi &amp; Terkoneksi SIMRS BLUD</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">v2.6.4</span>
          </div>

        </div>

      </main>

      <PublicFooter />

    </div>
  );
}