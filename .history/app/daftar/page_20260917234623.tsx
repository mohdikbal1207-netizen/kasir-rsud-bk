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
  Image as ImageIcon,
  Check,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Info
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

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStepText, setLoadingStepText] = useState('Kirim Pengajuan Pendaftaran Akun');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Normalisasi khusus NIK (hanya angka, maksimal 16 digit)
    if (e.target.name === 'nik') {
      value = value.replace(/\D/g, '').slice(0, 16);
    }
    
    // Normalisasi khusus No Telepon (hanya angka)
    if (e.target.name === 'no_telepon') {
      value = value.replace(/\D/g, '');
    }

    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('Ukuran berkas foto terlalu besar. Maksimal 2MB.');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setErrorMessage(null);
    }
  };

  // Kalkulator Progres Pengisian Formulir (UX Enhancement)
  const calculateProgress = () => {
    const fields = Object.values(formData);
    const filledFields = fields.filter((val) => val.trim() !== '').length;
    const baseProgress = Math.round((filledFields / fields.length) * 100);
    return agreeTerms ? Math.min(baseProgress + 5, 100) : baseProgress;
  };

  // Kalkulator Kekuatan Kata Sandi
  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { label: '', color: 'bg-slate-200', width: 'w-0' };
    if (pwd.length < 6) return { label: 'Terlalu Pendek', color: 'bg-rose-500', width: 'w-1/4' };
    if (pwd.length < 8) return { label: 'Cukup', color: 'bg-amber-500', width: 'w-2/4' };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) {
      return { label: 'Sangat Kuat & Aman', color: 'bg-emerald-500', width: 'w-full' };
    }
    return { label: 'Kuat', color: 'bg-teal-500', width: 'w-3/4' };
  };

  // Validator Format Email Sederhana
  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Helper Sanitasi Nomor Telepon ke Format Internasional (62...)
  const formatPhoneNumber = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '62' + cleaned.slice(1);
    }
    return cleaned;
  };

  // Fungsi Memanggil API Internal Fonnte WhatsApp Gateway
  const sendWhatsAppNotification = async (targetPhone: string, message: string) => {
    try {
      await fetch('/api/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target: targetPhone,
          message: message,
        }),
      });
    } catch (err) {
      console.error('Gagal memicu pengiriman WhatsApp:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Sanitasi data masukan (Trim whitespace)
    const sanitizedData = {
      nama_lengkap: formData.nama_lengkap.trim(),
      nik: formData.nik.trim(),
      nip: formData.nip.trim(),
      tempat_lahir: formData.tempat_lahir.trim(),
      tanggal_lahir: formData.tanggal_lahir,
      unit_kerja: formData.unit_kerja.trim(),
      no_telepon: formData.no_telepon.trim(),
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
    };

    if (sanitizedData.nik.length < 16) {
      setErrorMessage('Nomor Induk Kependudukan (NIK) wajib 16 digit sesuai KTP.');
      return;
    }

    if (sanitizedData.password !== formData.confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak sesuai dengan kata sandi yang dimasukkan.');
      return;
    }

    if (sanitizedData.password.length < 6) {
      setErrorMessage('Kata sandi harus terdiri dari minimal 6 karakter.');
      return;
    }

    if (!agreeTerms) {
      setErrorMessage('Anda harus menyetujui ketentuan verifikasi data pegawai terlebih dahulu.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Cek duplikasi NIK di tabel profiles
      setLoadingStepText('Memeriksa duplikasi data NIK...');
      const { data: existingNik } = await supabase
        .from('profiles')
        .select('nik')
        .eq('nik', sanitizedData.nik)
        .maybeSingle();

      if (existingNik) {
        throw new Error('Nomor NIK ini sudah terdaftar dalam sistem SIMRS. Silakan gunakan akun yang sudah ada.');
      }

      // 2. Cek duplikasi NIP di tabel profiles (jika NIP diisi)
      if (sanitizedData.nip) {
        setLoadingStepText('Memeriksa duplikasi data NIP...');
        const { data: existingNip } = await supabase
          .from('profiles')
          .select('nip')
          .eq('nip', sanitizedData.nip)
          .maybeSingle();

        if (existingNip) {
          throw new Error('Nomor NIP/ID Pegawai ini sudah terdaftar dalam sistem SIMRS.');
        }
      }

      let publicPhotoUrl = '';

      // 3. Unggah Foto ke Supabase Storage jika ada
      if (selectedFile) {
        setLoadingStepText('Mengunggah berkas pas foto...');
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

      // 4. Daftarkan akun ke Supabase Auth terlebih dahulu agar mendapatkan UUID Auth yang valid
      setLoadingStepText('Mendaftarkan kredensial autentikasi...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: sanitizedData.email,
        password: sanitizedData.password,
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || 'Gagal mendaftarkan kredensial autentikasi.');
      }

      const userId = authData.user.id;

      // 5. Simpan data kredensial / role ke tabel `users` menggunakan .upsert() agar aman dari duplikasi trigger
      setLoadingStepText('Menyimpan data hak akses sistem...');
      const { error: userError } = await supabase
        .from('users')
        .upsert([
          {
            id: userId,
            email: sanitizedData.email,
            role: sanitizedData.unit_kerja,
            is_active: false, // Menunggu verifikasi admin
          }
        ], { onConflict: 'id' });

      if (userError) throw userError;

      // 6. Simpan profil lengkap ke tabel `profiles` menggunakan .upsert()
      setLoadingStepText('Menyimpan profil pegawai...');
      const formattedPhone = formatPhoneNumber(sanitizedData.no_telepon);
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: userId,
            nama_lengkap: sanitizedData.nama_lengkap,
            nik: sanitizedData.nik,
            nip: sanitizedData.nip,
            tempat_lahir: sanitizedData.tempat_lahir,
            tanggal_lahir: sanitizedData.tanggal_lahir || null,
            unit_kerja: sanitizedData.unit_kerja,
            no_telepon: formattedPhone,
            foto_uri: publicPhotoUrl || null,
          }
        ], { onConflict: 'id' });

      if (profileError) throw profileError;

      // 7. Kirim Notifikasi WhatsApp Otomatis ke Admin / IT Coordinator (Mohd. Ikbal - 6282281155614)
      setLoadingStepText('Mengirim notifikasi WhatsApp ke Admin IT...');
      const adminPhone = '6282281155614';
      const adminMessage = 
        `🚨 *PENGAJUAN AKUN STAF BARU SIMRS*\n\n` +
        `Halo Admin IT / Manajemen RSUD Bukit Kerman,\n` +
        `Ada pendaftaran akun staf baru yang menunggu verifikasi:\n\n` +
        `👤 *Nama:* ${sanitizedData.nama_lengkap}\n` +
        `🏥 *Unit Kerja:* ${sanitizedData.unit_kerja}\n` +
        `🆔 *NIP/ID:* ${sanitizedData.nip}\n` +
        `📧 *Email:* ${sanitizedData.email}\n` +
        `📱 *No HP:* ${formattedPhone}\n\n` +
        `Silakan login ke Portal Admin SIMRS untuk mengaktifkan akun ini.`;

      await sendWhatsAppNotification(adminPhone, adminMessage);

      setSuccessMessage('Registrasi berhasil! Data profil Anda telah disimpan dan notifikasi telah dikirim ke Administrator.');
      
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 2500);

    } catch (err: any) {
      console.error('Detail Error Pendaftaran:', err);
      // Menangkap pesan error secara spesifik agar terlihat jelas di antarmuka
      const detailedMessage = err?.message || err?.error_description || err?.details || JSON.stringify(err);
      setErrorMessage(`Gagal: ${detailedMessage}`);
    } finally {
      setIsLoading(false);
      setLoadingStepText('Kirim Pengajuan Pendaftaran Akun');
    }
  };

  const progress = calculateProgress();
  const strength = getPasswordStrength();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-emerald-200/50 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/3 right-10 w-[450px] h-[450px] bg-teal-200/40 rounded-full blur-[100px] pointer-events-none -z-10"></div>

      <PublicHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Sistem Informasi Kasir &amp; Pembayaran Tarif BLUD"
        badgeText="Registrasi Akun Staf"
        showBackButton={true}
        backUrl="/login"
      />

      <main className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-10 flex-1 flex items-center justify-center relative z-10">
        <div className="w-full space-y-4">
          
          <div className="bg-white/95 border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative overflow-hidden">
            
            {/* Progress Bar Kelengkapan Formulir */}
            <div className="mb-6 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600">
                  <Sparkles className="w-3.5 h-3.5" /> Kelengkapan Formulir Pendaftaran
                </span>
                <span className="font-mono">{progress}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="text-center space-y-2 mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 shadow-sm mb-1">
                <UserPlus className="w-7 h-7" />
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Formulir Pendaftaran &amp; Profil Pegawai
              </h1>
              <p className="text-xs text-slate-500">
                Lengkapi data diri secara valid. Notifikasi otomatis akan dikirimkan ke WhatsApp IT Coordinator untuk verifikasi.
              </p>
            </div>

            {/* Banner Informasi Prosedur Pendaftaran */}
            <div className="mb-6 p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-800 flex items-start space-x-2.5 shadow-sm">
              <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Catatan Penting Verifikasi Akun:</span>
                Setiap pendaftaran baru memerlukan konfirmasi dari Administrator IT (Mohd. Ikbal). Setelah pendaftaran berhasil dikirim, Anda dapat berkoordinasi langsung dengan bagian IT untuk pengaktifan hak akses portal kasir/BLUD.
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start space-x-2.5 shadow-sm break-all" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start space-x-2.5 shadow-sm" role="status">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* SEKSI 1: Pas Foto & Akun Dasar */}
              <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5 rounded-2xl">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Pas Foto &amp; Akun Kredensial
                </h3>

                {/* Seksion Unggah Foto */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white border border-slate-200 p-3.5 rounded-2xl shadow-sm">
                  <div className={`w-20 h-20 rounded-2xl bg-slate-100 border ${selectedFile ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200'} overflow-hidden flex items-center justify-center flex-shrink-0 relative shadow-inner transition-all`}>
                    {previewUrl ? (
                      <img src={previewUrl} alt="Pratinjau Foto" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-400" />
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1 text-center sm:text-left">
                    <label className="text-xs font-bold text-slate-700 block">Unggah Pas Foto Resmi Pegawai</label>
                    <p className="text-[11px] text-slate-500">Format didukung: JPG, PNG (Maksimal 2MB).</p>
                    
                    <label className="inline-flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs px-3.5 py-2 rounded-xl font-bold cursor-pointer transition shadow-sm">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Pilih Berkas Foto</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                    {selectedFile && <span className="text-[10px] text-emerald-600 font-bold block mt-1">Berkas terpilih: {selectedFile.name}</span>}
                  </div>
                </div>

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
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Alamat Email Kedinasan / Aktif</label>
                      {formData.email && (
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${isEmailValid(formData.email) ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {isEmailValid(formData.email) ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {isEmailValid(formData.email) ? 'Format Valid' : 'Format Belum Valid'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="nama.pegawai@rsudbukitkerman.id"
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEKSI 2: Identitas Resmi & Kontak */}
              <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5 rounded-2xl">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Identitas Resmi &amp; Kontak Pegawai
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nomor Induk Kependudukan (NIK)</label>
                      <span className={`text-[10px] font-mono font-bold ${formData.nik.length === 16 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {formData.nik.length}/16 digit
                      </span>
                    </div>
                    <div className="relative">
                      <FileBadge className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        name="nik"
                        required
                        maxLength={16}
                        value={formData.nik}
                        onChange={handleChange}
                        placeholder="Masukkan 16 digit NIK KTP..."
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
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
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>
                </div>

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
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
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
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Nomor WhatsApp</label>
                      {formData.no_telepon && (
                        <span className="text-[10px] font-mono text-emerald-600 font-bold">
                          Format: +{formatPhoneNumber(formData.no_telepon)}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        name="no_telepon"
                        required
                        value={formData.no_telepon}
                        onChange={handleChange}
                        placeholder="Contoh: 0822..."
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SEKSI 3: Penugasan & Keamanan Sandi */}
              <div className="space-y-4 bg-slate-50/70 border border-slate-200/80 p-4 sm:p-5 rounded-2xl">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                  Unit Kerja &amp; Keamanan Akun
                </h3>

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
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Kata Sandi Akun</label>
                      {formData.password && (
                        <span className="text-[10px] font-bold text-slate-500">{strength.label}</span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Minimal 6 karakter"
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {/* Indikator Bar Kekuatan Sandi */}
                    {formData.password && (
                      <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1">
                        <div className={`${strength.color} h-full transition-all duration-300 ${strength.width}`}></div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Konfirmasi Sandi</label>
                      {formData.confirmPassword && (
                        <span className={`text-[10px] font-bold flex items-center gap-0.5 ${formData.password === formData.confirmPassword ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {formData.password === formData.confirmPassword ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                          {formData.password === formData.confirmPassword ? 'Sesuai' : 'Tidak Sesuai'}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Ulangi kata sandi"
                        className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-10 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Kotak Persetujuan Syarat & Ketentuan */}
              <div className="flex items-start space-x-2.5 pt-2 bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl">
                <input
                  type="checkbox"
                  id="agree_terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 mt-0.5 cursor-pointer"
                />
                <label htmlFor="agree_terms" className="text-[11px] text-slate-700 cursor-pointer select-none leading-relaxed">
                  Saya menyatakan dengan sesungguhnya bahwa seluruh data diri, NIP/NIK, dan dokumen yang diunggah adalah benar milik pribadi sesuai identitas resmi pegawai RSUD Bukit Kerman untuk keperluan verifikasi sistem SIMRS &amp; BLUD.
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-3.5 rounded-2xl transition-all duration-300 shadow-lg shadow-emerald-600/25 flex items-center justify-center space-x-2.5 active:scale-95 cursor-pointer min-h-[46px] disabled:opacity-50 mt-4 relative overflow-hidden"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{loadingStepText}</span>
                  </>
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
              <span className="text-[11px] font-medium">Terintegrasi Fonnte WhatsApp Gateway &amp; Supabase Auth</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 font-semibold">BLUD v2.6</span>
          </div>

        </div>
      </main>

      <PublicFooter />
    </div>
  );
}