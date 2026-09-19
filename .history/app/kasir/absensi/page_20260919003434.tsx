'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserCheck, 
  Search, 
  CheckCircle2, 
  X, 
  Lock, 
  Clock,
  FileText,
  Activity,
  ArrowLeft,
  Camera,
  MapPin,
  RefreshCw,
  ShieldAlert,
  CalendarDays,
  AlertCircle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface AbsensiRecord {
  id: number;
  uuid: string;
  user_id?: string;
  email_user?: string;
  nama_pegawai: string;
  jabatan: string;
  unit_kerja?: string;
  shift: string;
  status_kehadiran: string;
  waktu_masuk?: string;
  keterangan: string;
  status_verifikasi: string;
  catatan_penolakan?: string;
  foto_selfie?: string;
  latitude?: number;
  longitude?: number;
  jarak_meter?: number;
  status_radius?: string;
  is_locked: boolean;
  created_at: string;
}

interface AbsensiSetting {
  id: number;
  hari: string;
  nama_shift: string;
  jam_masuk: string;
  jam_pulang: string;
  batas_awal_masuk: string;
  batas_akhir_masuk: string;
  radius_meter: number;
  is_active: boolean;
}

// Koordinat Resmi RSUD Bukit Kerman, Kerinci, Jambi
const HOSPITAL_LAT = -2.155500; 
const HOSPITAL_LNG = 101.455000; 

export default function KasirAbsensiPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  // Sesi User yang Sedang Login
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; nama_lengkap: string; jabatan?: string; role?: string } | null>(null);

  // Pengaturan dari Tabel absensi_settings
  const [activeSetting, setActiveSetting] = useState<AbsensiSetting | null>(null);

  // Form State & Smart Attendance Features
  const [showFormModal, setShowFormModal] = useState<boolean>(false);
  const [namaPegawai, setNamaPegawai] = useState<string>('');
  const [jabatan, setJabatan] = useState<string>('Petugas Kasir & Loket');
  const [unitKerja, setUnitKerja] = useState<string>('RSUD Bukit Kerman');
  const [shift, setShift] = useState<string>('Pagi');
  const [statusKehadiran, setStatusKehadiran] = useState<string>('Hadir');
  const [keterangan, setKeterangan] = useState<string>('');
  
  // GPS & Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>('Menunggu deteksi GPS...');

  // State untuk Detail Penolakan Admin
  const [selectedRejectionRecord, setSelectedRejectionRecord] = useState<AbsensiRecord | null>(null);

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLogs(prev => [`[${timeStr}] ${message}`, ...prev.slice(0, 4)]);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Ambil Sesi User dari LocalStorage / Supabase Auth Secara Presisi
  useEffect(() => {
    const loadSessionAndSettings = async () => {
      let userData = null;
      
      const keys = ['user_session', 'user', 'sb-access-token', 'supabase.auth.token'];
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (parsed.user) {
              userData = { 
                id: parsed.user.id, 
                email: parsed.user.email, 
                nama_lengkap: parsed.user.user_metadata?.nama_lengkap || parsed.user.email.split('@')[0],
                role: parsed.user.user_metadata?.role || 'kasir'
              };
              break;
            } else if (parsed.id || parsed.email) {
              userData = parsed;
              break;
            }
          } catch (e) {
            // Abaikan error parsing non-JSON
          }
        }
      }

      if (!userData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase.from('users').select('*').eq('email', user.email).single();
          userData = {
            id: profile?.id || user.id,
            email: user.email,
            nama_lengkap: profile?.nama_lengkap || user.email?.split('@')[0] || 'kasir',
            jabatan: profile?.unit_kerja || 'Petugas Kasir & Loket',
            role: profile?.role || 'kasir'
          };
        }
      }

      if (userData) {
        setCurrentUser(userData);
        setNamaPegawai((userData.nama_lengkap || '').toUpperCase());
        if (userData.jabatan) setJabatan(userData.jabatan);
        fetchRecords(userData.id);
      } else {
        setIsLoading(false);
      }

      // 2. Ambil Pengaturan Jam & Radius dari tabel absensi_settings berdasarkan hari ini
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDayName = days[new Date().getDay()];

      const { data: settingData } = await supabase
        .from('absensi_settings')
        .select('*')
        .eq('hari', currentDayName)
        .eq('is_active', true)
        .limit(1);

      if (settingData && settingData.length > 0) {
        setActiveSetting(settingData[0]);
        setShift(settingData[0].nama_shift || 'Pagi');
      }
    };

    loadSessionAndSettings();
  }, []);

  // Fetch Rekap Absensi KHUSUS MILIK AKUN YANG LOGIN
  const fetchRecords = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('absensi_records')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRecords(data as AbsensiRecord[]);
      }
    } catch (err) {
      console.error('Gagal memuat rekap absensi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.id) {
      const channel = supabase
        .channel(`kasir_absensi_${currentUser.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_records', filter: `user_id=eq.${currentUser.id}` }, () => {
          fetchRecords(currentUser.id);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser]);

  // Hitung Jarak Haversine (Meter)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const checkGPSLocation = () => {
    setIsLocating(true);
    setLocationStatus('Mendeteksi koordinat GPS perangkat...');
    const maxRadius = activeSetting?.radius_meter || 150;

    if (!navigator.geolocation) {
      setLocationStatus('Geolokasi tidak didukung oleh browser Anda.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation({ lat, lng });

        const dist = calculateDistance(lat, lng, HOSPITAL_LAT, HOSPITAL_LNG);
        const roundedDist = Math.round(dist);
        setDistance(roundedDist);
        setIsLocating(false);

        if (roundedDist <= maxRadius) {
          setLocationStatus(`Lokasi Valid! Berada di dalam area RSUD (${roundedDist} meter dari pusat).`);
        } else {
          setLocationStatus(`Di Luar Radius! Anda berada ${roundedDist} meter (Maksimal ${maxRadius}m).`);
        }
      },
      (error) => {
        setIsLocating(false);
        setLocationStatus('Gagal mendeteksi GPS. Pastikan izin lokasi perangkat diaktifkan.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const startCamera = async () => {
    setCapturedImage(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      showToast('Tidak dapat mengakses kamera depan.', 'error');
      setCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);

        const stream = video.srcObject as MediaStream;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        setCameraActive(false);
        showToast('Foto live selfie berhasil diambil!', 'success');
      }
    }
  };

  const handleOpenForm = () => {
    setShowFormModal(true);
    setCapturedImage(null);
    setDistance(null);
    checkGPSLocation();
    startCamera();
    addLog('Membuka form smart absensi akun Anda.');
  };

  // Simpan Absensi Sesuai Struktur Tabel SQL Supabase (Read-Only setelah dikirim untuk Kasir)
  const handleSaveAbsensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Sesi akun tidak valid. Harap login ulang.', 'error');
      return;
    }

    const maxRadius = activeSetting?.radius_meter || 150;

    if (!namaPegawai) {
      showToast('Harap masukkan nama pegawai.', 'error');
      return;
    }
    if (!capturedImage) {
      showToast('Wajib melampirkan Live Selfie!', 'error');
      return;
    }
    if (distance === null || distance > maxRadius) {
      showToast(`Absensi ditolak! Anda berada di luar radius rumah sakit (${distance}m).`, 'error');
      return;
    }

    try {
      const payload = {
        user_id: currentUser.id,
        email_user: currentUser.email,
        nama_pegawai: namaPegawai.toUpperCase(),
        jabatan: jabatan,
        unit_kerja: unitKerja,
        shift: shift,
        status_kehadiran: statusKehadiran,
        waktu_masuk: new Date().toISOString(),
        keterangan: keterangan || 'Hadir bertugas sesuai jadwal shift.',
        status_verifikasi: 'Menunggu Verifikasi',
        is_locked: true, // Terkunci otomatis agar kasir tidak mengubah data setelah kirim
        foto_selfie: capturedImage,
        latitude: userLocation?.lat,
        longitude: userLocation?.lng,
        jarak_meter: distance,
        status_radius: 'Valid Dalam Radius'
      };

      const { error } = await supabase.from('absensi_records').insert([payload]);
      if (error) throw error;

      showToast('Absensi berhasil dikirim dan menunggu verifikasi Admin!', 'success');
      addLog(`Mengirim absensi untuk ${namaPegawai} (${shift})`);
      setShowFormModal(false);
      setKeterangan('');
      setCapturedImage(null);
      fetchRecords(currentUser.id);
    } catch (err: any) {
      showToast(`Gagal mengirim absensi: ${err.message}`, 'error');
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.nama_pegawai || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true : r.status_verifikasi.toLowerCase() === statusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.created_at?.slice(0, 10) === todayStr);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {toast && (
        <div className="fixed bottom-6 right-6 z-70 bg-slate-900/95 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Smart Absensi Pegawai" />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6">
        
        {/* BANNER INFORMASI JADWAL & PENGATURAN ADMIN */}
        {activeSetting && (
          <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-200/80 rounded-3xl p-5 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sky-900 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-sky-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                <CalendarDays className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wide text-slate-900">Jadwal Shift Aktif Hari Ini ({activeSetting.hari})</h4>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Tersinkronisasi Admin</span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">Jam Masuk: <strong className="text-slate-900">{activeSetting.jam_masuk}</strong> | Jam Pulang: <strong className="text-slate-900">{activeSetting.jam_pulang}</strong> | Radius Maksimal: <strong className="text-sky-700">{activeSetting.radius_meter} Meter</strong></p>
              </div>
            </div>
            <span className="bg-sky-600 text-white font-black text-xs px-4 py-2 rounded-2xl uppercase shadow-xs">{activeSetting.nama_shift}</span>
          </div>
        )}

        {/* HEADER & TOMBOL ABSEN */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => router.back()}
              className="w-11 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-200 shadow-sm"
              title="Kembali"
            >
              <ArrowLeft className="w-5 h-5 text-slate-700" />
            </button>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-6 h-6 text-sky-600" /> Riwayat Absensi Akun Anda
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Akun login aktif: <strong className="text-sky-700 font-mono">{currentUser?.email || 'Memuat akun...'}</strong> (Data privat, read-only setelah dikirim)</p>
            </div>
          </div>
          <button
            onClick={handleOpenForm}
            className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-5 py-3.5 rounded-2xl transition flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <Camera className="w-4 h-4" /> Absen Sekarang (GPS + Selfie)
          </button>
        </div>

        {/* KARTU STATISTIK */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Absensi Anda Hari Ini</span>
              <h3 className="text-lg font-black text-slate-900">{todayRecords.length} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Menunggu Verifikasi Admin</span>
              <h3 className="text-lg font-black text-amber-600">{totalPending} Berkas</h3>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TABEL DATA PRIBADI */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari riwayat..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-9 pr-4 py-2 text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold flex-wrap">
              <button onClick={() => setStatusFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua ({records.length})</button>
              <button onClick={() => setStatusFilter('Menunggu Verifikasi')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Menunggu Verifikasi' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500'}`}>Pending</button>
              <button onClick={() => setStatusFilter('Disetujui')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${statusFilter === 'Disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>Disetujui</button>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px]">
                  <th className="p-3.5">Selfie &amp; Waktu</th>
                  <th className="p-3.5">Shift &amp; Jabatan</th>
                  <th className="p-3.5 text-center">Kehadiran</th>
                  <th className="p-3.5 text-center">Radius GPS</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-8 text-slate-400">Memuat rekap absensi...</td></tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-12 text-slate-400">Belum ada riwayat absensi untuk akun ini.</td></tr>
                ) : (
                  paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3.5 flex items-center gap-3">
                        {r.foto_selfie ? (
                          <img src={r.foto_selfie} alt="Selfie" className="w-10 h-10 rounded-xl object-cover border border-slate-300 shadow-sm" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400 text-[10px]">No Photo</div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block">{r.nama_pegawai}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(r.created_at).toLocaleString('id-ID')} WIB</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-bold text-sky-700 block">{r.shift}</span>
                        <span className="text-[10px] text-slate-500">{r.jabatan}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{r.status_kehadiran}</span>
                      </td>
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {r.jarak_meter !== undefined ? `${r.jarak_meter} m` : 'N/A'}
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                            r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 
                            r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status_verifikasi}
                          </span>
                          {r.catatan_penolakan && (
                            <button 
                              onClick={() => setSelectedRejectionRecord(r)}
                              className="text-rose-600 hover:text-rose-800 cursor-pointer"
                              title="Lihat Catatan Admin"
                            >
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* MODAL FORM SMART ABSENSI (GPS + LIVE SELFIE) */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-600" /> Form Smart Absensi Akun Anda
              </h3>
              <button onClick={() => setShowFormModal(false)} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <form onSubmit={handleSaveAbsensi} className="space-y-4 text-xs">
              {/* LIVE WEBCAM / SELFIE CONTAINER */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block">Live Selfie Verifikasi Wajah *</label>
                <div className="relative w-full h-56 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-300 shadow-inner">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  ) : cameraActive ? (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  ) : (
                    <div className="text-slate-400 text-center p-4">
                      <Camera className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <span>Kamera belum aktif</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-2 pt-1">
                  {cameraActive && !capturedImage && (
                    <button type="button" onClick={capturePhoto} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                  )}
                  {capturedImage && (
                    <button type="button" onClick={startCamera} className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Ambil Ulang Foto
                    </button>
                  )}
                </div>
              </div>

              {/* GPS RADIUS STATUS CONTAINER */}
              <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
                distance !== null && distance <= (activeSetting?.radius_meter || 150) ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center gap-2.5">
                  <MapPin className={`w-5 h-5 shrink-0 ${distance !== null && distance <= (activeSetting?.radius_meter || 150) ? 'text-emerald-600' : 'text-amber-600'}`} />
                  <div>
                    <span className="font-bold block">Status Geofencing GPS (Maks: {activeSetting?.radius_meter || 150}m):</span>
                    <p className="text-[11px] mt-0.5">{locationStatus}</p>
                  </div>
                </div>
                <button type="button" onClick={checkGPSLocation} className="p-2 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-sm cursor-pointer" title="Perbarui Lokasi GPS">
                  <RefreshCw className={`w-4 h-4 text-slate-700 ${isLocating ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pegawai *</label>
                <input
                  type="text"
                  placeholder="Nama lengkap..."
                  value={namaPegawai}
                  onChange={(e) => setNamaPegawai(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift Petugas</label>
                  <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Kehadiran</label>
                  <select value={statusKehadiran} onChange={(e) => setStatusKehadiran(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold">
                    <option value="Hadir">Hadir</option>
                    <option value="Izin">Izin</option>
                    <option value="Sakit">Sakit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Keterangan / Catatan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan..."
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 uppercase"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => { setShowFormModal(false); if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); } }} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={!capturedImage || distance === null || distance > (activeSetting?.radius_meter || 150)}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow cursor-pointer transition"
                >
                  Kirim Absensi Resmi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CATATAN PENOLAKAN ADMIN */}
      {selectedRejectionRecord && (
        <div className="fixed inset-0 z-70 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-sm font-black uppercase text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Catatan Penolakan Admin
            </h3>
            <p className="text-xs text-slate-600 bg-rose-50 border border-rose-200 p-3 rounded-2xl">
              {selectedRejectionRecord.catatan_penolakan || 'Tidak ada catatan khusus.'}
            </p>
            <div className="flex justify-end">
              <button 
                onClick={() => setSelectedRejectionRecord(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}