'use client';

import { useState } from 'react';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Building2, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  FileBadge,
  Phone,
  User,
  Calendar,
  MapPin,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';

export default function DaftarPage() {
  const [formData, setFormData] = useState({
    nama_lengkap: '',
    nik: '',
    nip: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    unit_kerja: '',
    no_telepon: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak sesuai dengan kata sandi yang dimasukkan.');
      return;
    }

    if (formData.password.length < 6) {
      setErrorMessage('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      let publicPhotoUrl = '';

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profiles')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        publicPhotoUrl = publicUrlData.publicUrl;
      }

      // 1. Simpan data kredensial ke tabel `users`
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert([
          {
            email: formData.email,
            role: formData.unit_kerja,
            is_active: false,
          }
        ])
        .select()
        .single();

      if (userError) throw userError;

      // 2. Simpan profil lengkap ke tabel `profiles`
      if (userData) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userData.id,
              nama_lengkap: formData.nama_lengkap,
              nik: formData.nik,
              nip: formData.nip,
              tempat_lahir: formData.tempat_lahir,
              tanggal_lahir: formData.tanggal_lahir || null,
              unit_kerja: formData.unit_kerja,
              no_telepon: formData.no_telepon,
              foto_uri: publicPhotoUrl || null,
            }
          ]);

        if (profileError) throw profileError;
      }

      setSuccessMessage('Registrasi berhasil! Data profil Anda telah disimpan dan sedang menunggu verifikasi dari Administrator.');
      
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 2500);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat mengunggah foto atau menyimpan data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir & Pembayaran Tarif BLUD"
        badgeText="Registrasi Akun Staf"
        showBackButton={true}
        backUrl="/login"
      />

      <main className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        <div className="w-full space-y-4">
          
          <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative overflow-hidden">
            
            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 shadow-sm mb-1">
                <UserPlus className="w-7 h-7" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Formulir Pendaftaran &amp; Profil Pegawai
              </h1>
              <p className="text-xs text-slate-500">
                Lengkapi data diri secara valid untuk pengajuan hak akses sistem informasi rumah sakit.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Seksion Unggah Foto */}
              <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 border border-slate-200 p-4 rounded-2xl">
                <div className="w-20 h-20 rounded-2xl bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center flex-shrink-0 relative shadow-inner">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1 text-center sm:text-left">
                  <label className="text-xs font-bold text-slate-700 block">Unggah Pas Foto Resmi</label>
                  <p className="text-[11px] text-slate-500">Format berkas yang didukung: JPG atau PNG (Maksimal 2MB).</p>
                  
                  <label className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition shadow-sm">
                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pilih Berkas Foto</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                  {selectedFile && <span className="text-[10px] text-emerald-600 font-medium block mt-1">Berkas terpilih: {selectedFile.name}</span>}
                </div>
              </div>

              {/* Baris Input 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nama Lengkap beserta Gelar</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="nama_lengkap"
                      required
                      value={formData.nama_lengkap}
                      onChange={handleChange}
                      placeholder="Contoh: dr. H. Ahmad, Sp.An"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Alamat Email Kedinasan / Aktif</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="nama.pegawai@rsudbukitkerman.id"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Baris Input 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nomor Induk Kependudukan (NIK)</label>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="nik"
                      required
                      value={formData.nik}
                      onChange={handleChange}
                      placeholder="Masukkan 16 digit NIK KTP..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nomor Induk Pegawai (NIP / ID)</label>
                  <div className="relative">
                    <FileBadge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="nip"
                      required
                      value={formData.nip}
                      onChange={handleChange}
                      placeholder="Masukkan NIP atau ID Pegawai..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Baris Input 3 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Tempat Kelahiran</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="tempat_lahir"
                      required
                      value={formData.tempat_lahir}
                      onChange={handleChange}
                      placeholder="Contoh: Sungai Penuh"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Tanggal Kelahiran</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      name="tanggal_lahir"
                      required
                      value={formData.tanggal_lahir}
                      onChange={handleChange}
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nomor Seluler (WhatsApp)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      name="no_telepon"
                      required
                      value={formData.no_telepon}
                      onChange={handleChange}
                      placeholder="Contoh: 0822..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Baris Input 4 (Unit Kerja Manual & Sandi) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Unit Kerja / Penugasan</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      name="unit_kerja"
                      required
                      value={formData.unit_kerja}
                      onChange={handleChange}
                      placeholder="Ketik manual unit kerja..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Kata Sandi Akun</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Minimal 6 karakter"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Konfirmasi Kata Sandi</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Ulangi kata sandi"
                      className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3 rounded-2xl transition shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2 active:scale-95 cursor-pointer min-h-[44px] disabled:opacity-50 mt-4"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Kirim Pengajuan Pendaftaran Akun</span>
                  </>
                )}
              </button>

            </form>

            <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-1.5">
              <p className="text-[11px] text-slate-500">Sudah memiliki akun yang terverifikasi?</p>
              <Link
                href="/login"
                className="inline-flex items-center space-x-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold transition cursor-pointer hover:underline"
              >
                <span>Masuk ke Halaman Login</span>
              </Link>
            </div>

          </div>

          <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-3.5 flex items-center justify-between text-xs text-slate-600 backdrop-blur-md shadow-sm">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="text-[11px] font-medium">Sistem Keamanan &amp; Penyimpanan Terintegrasi</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">BLUD</span>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}