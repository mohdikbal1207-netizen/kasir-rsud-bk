'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Stethoscope, 
  BedDouble, 
  Activity, 
  ArrowRight, 
  User, 
  FileBadge, 
  Phone, 
  Maximize2, 
  X,
  Clock,
  Pill,
  Receipt,
  Megaphone,
  AlertTriangle,
  Info,
  Flame,
  Calendar,
  Search,
  RefreshCw,
  Wallet,
  CheckCircle2,
  TrendingUp,
  Wifi,
  WifiOff,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

interface UserProfile {
  nama_lengkap?: string;
  nik?: string;
  nip?: string;
  unit_kerja?: string;
  no_telepon?: string;
  foto_url?: string | null;
  foto_uri?: string | null;
  email?: string;
  role?: string;
}

interface Pengumuman {
  id: number;
  nomor_pengumuman: string;
  judul: string;
  isi: string;
  kategori: 'MENDESAK' | 'INFORMASI' | 'SISTEM' | 'DOKTER';
  prioritas: 'TINGGI' | 'NORMAL' | 'RENDAH';
  target_role: 'SEMUA' | 'KASIR' | 'ADMIN' | 'DOKTER' | 'FARMASI';
  tanggal_mulai: string;
  tanggal_selesai?: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
}

interface ModulItem {
  id: string;
  title: string;
  description: string;
  icon: any;
  route: string;
  colorTheme: 'emerald' | 'teal' | 'amber' | 'purple' | 'sky' | 'indigo';
  countBadge?: number;
  badgeLabel?: string;
}

export default function KasirDashboardPage() {
  const [operatorProfile, setOperatorProfile] = useState<UserProfile | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // State pencarian modul
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State statistik keuangan harian & jumlah antrean per modul
  const [rawatJalanCount, setRawatJalanCount] = useState<number>(0);
  const [rawatInapCount, setRawatInapCount] = useState<number>(0);
  const [igdCount, setIgdCount] = useState<number>(0);
  const [totalPendapatanHariIni, setTotalPendapatanHariIni] = useState<number>(0);
  const [totalLunasHariIniCount, setTotalLunasHariIniCount] = useState<number>(0);

  // State Pengumuman Realtime
  const [announcements, setAnnouncements] = useState<Pengumuman[]>([]);
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  const router = useRouter();

  // Fetch Pengumuman Realtime dari Supabase
  const fetchAnnouncements = useCallback(async () => {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('pengumuman')
        .select('*')
        .eq('is_active', true)
        .lte('tanggal_mulai', now)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const validAnnouncements = (data as Pengumuman[]).filter(item => {
          const isNotExpired = !item.tanggal_selesai || new Date(item.tanggal_selesai) >= new Date();
          const isForKasir = item.target_role === 'SEMUA' || item.target_role === 'KASIR';
          return isNotExpired && isForKasir;
        });

        validAnnouncements.sort((a, b) => {
          if (a.prioritas === 'TINGGI' && b.prioritas !== 'TINGGI') return -1;
          if (a.prioritas !== 'TINGGI' && b.prioritas === 'TINGGI') return 1;
          return 0;
        });

        setAnnouncements(validAnnouncements);
      }
    } catch (err) {
      console.error('Gagal memuat pengumuman kasir:', err);
    }
  }, []);

  // Fetch Data Transaksi & Statistik Kasir
  const fetchTransactionsAndStats = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      const { data: txPendingData } = await supabase
        .from('transaksi_pasien')
        .select('jenis_layanan, status_bayar')
        .eq('status_bayar', 'pending');

      if (txPendingData) {
        setRawatJalanCount(txPendingData.filter(t => t.jenis_layanan === 'rawat_jalan' || !t.jenis_layanan).length);
        setRawatInapCount(txPendingData.filter(t => t.jenis_layanan === 'rawat_inap').length);
        setIgdCount(txPendingData.filter(t => t.jenis_layanan === 'igd').length);
      } else {
        setRawatJalanCount(0);
        setRawatInapCount(0);
        setIgdCount(0);
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const { data: txLunasData } = await supabase
        .from('transaksi_pasien')
        .select('total_bayar, status_bayar, updated_at')
        .eq('status_bayar', 'lunas')
        .gte('updated_at', startOfDay.toISOString());

      if (txLunasData) {
        const total = txLunasData.reduce((acc, curr) => acc + Number(curr.total_bayar || 0), 0);
        setTotalPendapatanHariIni(total);
        setTotalLunasHariIniCount(txLunasData.length);
      } else {
        setTotalPendapatanHariIni(0);
        setTotalLunasHariIniCount(0);
      }
    } catch (err) {
      console.error('Gagal memuat statistik transaksi kasir:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    async function initKasirDashboard() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const userId = session.user.id;
          const userEmail = session.user.email;

          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

          const currentProfile: UserProfile = {
            email: userEmail,
            role: userData?.role || 'kasir',
            ...(profileData || {})
          };

          setOperatorProfile(currentProfile);

          const { data: existingSessions } = await supabase
            .from('user_sessions')
            .select('id')
            .eq('user_id', userId)
            .limit(1);

          const existingSession = existingSessions && existingSessions.length > 0 ? existingSessions[0] : null;

          if (existingSession) {
            await supabase
              .from('user_sessions')
              .update({
                nama_lengkap: currentProfile.nama_lengkap || 'Petugas Kasir',
                role: currentProfile.role || 'kasir',
                login_at: new Date().toISOString(),
                is_active: true
              })
              .eq('user_id', userId);
          } else {
            await supabase
              .from('user_sessions')
              .insert({
                user_id: userId,
                nama_lengkap: currentProfile.nama_lengkap || 'Petugas Kasir',
                role: currentProfile.role || 'kasir',
                login_at: new Date().toISOString(),
                is_active: true
              });
          }
        }

        await fetchTransactionsAndStats();
      } catch (err) {
        console.error('Gagal memuat dashboard kasir:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initKasirDashboard();
    fetchAnnouncements();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    const channelAnnouncements = supabase
      .channel('kasir_dashboard_pengumuman_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengumuman' }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    const channelTransactions = supabase
      .channel('kasir_dashboard_transaksi_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaksi_pasien' }, () => {
        fetchTransactionsAndStats();
      })
      .subscribe();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPhotoPreviewOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(channelAnnouncements);
      supabase.removeChannel(channelTransactions);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [fetchAnnouncements, fetchTransactionsAndStats, router]);

  const operatorPhoto = operatorProfile?.foto_url || operatorProfile?.foto_uri;
  const activeAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

  const modulesList: ModulItem[] = useMemo(() => [
    {
      id: 'rawat-jalan',
      title: 'Rincian Biaya Rawat Jalan',
      description: 'Kelola tagihan konsultasi poliklinik, tindakan medis poliklinik, dan resep obat jalan pasien.',
      icon: Stethoscope,
      route: '/kasir/rawat-jalan',
      colorTheme: 'emerald',
      countBadge: rawatJalanCount,
      badgeLabel: 'Pending'
    },
    {
      id: 'rawat-inap',
      title: 'Rincian Biaya Rawat Inap',
      description: 'Rekapitulasi tarif akomodasi kamar perawatan, visite dokter spesialis, tindakan, dan farmasi inap.',
      icon: BedDouble,
      route: '/kasir/rawat-inap',
      colorTheme: 'teal',
      countBadge: rawatInapCount,
      badgeLabel: 'Pending'
    },
    {
      id: 'igd',
      title: 'Rincian Biaya IGD',
      description: 'Manajemen tagihan penanganan gawat darurat, observasi medis, alat kesehatan, dan tindakan darurat.',
      icon: Activity,
      route: '/kasir/igd',
      colorTheme: 'amber',
      countBadge: igdCount,
      badgeLabel: 'Pending'
    },
    {
      id: 'rincian-obat',
      title: 'Biaya Obat & OBHP',
      description: 'Rincian itemisasi resep obat-obatan dan bahan habis pakai medis (OBHP) per pasien.',
      icon: Pill,
      route: '/kasir/rincian-obat',
      colorTheme: 'purple'
    },
    {
      id: 'kwitansi',
      title: 'Kwitansi Pembayaran',
      description: 'Entry transaksi pembayaran, penerimaan tunai/non-tunai, dan cetak kwitansi resmi.',
      icon: Receipt,
      route: '/kasir/kwitansi',
      colorTheme: 'sky'
    },
    {
      id: 'absensi',
      title: 'Absensi Petugas Kasir',
      description: 'Form clock-in/clock-out shift kerja mandiri serta pencatatan modal awal kas.',
      icon: Clock,
      route: '/kasir/absensi',
      colorTheme: 'indigo'
    }
  ], [rawatJalanCount, rawatInapCount, igdCount]);

  const filteredModules = useMemo(() => {
    if (!searchQuery.trim()) return modulesList;
    const query = searchQuery.toLowerCase();
    return modulesList.filter(mod => 
      mod.title.toLowerCase().includes(query) || 
      mod.description.toLowerCase().includes(query)
    );
  }, [searchQuery, modulesList]);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      <KasirHeader showBackButton={false} subtitle="Panel Utama Modul Kasir & Billing SIMRS" title="RSUD BUKIT KERMAN"/>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10">
        
        {/* BANNER BROADCAST PENGUMUMAN REALTIME */}
        {activeAnnouncements.length > 0 && (
          <div className="space-y-3 animate-in fade-in">
            {activeAnnouncements.map((item) => (
              <div
                key={item.id}
                className={`p-5 rounded-3xl border shadow-lg flex items-start justify-between gap-4 transition relative overflow-hidden ${
                  item.kategori === 'MENDESAK' || item.prioritas === 'TINGGI'
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white border-amber-400'
                    : 'bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white border-purple-800'
                }`}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={`p-3 rounded-2xl shrink-0 ${
                    item.kategori === 'MENDESAK' || item.prioritas === 'TINGGI'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {item.kategori === 'MENDESAK' || item.prioritas === 'TINGGI' ? (
                      <Flame className="w-6 h-6 animate-pulse"/>
                    ) : (
                      <Megaphone className="w-6 h-6"/>
                    )}
                  </div>

                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-white/20 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {item.kategori}
                      </span>
                      {item.prioritas === 'TINGGI' && (
                        <span className="bg-rose-500 text-white font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-bounce">
                          PRIORITAS TINGGI
                        </span>
                      )}
                      <span className="text-[11px] opacity-80 font-mono">
                        {item.nomor_pengumuman} • {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <h4 className="text-base font-black tracking-wide uppercase">{item.judul}</h4>
                    <p className="text-xs opacity-90 leading-relaxed whitespace-pre-line">{item.isi}</p>
                    
                    <div className="text-[10px] opacity-75 font-mono pt-1">
                      Diterbitkan oleh: <strong>{item.created_by}</strong>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setDismissedIds(prev => [...prev, item.id])}
                  className="p-1.5 hover:bg-white/20 rounded-full transition cursor-pointer shrink-0"
                  title="Tutup Pengumuman"
                >
                  <X className="w-5 h-5 text-white"/>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* KARTU PROFIL AKUN OPERATOR KASIR */}
        <div className="bg-white/95 border border-emerald-200/80 rounded-3xl p-6 shadow-xl shadow-emerald-900/5 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div 
              onClick={() => operatorPhoto && setIsPhotoPreviewOpen(true)}
              className={`w-20 h-20 rounded-2xl bg-slate-100 border-2 border-emerald-500 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md relative group ${operatorPhoto ? 'cursor-pointer' : ''}`}
              title={operatorPhoto ? 'Klik untuk memperbesar foto profil' : 'Foto tidak tersedia'}
            >
              {operatorPhoto ? (
                <>
                  <img src={operatorPhoto} alt="Foto Profil Kasir" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                    <Maximize2 className="w-5 h-5"/>
                  </div>
                </>
              ) : (
                <User className="w-8 h-8 text-slate-400"/>
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Operator Aktif
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                  Role: {operatorProfile?.role?.toUpperCase() || 'KASIR'}
                </span>

                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isOnline ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {isOnline ? (
                    <>
                      <Wifi className="w-3 h-3 text-emerald-600"/>
                      <span>Terhubung</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3 h-3 text-rose-600 animate-pulse"/>
                      <span>Terputus</span>
                    </>
                  )}
                </span>
              </div>

              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {operatorProfile?.nama_lengkap || 'Petugas Kasir RSUD'}
              </h2>
              <p className="text-xs text-emerald-700 font-semibold uppercase">
                Unit Kerja: {operatorProfile?.unit_kerja || 'Loket Pembayaran / Kasir RSUD Bukit Kerman'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto text-xs bg-slate-50 border border-slate-200/70 p-4 rounded-2xl">
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <FileBadge className="w-3.5 h-3.5 text-slate-400"/>
                <span>NIK / NIP:</span>
              </div>
              <p className="font-bold text-slate-800 font-mono">{operatorProfile?.nik || operatorProfile?.nip || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400"/>
                <span>No. WhatsApp:</span>
              </div>
              <p className="font-bold text-slate-800 font-mono">{operatorProfile?.no_telepon || '-'}</p>
            </div>
          </div>
        </div>

        {/* RINGKASAN REKAPITULASI KEUANGAN HARI INI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-5 text-white shadow-lg shadow-emerald-900/10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-emerald-100 uppercase tracking-wider block">
                Total Omset Shift Hari Ini
              </span>
              <h3 className="text-xl sm:text-2xl font-black font-mono">
                {formatRupiah(totalPendapatanHariIni)}
              </h3>
              <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-300"/>
                <span>{totalLunasHariIniCount} Transaksi Selesai / Lunas</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center text-white shrink-0">
              <Wallet className="w-6 h-6"/>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-3xl p-5 text-slate-800 shadow-md flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Total Antrean Billing Pending
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-amber-600 font-mono">
                {rawatJalanCount + rawatInapCount + igdCount} <span className="text-xs font-normal text-slate-500">Pasien</span>
              </h3>
              <p className="text-[10px] text-slate-500">
                Memerlukan verifikasi &amp; pelunasan kasir
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <TrendingUp className="w-6 h-6"/>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 text-slate-800 shadow-md flex items-center justify-between sm:col-span-2 lg:col-span-1">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider block">
                Pembaruan Realtime
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchTransactionsAndStats}
                  disabled={isRefreshing}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}/>
                  <span>{isRefreshing ? 'Memuat...' : 'Sinkronkan Data'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 pt-0.5">
                Otomatis tersinkronisasi via Supabase Live
              </p>
            </div>
            <div className="w-12 h-12 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <Sparkles className="w-6 h-6 text-emerald-600"/>
            </div>
          </div>
        </div>

        {/* BAR PENCARIAN & FILTER MODUL UTAMA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">
            Modul &amp; Rincian Biaya Layanan
          </h2>

          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              type="text"
              placeholder="Cari modul (misal: Rawat Jalan, Kwitansi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>
        </div>

        {/* GRID CARD MODUL UTAMA KASIR */}
        {filteredModules.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((mod) => {
              const IconComponent = mod.icon;
              
              const themeStyles = {
                emerald: {
                  bgIcon: 'bg-emerald-50 border-emerald-200 text-emerald-600',
                  hoverBorder: 'hover:border-emerald-400',
                  hoverTitle: 'group-hover:text-emerald-700',
                  btnText: 'text-emerald-600'
                },
                teal: {
                  bgIcon: 'bg-teal-50 border-teal-200 text-teal-600',
                  hoverBorder: 'hover:border-teal-400',
                  hoverTitle: 'group-hover:text-teal-700',
                  btnText: 'text-teal-600'
                },
                amber: {
                  bgIcon: 'bg-amber-50 border-amber-200 text-amber-600',
                  hoverBorder: 'hover:border-amber-400',
                  hoverTitle: 'group-hover:text-amber-700',
                  btnText: 'text-amber-600'
                },
                purple: {
                  bgIcon: 'bg-purple-50 border-purple-200 text-purple-600',
                  hoverBorder: 'hover:border-purple-400',
                  hoverTitle: 'group-hover:text-purple-700',
                  btnText: 'text-purple-600'
                },
                sky: {
                  bgIcon: 'bg-sky-50 border-sky-200 text-sky-600',
                  hoverBorder: 'hover:border-sky-400',
                  hoverTitle: 'group-hover:text-sky-700',
                  btnText: 'text-sky-600'
                },
                indigo: {
                  bgIcon: 'bg-indigo-50 border-indigo-200 text-indigo-600',
                  hoverBorder: 'hover:border-indigo-400',
                  hoverTitle: 'group-hover:text-indigo-700',
                  btnText: 'text-indigo-600'
                }
              }[mod.colorTheme];

              return (
                <div 
                  key={mod.id}
                  onClick={() => router.push(mod.route)}
                  className={`bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl ${themeStyles.hoverBorder} cursor-pointer relative overflow-hidden group`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className={`w-12 h-12 border rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-105 transition ${themeStyles.bgIcon}`}>
                        <IconComponent className="w-6 h-6"/>
                      </div>
                      {!isLoading && mod.countBadge !== undefined && mod.countBadge > 0 && (
                        <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                          {mod.countBadge} {mod.badgeLabel || 'Pending'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <h3 className={`text-base font-bold text-slate-900 transition ${themeStyles.hoverTitle}`}>
                        {mod.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                  </div>

                  <div className={`pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold ${themeStyles.btnText} group-hover:translate-x-1 transition-transform`}>
                    <span>Buka {mod.title}</span>
                    <ArrowRight className="w-4 h-4"/>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-12 text-center space-y-3">
            <p className="text-sm font-semibold text-slate-600">Modul tidak ditemukan</p>
            <p className="text-xs text-slate-400">Tidak ada modul kasir yang sesuai dengan kata kunci "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
            >
              Bersihkan Pencarian
            </button>
          </div>
        )}

      </main>

      {/* MODAL PRATINJAU FOTO PROFIL */}
      {isPhotoPreviewOpen && operatorPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 space-y-4 border border-slate-100 text-center relative">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Pas Foto Operator Kasir</span>
              <button 
                onClick={() => setIsPhotoPreviewOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4"/>
              </button>
            </div>
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 shadow-inner">
              <img src={operatorPhoto} alt="Pratinjau Foto Kasir" className="w-full h-full object-contain" />
            </div>
            <div className="pb-2">
              <button 
                onClick={() => setIsPhotoPreviewOpen(false)} 
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter/>
    </div>
  );
}