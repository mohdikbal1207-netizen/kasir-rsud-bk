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
  ShieldCheck,
  CalendarDays,
  AlertCircle,
  Sparkles,
  Building2,
  CheckCircle,
  Compass,
  Fingerprint,
  Info,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  Timer,
  Radio,
  Printer,
  Terminal,
  PieChart,
  Wifi,
  WifiOff,
  Copy,
  Calendar,
  Zap,
  Check,
  AlertTriangle,
  Loader2
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
  is_active: boolean;
}

interface OfficeLocation {
  id: number;
  nama_lokasi: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
}

export default function KasirAbsensiPage() {
  const router = useRouter();
  const [records, setRecords] = useState<AbsensiRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [dateFilter, setDateFilter] = useState<string>('semua');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [activityLogs, setActivityLogs] = useState<string[]>([]);

  // Sesi User yang Sedang Login
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; nama_lengkap: string; jabatan?: string; role?: string } | null>(null);

  // Pengaturan dari Tabel absensi_settings & absensi_office_location
  const [activeSetting, setActiveSetting] = useState<AbsensiSetting | null>(null);
  const [officeLocation, setOfficeLocation] = useState<OfficeLocation>({
    id: 1,
    nama_lokasi: 'RSUD Bukit Kerman, Kerinci',
    latitude: -2.18947986,
    longitude: 101.55793214,
    radius_meter: 150
  });

  // Realtime Clock Widget State & Shift Status
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isShiftOpen, setIsShiftOpen] = useState<boolean>(true);

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
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string>('Menunggu deteksi GPS...');

  // State untuk Detail Penolakan Admin & Detail Modal Riwayat
  const [selectedRejectionRecord, setSelectedRejectionRecord] = useState<AbsensiRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<AbsensiRecord | null>(null);

  const addLog = (message: string) => {
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setActivityLogs(prev => [`[${timeStr}] ${message}`, ...prev.slice(0, 4)]);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Monitor Network Status
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); addLog('Koneksi internet pulih (Online).'); };
    const handleOffline = () => { setIsOnline(false); addLog('Koneksi internet terputus (Offline).'); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Clock & Shift Status Effect
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');

      if (activeSetting && activeSetting.jam_masuk && activeSetting.jam_pulang) {
        const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
        const [inH, inM] = activeSetting.jam_masuk.split(':').map(Number);
        const [outH, outM] = activeSetting.jam_pulang.split(':').map(Number);
        const shiftStartMin = inH * 60 + inM - 90; // Buka 90 menit sebelum jam masuk
        const shiftEndMin = outH * 60 + outM + 60;   // Ditutup 60 menit setelah jam pulang
        setIsShiftOpen(currentTotalMinutes >= shiftStartMin && currentTotalMinutes <= shiftEndMin);
      }
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, [activeSetting]);

  // Fetch Office Location from Database
  const fetchOfficeLocation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('absensi_office_location')
        .select('*')
        .eq('id', 1)
        .single();

      if (!error && data) {
        setOfficeLocation(data as OfficeLocation);
      }
    } catch (err) {
      console.error('Gagal memuat lokasi kantor:', err);
    }
  }, []);

  // 1. Ambil Sesi User & Pengaturan Shift & Lokasi Kantor
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
        addLog(`Sesi aktif terdeteksi untuk: ${userData.email}`);
      } else {
        setIsLoading(false);
      }

      // Ambil Lokasi Kantor terbaru dari tabel absensi_office_location
      fetchOfficeLocation();

      // Ambil Pengaturan Shift berdasarkan hari ini
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const currentDayName = days[new Date().getDay()];

      const { data: settingData } = await supabase
        .from('absensi_settings')
        .select('*')
        .eq('is_active', true);

      if (settingData && settingData.length > 0) {
        const matched = settingData.find(s => s.hari.toLowerCase().includes(currentDayName.toLowerCase()) || s.hari === 'Setiap Hari') || settingData[0];
        setActiveSetting(matched);
        setShift(matched.nama_shift || 'Pagi');
      }
    };

    loadSessionAndSettings();
  }, [fetchOfficeLocation]);

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
        addLog(`Berhasil memuat ${data.length} riwayat absensi.`);
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'absensi_office_location' }, () => {
          fetchOfficeLocation();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentUser, fetchOfficeLocation]);

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

  // PERBAIKAN 1: PENANGANAN GEOLOCATION DENGAN TIMEOUT & AKURASI KOMPUTER/LAPTOP
  const checkGPSLocation = () => {
    setIsLocating(true);
    setLocationStatus('Mendeteksi koordinat GPS perangkat...');
    const maxRadius = officeLocation.radius_meter || 150;

    if (!navigator.geolocation) {
      setLocationStatus('Geolokasi tidak didukung oleh browser Anda.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const acc = Math.round(position.coords.accuracy);
        setUserLocation({ lat, lng });
        setGpsAccuracy(acc);

        const dist = calculateDistance(lat, lng, officeLocation.latitude, officeLocation.longitude);
        const roundedDist = Math.round(dist);
        setDistance(roundedDist);
        setIsLocating(false);

        if (roundedDist <= maxRadius) {
          setLocationStatus(`Lokasi Valid! Berada di dalam area RSUD (${roundedDist}m dari pusat, Akurasi: ±${acc}m).`);
          addLog(`GPS Valid: ${roundedDist}m dari ${officeLocation.nama_lokasi}.`);
        } else {
          setLocationStatus(`Di Luar Radius! Anda berada ${roundedDist} meter (Maksimal ${maxRadius}m).`);
          addLog(`GPS Di luar radius: ${roundedDist}m.`);
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = 'Gagal mendeteksi GPS. Pastikan izin lokasi perangkat diaktifkan.';
        if (error.code === error.PERMISSION_DENIED) errorMsg = 'Izin lokasi ditolak browser. Izinkan akses GPS pada alamat URL ini.';
        else if (error.code === error.TIMEOUT) errorMsg = 'Sinyal GPS lemah / Waktu deteksi habis. Coba klik tombol segarkan.';
        
        setLocationStatus(errorMsg);
        addLog(`Gagal mendeteksi GPS: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // PERBAIKAN 2: MEMATIKAN STREAM KAMERA SECARA BERSIH
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    stopCameraStream();
    setCapturedImage(null);
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      addLog('Kamera depan berhasil diaktifkan.');
    } catch (err) {
      showToast('Tidak dapat mengakses kamera depan. Pastikan izin kamera aktif.', 'error');
      setCameraActive(false);
      addLog('Gagal mengakses kamera.');
    }
  };

  // PERBAIKAN 3: MEMASIKAN FOTO HASIL SNAPSHOT SESUAI DENGAN CERMIN LIVE PREVIEW
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);

        stopCameraStream();
        showToast('Foto live selfie berhasil diambil!', 'success');
        addLog('Live selfie berhasil ditangkap.');
      }
    }
  };

  const handleOpenForm = () => {
    setShowFormModal(true);
    setCapturedImage(null);
    setDistance(null);
    setGpsAccuracy(null);
    checkGPSLocation();
    setTimeout(() => {
      startCamera();
    }, 300);
    addLog('Membuka form smart absensi akun Anda.');
  };

  const handleCloseForm = () => {
    stopCameraStream();
    setShowFormModal(false);
  };

  // Simpan Absensi Sesuai Struktur Tabel SQL Supabase
  const handleSaveAbsensi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Sesi akun tidak valid. Harap login ulang.', 'error');
      return;
    }

    const maxRadius = officeLocation.radius_meter || 150;

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
        is_locked: true,
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
      handleCloseForm();
      setKeterangan('');
      setCapturedImage(null);
      fetchRecords(currentUser.id);
    } catch (err: any) {
      showToast(`Gagal mengirim absensi: ${err.message}`, 'error');
    }
  };

  // Export CSV Laporan Pribadi
  const handleExportCSV = () => {
    if (records.length === 0) {
      showToast('Tidak ada data untuk diexport.', 'info');
      return;
    }
    const headers = ['ID', 'Nama Pegawai', 'Shift', 'Jabatan', 'Status Kehadiran', 'Status Verifikasi', 'Jarak (m)', 'Waktu'];
    const rows = records.map(r => [
      r.id,
      `"${r.nama_pegawai}"`,
      `"${r.shift}"`,
      `"${r.jabatan}"`,
      `"${r.status_kehadiran}"`,
      `"${r.status_verifikasi}"`,
      r.jarak_meter,
      `"${r.created_at}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rekap_absensi_${currentUser?.nama_lengkap || 'kasir'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Rekap absensi berhasil diexport ke CSV!', 'success');
    addLog('Mengexport rekap absensi ke format CSV.');
  };

  const copyCoordinates = () => {
    if (userLocation) {
      const text = `${userLocation.lat}, ${userLocation.lng}`;
      navigator.clipboard.writeText(text);
      showToast('Koordinat GPS berhasil disalin!', 'success');
      addLog('Menyalin koordinat GPS ke clipboard.');
    }
  };

  const filteredRecords = records.filter(r => {
    const matchSearch = (r.nama_pegawai || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (r.shift || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'semua' ? true : r.status_verifikasi.toLowerCase() === statusFilter.toLowerCase();
    
    let matchDate = true;
    const recordDate = new Date(r.created_at);
    const now = new Date();
    if (dateFilter === 'hari_ini') {
      matchDate = recordDate.toDateString() === now.toDateString();
    } else if (dateFilter === '7_hari') {
      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchDate = diffDays <= 7;
    } else if (dateFilter === '30_hari') {
      const diffTime = Math.abs(now.getTime() - recordDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchDate = diffDays <= 30;
    }

    return matchSearch && matchStatus && matchDate;
  });

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = filteredRecords.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter(r => r.created_at?.slice(0, 10) === todayStr);
  const totalPending = records.filter(r => r.status_verifikasi === 'Menunggu Verifikasi').length;
  const hasCheckedInToday = todayRecords.length > 0;

  // Hitung Statistik Kehadiran
  const totalHadir = records.filter(r => r.status_kehadiran === 'Hadir').length;
  const attendanceRate = records.length > 0 ? Math.round((totalHadir / records.length) * 100) : 0;

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
        
        {/* NETWORK & OFFLINE BANNER */}
        {!isOnline && (
          <div className="bg-rose-600 text-white px-4 py-3 rounded-2xl flex items-center justify-between shadow-md text-xs font-bold animate-pulse">
            <span className="flex items-center gap-2">
              <WifiOff className="w-4 h-4" /> Koneksi Internet Terputus! Mode Offline Aktif. Data akan disinkronkan saat terhubung kembali.
            </span>
            <span className="font-mono text-[10px] bg-black/20 px-2 py-0.5 rounded-lg">OFFLINE</span>
          </div>
        )}

        {/* EXECUTIVE DASHBOARD HERO BANNER WITH REAL-TIME CLOCK & SHIFT STATUS */}
        <div className="bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="space-y-3 relative z-10 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-sky-500/20 text-sky-300 border border-sky-500/30 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Portal Absensi Mandiri Terpadu
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 text-emerald-400 border border-white/10 px-3.5 py-1 rounded-full text-xs font-mono font-bold">
                <Clock className="w-3.5 h-3.5" /> {currentTimeStr || 'Memuat Waktu...'}
              </div>
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isShiftOpen ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'}`}>
                <Radio className="w-3 h-3 animate-pulse" /> {isShiftOpen ? 'Shift Dibuka' : 'Shift Ditutup'}
              </div>
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Selamat Datang, {currentUser?.nama_lengkap || 'Petugas Kasir'}</h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed">
                Sistem absensi biometrik wajah &amp; geofencing GPS terhubung langsung dengan pusat database {officeLocation.nama_lokasi}.
              </p>
            </div>
          </div>

          {activeSetting && (
            <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4.5 w-full lg:w-auto min-w-[280px] space-y-2 relative z-10 shadow-lg">
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className="text-slate-300 font-medium">Shift Aktif ({activeSetting.hari})</span>
                <span className="bg-emerald-500 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] uppercase shadow-xs">{activeSetting.nama_shift}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-xs font-mono font-bold text-sky-300 border-t border-white/10 pt-2">
                <span>Jam: {activeSetting.jam_masuk} - {activeSetting.jam_pulang}</span>
                <span>Radius: {officeLocation.radius_meter}m</span>
              </div>
            </div>
          )}
        </div>

        {/* HEADER AKUN & TOMBOL AKSI UTAMA (DENGAN EXPORT CSV) */}
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
              <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-sky-600" /> Rekapitulasi Absensi Pribadi
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Akun Login: <strong className="text-sky-700 font-mono">{currentUser?.email || 'Memuat...'}</strong></p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportCSV}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-3.5 rounded-2xl transition flex items-center gap-2 border border-slate-200 cursor-pointer"
              title="Download CSV"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handleOpenForm}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs px-6 py-3.5 rounded-2xl transition flex items-center gap-2 shadow-lg hover:shadow-xl cursor-pointer"
            >
              <Camera className="w-4 h-4" /> Absen Sekarang (GPS + Selfie)
            </button>
          </div>
        </div>

        {/* KARTU STATISTIK MODERN DENGAN RASIO KEHADIRAN */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Absen Hari Ini</span>
              <h3 className={`text-base font-black ${hasCheckedInToday ? 'text-emerald-600 flex items-center gap-1.5' : 'text-amber-600'}`}>
                {hasCheckedInToday ? <><CheckCircle2 className="w-4 h-4 inline" /> Sudah Mengirim</> : 'Belum Absen'}
              </h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold ${hasCheckedInToday ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Absen Anda</span>
              <h3 className="text-xl font-black text-slate-900">{records.length} Berkas</h3>
            </div>
            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center font-bold">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Menunggu Verifikasi</span>
              <h3 className="text-xl font-black text-amber-600">{totalPending} Berkas</h3>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rasio Kehadiran</span>
              <h3 className="text-xl font-black text-emerald-600">{attendanceRate}% Hadir</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold">
              <PieChart className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* TABEL DATA PRIBADI DENGAN FILTER TANGGAL & PAGINATION */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari riwayat atau shift..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-sky-500 transition"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
                <button onClick={() => setDateFilter('semua')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${dateFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Semua Waktu</button>
                <button onClick={() => setDateFilter('hari_ini')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${dateFilter === 'hari_ini' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Hari Ini</button>
                <button onClick={() => setDateFilter('7_hari')} className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${dateFilter === '7_hari' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>7 Hari</button>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
                <button onClick={() => setStatusFilter('semua')} className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${statusFilter === 'semua' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Semua Status</button>
                <button onClick={() => setStatusFilter('Menunggu Verifikasi')} className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${statusFilter === 'Menunggu Verifikasi' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Pending</button>
                <button onClick={() => setStatusFilter('Disetujui')} className={`px-3.5 py-2 rounded-xl transition cursor-pointer ${statusFilter === 'Disetujui' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>Disetujui</button>
              </div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200 text-[10px] tracking-wider">
                  <th className="p-4">Selfie &amp; Waktu</th>
                  <th className="p-4">Shift &amp; Jabatan</th>
                  <th className="p-4 text-center">Kehadiran</th>
                  <th className="p-4 text-center">Radius GPS</th>
                  <th className="p-4 text-center">Status Verifikasi</th>
                  <th className="p-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {isLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Memuat rekap absensi...</td></tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-slate-400 space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-slate-300" />
                      <p>Belum ada riwayat absensi untuk akun ini.</p>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition cursor-pointer" onClick={() => setSelectedDetailRecord(r)}>
                      <td className="p-4 flex items-center gap-3.5">
                        {r.foto_selfie ? (
                          <img src={r.foto_selfie} alt="Selfie" className="w-11 h-11 rounded-2xl object-cover border border-slate-300 shadow-xs shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-[10px] shrink-0">No Photo</div>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">{r.nama_pegawai}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{new Date(r.created_at).toLocaleString('id-ID')} WIB</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-sky-700 block">{r.shift}</span>
                        <span className="text-[10px] text-slate-500">{r.jabatan}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">{r.status_kehadiran}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-slate-700">
                        {r.jarak_meter !== undefined ? `${r.jarak_meter} m` : 'N/A'}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                            r.status_verifikasi === 'Disetujui' ? 'bg-emerald-100 text-emerald-800' : 
                            r.status_verifikasi === 'Ditolak' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {r.status_verifikasi}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => setSelectedDetailRecord(r)}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
                            title="Lihat Detail Lengkap"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {r.catatan_penolakan && (
                            <button 
                              onClick={() => setSelectedRejectionRecord(r)}
                              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                              title="Lihat Catatan Penolakan Admin"
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

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 px-2 text-xs">
              <span className="text-slate-500 font-medium">Halaman {currentPage} dari {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Sebelumnya
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold flex items-center gap-1 cursor-pointer"
                >
                  Berikutnya <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LIVE ACTIVITY TICKER PANEL */}
        <div className="bg-slate-900 text-slate-300 rounded-3xl p-5 shadow-lg border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-800 pb-2">
            <span className="flex items-center gap-2 text-sky-400">
              <Terminal className="w-4 h-4" /> Live System Activity Stream
            </span>
            <span className="text-[10px] text-slate-500 font-mono">{officeLocation.nama_lokasi} Secure Node</span>
          </div>
          <div className="space-y-1 font-mono text-[11px] max-h-24 overflow-y-auto">
            {activityLogs.length === 0 ? (
              <p className="text-slate-500 italic">Menunggu aktivitas sistem...</p>
            ) : (
              activityLogs.map((log, idx) => (
                <div key={idx} className="text-slate-300 flex items-center gap-2">
                  <span className="text-sky-500">&gt;</span> {log}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* MODAL FORM SMART ABSENSI (GPS + LIVE SELFIE + COORDINATE COPY) */}
      {showFormModal && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-sky-600" /> Form Smart Absensi Akun Anda
              </h3>
              <button onClick={handleCloseForm} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {/* PERINGATAN BILA SHIFT DITUTUP */}
            {!isShiftOpen && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-xs text-amber-900 font-medium">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Peringatan: Shift absen di luar jam operasional resmi. Absensi mungkin membutuhkan konfirmasi manual dari admin.</span>
              </div>
            )}

            <form onSubmit={handleSaveAbsensi} className="space-y-4 text-xs">
              {/* LIVE WEBCAM / SELFIE CONTAINER DENGAN SCANNER OVERLAY */}
              <div className="space-y-2">
                <label className="font-bold text-slate-700 block flex items-center gap-1.5">
                  <Fingerprint className="w-4 h-4 text-sky-600" /> Live Selfie Verifikasi Wajah *
                </label>
                <div className="relative w-full h-64 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border-2 border-slate-300 shadow-inner">
                  {capturedImage ? (
                    <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                  ) : cameraActive ? (
                    <>
                      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                      {/* High-tech Face Scan Overlay */}
                      <div className="absolute inset-0 border-[3px] border-sky-500/40 rounded-2xl pointer-events-none flex items-center justify-center">
                        <div className="w-40 h-48 border-2 border-dashed border-sky-400 rounded-full opacity-70 animate-pulse"></div>
                      </div>
                    </>
                  ) : (
                    <div className="text-slate-400 text-center p-4 space-y-2">
                      <Camera className="w-8 h-8 mx-auto opacity-50" />
                      <span className="block text-xs">Kamera belum aktif / terputus</span>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        Nyalakan Kamera
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-2 pt-1">
                  {cameraActive && !capturedImage && (
                    <button type="button" onClick={capturePhoto} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> Ambil Foto
                    </button>
                  )}
                  {capturedImage && (
                    <button type="button" onClick={startCamera} className="px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5" /> Ambil Ulang Foto
                    </button>
                  )}
                </div>
              </div>

              {/* GPS RADIUS STATUS CONTAINER DENGAN VISUAL PROGRESS BAR & COPY BUTTON */}
              <div className={`p-4 rounded-2xl border text-xs space-y-3 ${
                distance !== null && distance <= officeLocation.radius_meter ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 shrink-0 ${distance !== null && distance <= officeLocation.radius_meter ? 'text-emerald-600' : 'text-amber-600'}`} />
                    <div>
                      <span className="font-bold block">Status Geofencing GPS (Maks: {officeLocation.radius_meter}m):</span>
                      <p className="text-[11px] mt-0.5">{locationStatus}</p>
                      {userLocation && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-600">
                            {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)} {gpsAccuracy !== null ? `(±${gpsAccuracy}m)` : ''}
                          </span>
                          <button type="button" onClick={copyCoordinates} className="p-1 bg-white hover:bg-slate-100 rounded border border-slate-200 shadow-2xs text-[10px] flex items-center gap-1 cursor-pointer" title="Salin Koordinat">
                            <Copy className="w-3 h-3 text-slate-600" /> Salin
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={checkGPSLocation} className="p-2.5 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 shadow-xs cursor-pointer shrink-0" title="Perbarui Lokasi GPS">
                    <RefreshCw className={`w-4 h-4 text-slate-700 ${isLocating ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* Distance Radar Progress Bar */}
                {distance !== null && (
                  <div className="space-y-1 bg-white/60 p-2.5 rounded-xl border border-slate-200/50">
                    <div className="flex justify-between text-[10px] font-bold text-slate-600">
                      <span>Jarak Anda: {distance} meter</span>
                      <span>Batas Aman: {officeLocation.radius_meter} meter</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${distance <= officeLocation.radius_meter ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.min(100, (distance / (officeLocation.radius_meter * 2)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nama Lengkap Pegawai *</label>
                <input
                  type="text"
                  placeholder="Nama lengkap..."
                  value={namaPegawai}
                  onChange={(e) => setNamaPegawai(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Shift Petugas</label>
                  <select value={shift} onChange={(e) => setShift(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold focus:outline-none focus:border-sky-500">
                    <option value="Pagi">Shift Pagi</option>
                    <option value="Siang">Shift Siang</option>
                    <option value="Malam">Shift Malam</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status Kehadiran</label>
                  <select value={statusKehadiran} onChange={(e) => setStatusKehadiran(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-bold focus:outline-none focus:border-sky-500">
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 uppercase focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={handleCloseForm} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer">Batal</button>
                <button 
                  type="submit" 
                  disabled={!capturedImage || distance === null || distance > officeLocation.radius_meter}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-md cursor-pointer transition"
                >
                  Kirim Absensi Resmi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETAIL INSPEKSI RIWAYAT ABSENSI & DIGITAL RECEIPT */}
      {selectedDetailRecord && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-4 animate-in fade-in max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-sky-600" /> Detail Berkas &amp; Bukti Kirim
              </h3>
              <button onClick={() => setSelectedDetailRecord(null)} className="p-1.5 hover:bg-slate-100 rounded-full cursor-pointer"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            {selectedDetailRecord.foto_selfie && (
              <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                <img src={selectedDetailRecord.foto_selfie} alt="Selfie Detail" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="space-y-2.5 divide-y divide-slate-100">
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Nama Pegawai</span>
                <span className="font-bold text-slate-900">{selectedDetailRecord.nama_pegawai}</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Jabatan &amp; Shift</span>
                <span className="font-bold text-sky-700">{selectedDetailRecord.shift} ({selectedDetailRecord.jabatan})</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Waktu Kirim</span>
                <span className="font-mono font-bold text-slate-700">{new Date(selectedDetailRecord.created_at).toLocaleString('id-ID')} WIB</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Jarak dari RSUD</span>
                <span className="font-mono font-bold text-slate-900">{selectedDetailRecord.jarak_meter} meter</span>
              </div>
              <div className="pt-2 flex justify-between">
                <span className="text-slate-400 font-medium">Status Verifikasi</span>
                <span className="font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800">{selectedDetailRecord.status_verifikasi}</span>
              </div>
              {selectedDetailRecord.catatan_penolakan && (
                <div className="pt-2">
                  <span className="text-rose-600 font-bold block mb-1">Catatan Penolakan Admin:</span>
                  <p className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-900">{selectedDetailRecord.catatan_penolakan}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <button 
                onClick={() => window.print()} 
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Bukti
              </button>
              <button 
                onClick={() => setSelectedDetailRecord(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold cursor-pointer shadow-sm hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATATAN PENOLAKAN ADMIN */}
      {selectedRejectionRecord && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in">
            <h3 className="text-sm font-black uppercase text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Catatan Penolakan Admin
            </h3>
            <p className="text-xs text-slate-600 bg-rose-50 border border-rose-200 p-3.5 rounded-2xl leading-relaxed">
              {selectedRejectionRecord.catatan_penolakan || 'Tidak ada catatan khusus.'}
            </p>
            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setSelectedRejectionRecord(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer shadow-sm hover:bg-slate-800"
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