'use client';

import { useState, useEffect, Suspense } from 'react';
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
  Building2,
  PhoneCall,
  KeyRound,
  UserPlus,
  Loader2,
  Moon,
  Sun,
  Command,
  Clock,
  Info
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

function LoginFormContent() {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Masuk ke Sistem SIMRS');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState<boolean>(false);
  const [shakeCard, setShakeCard] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [currentShiftInfo, setCurrentShiftInfo] = useState<string>('Shift Reguler');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect');
  const reason = searchParams.get('reason');

  // Deteksi Status Koneksi, Shift Waktu, Alasan Redirect, & Preferensi
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      const savedEmail = localStorage.getItem('rsud_saved_login_id');
      if (savedEmail) {
        setEmailOrUsername(savedEmail);
        setRememberMe(true);
      }

      const savedTheme = localStorage.getItem('rsud_login_dark_mode');
      if (savedTheme === 'true') {
        setIsDarkMode(true);
      }

      // Tangkap alasan jika ditendang keluar oleh admin atau sesi habis
      if (reason === 'force_logout') {
        setNoticeMessage('Sesi Anda telah diakhiri secara paksa oleh Administrator Rumah Sakit.');
      } else if (reason === 'session_expired') {
        setNoticeMessage('Sesi login Anda telah berakhir. Silakan masuk kembali.');
      }

      // Deteksi Shift Waktu Rumah Sakit Berdasarkan Jam Lokal
      const currentHour = new Date().getHours();
      if (currentHour >= 7 && currentHour < 14) {
        setCurrentShiftInfo('☀️ Shift Pagi');
      } else if (currentHour >= 14 && currentHour < 21) {
        setCurrentShiftInfo('🌇 Shift Sore');
      } else {
        setCurrentShiftInfo('🌙 Shift Malam (Jaga)');
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reason]);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rsud_login_dark_mode', String(newMode));
    }
  };

  // Trigger Shake Animation saat Error
  const triggerError = (msg: string) => {
    setErrorMessage(msg);
    setShakeCard(true);
    setTimeout(() => setShakeCard(false), 500);
  };

  // Deteksi Caps Lock pada Input Password
  const handlePasswordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const capsLockActive = e.getModifierState && e.getModifierState('CapsLock');
    setIsCapsLockOn(!!capsLockActive);
  };

  // Handler Login Sesuai Role Presisi dengan Hard Refresh & Sesi Tracking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setNoticeMessage(null);

    if (!emailOrUsername.trim() || !password.trim()) {
      triggerError('Email/Username dan Kata Sandi wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      setLoadingStepText('Memeriksa Kredensial...');
      const loginEmail = emailOrUsername.includes('@') 
        ? emailOrUsername.trim() 
        : `${emailOrUsername.trim().toLowerCase().replace(/\s+/g, '')}@rsudbukitkerman.id`;

      if (rememberMe) {
        localStorage.setItem('rsud_saved_login_id', emailOrUsername.trim());
      } else {
        localStorage.removeItem('rsud_saved_login_id');
      }

      // 1. Autentikasi Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError || !authData.user) {
        throw new Error('Email/Username atau Kata Sandi yang Anda masukkan salah.');
      }

      setLoadingStepText('Memverifikasi Profil Staf...');
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

      setLoadingStepText('Mencatat Sesi Aktif...');
      // 4. Catat Sesi Aktif ke Tabel `user_sessions` untuk Fitur Monitoring Admin
      await supabase.from('user_sessions').insert([
        {
          user_id: authData.user.id,
          nama_lengkap: userData.nama_lengkap,
          role: userData.role,
          is_active: true
        }
      ]);

      setLoadingStepText('Menyiapkan Sesi Pengguna...');
      setSuccessMessage(`Login berhasil! Selamat datang, ${userData.nama_lengkap || 'Staf'}. Mengalihkan...`);

      // 5. Pengarahan mutlak dengan window.location.href agar sesi tersinkronisasi penuh
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
        triggerError(err.message);
      } else {
        triggerError('Terjadi kesalahan saat mencoba masuk. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
      setLoadingStepText('Masuk ke Sistem SIMRS');
    }
  };

  // Direct Kontak Bantuan IT
  const handleContactIT = () => {
    const message = encodeURIComponent(
      `Halo Admin IT RSUD Bukit Kerman, saya mengalami kendala login pada Portal Staf SIMRS (Akun: ${emailOrUsername || '-'}). Mohon bantuan reset/akses.`
    );
    window.open(`https://wa.me/6282281155614?text=${message}`, '_blank');
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'} flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden transition-colors duration-300`}>
      
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>
      <div className="absolute -bottom-10 left-10 w-[400px] h-[400px] bg-sky-200/20 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Manajemen Rumah Sakit (SIMRS)"
        badgeText="Portal Login Staf"
        showBackButton={true}
        backUrl="/"
      />

      <main className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        
        <div className="w-full max-w-md space-y-4">
          
          {/* Peringatan Jaringan Offline */}
          {isOffline && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl px-4 py-3 text-xs flex items-center space-x-2.5 animate-pulse shadow-sm">
              <WifiOff className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>Koneksi internet terputus. Silakan periksa jaringan Anda.</span>
            </div>
          )}

          <div className={`${isDarkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/80' : 'bg-white/95 border-slate-200/90 text-slate-800 shadow-slate-200/60'} border rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden transition-transform ${shakeCard ? 'animate-bounce' : ''}`}>
            
            {/* Header Kontrol Kanan Atas: Shift Aktif & Tombol Dark Mode */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-xl border ${isDarkMode ? 'bg-slate-800 border-slate-700 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                <Clock className="w-3 h-3" /> {currentShiftInfo}
              </span>
              <button
                type="button"
                onClick={toggleDarkMode}
                className={`p-2 rounded-xl border transition cursor-pointer ${isDarkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                title={isDarkMode ? 'Aktifkan Mode Terang' : 'Aktifkan Mode Jaga Malam (Dark Mode)'}
                aria-label="Toggle Theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>

            <div className="text-center space-y-2 mb-6 pt-2 sm:pt-0">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 shadow-sm mb-1">
                <Building2 className="w-7 h-7" />
              </div>
              
              <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                Login Portal Staf SIMRS
              </h1>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Akses Masuk Petugas, Manajemen, &amp; Administrator RSUD Bukit Kerman
              </p>
            </div>

            {/* Notice Banner (Force Logout / Session Expired) */}
            {noticeMessage && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-start space-x-2.5 shadow-sm" role="status">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{noticeMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-sm" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start space-x-2.5 animate-in fade-in duration-200 shadow-sm" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="emailOrUsername" className={`text-[11px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    Email / Username Staf
                  </label>
                  <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-0.5">
                    <Command className="w-3 h-3" /> Auto-Domain
                  </span>
                </div>
                <div className="relative">
                  <User className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${activeField === 'username' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <input
                    id="emailOrUsername"
                    type="text"
                    required
                    autoFocus
                    value={emailOrUsername}
                    onFocus={() => setActiveField('username')}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => setEmailOrUsername(e.target.value)}
                    placeholder="Masukkan Email atau Username..."
                    aria-invalid={errorMessage ? "true" : "false"}
                    className={`w-full border rounded-2xl pl-10 pr-3.5 py-3 text-xs placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition font-medium ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
                  />
                </div>
                <p className={`text-[10px] pl-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  *Bisa menggunakan username staf atau email kedinasan.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className={`text-[11px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
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
                  <KeyRound className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors ${activeField === 'password' ? 'text-emerald-500' : 'text-slate-400'}`} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onFocus={() => setActiveField('password')}
                    onBlur={() => setActiveField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={handlePasswordKeyDown}
                    onKeyUp={(e) => {
                      const capsLockActive = e.getModifierState && e.getModifierState('CapsLock');
                      setIsCapsLockOn(!!capsLockActive);
                    }}
                    placeholder="Masukkan Kata Sandi..."
                    aria-invalid={errorMessage ? "true" : "false"}
                    className={`w-full border rounded-2xl pl-10 pr-10 py-3 text-xs placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition font-medium ${isDarkMode ? 'bg-slate-800/80 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'}`}
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

                {/* Peringatan Caps Lock */}
                {isCapsLockOn && (
                  <p className="text-[10px] text-amber-500 font-medium flex items-center gap-1 mt-1 pl-1" role="alert">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    Perhatian: Tombol Caps Lock aktif.
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className={`flex items-center space-x-2 text-xs cursor-pointer select-none font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer w-4 h-4"
                  />
                  <span>Ingat sesi perangkat ini</span>
                </label>
                <span className="text-[10px] text-slate-400 hidden sm:inline">💡 Tekan Enter</span>
              </div>

              <button
                type="submit"
                disabled={isLoading || isOffline}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2.5 active:scale-95 cursor-pointer min-h-[46px] disabled:opacity-50 disabled:cursor-not-allowed mt-2 relative overflow-hidden"
              >
                {isLoading && (
                  <div className="absolute bottom-0 left-0 h-1 bg-emerald-400 animate-pulse w-full"></div>
                )}
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{loadingStepText}</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke Sistem SIMRS</span>
                  </>
                )}
              </button>

            </form>

            <div className={`mt-6 pt-5 border-t text-center space-y-3 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              
              <div className={`${isDarkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-emerald-50/70 border-emerald-200/80'} border rounded-2xl p-3 flex items-center justify-between shadow-inner`}>
                <div className="text-left">
                  <p className={`text-[11px] font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>Staf Baru / Belum Punya Akun?</p>
                  <p className={`text-[10px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ajukan hak akses sistem rumah sakit.</p>
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
                <p className={`text-[11px] mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Butuh bantuan darurat kendala login?</p>
                <button
                  type="button"
                  onClick={handleContactIT}
                  className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 hover:text-emerald-500 font-bold transition cursor-pointer hover:underline"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Hubungi IT Coordinator (Mohd. Ikbal)</span>
                </button>
              </div>

            </div>

          </div>

          <div className={`${isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200/80 text-slate-600'} border rounded-2xl p-3.5 flex items-center justify-between text-xs backdrop-blur-md shadow-sm`}>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-[11px] font-medium">Sistem Terenkripsi &amp; Terkoneksi SIMRS BLUD</span>
            </div>
            <span className={`text-[10px] font-mono font-semibold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>v2.6.4</span>
          </div>

        </div>

      </main>

      <PublicFooter />

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}