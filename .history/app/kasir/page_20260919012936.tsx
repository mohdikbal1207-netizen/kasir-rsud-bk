'use client';

import { useState, useEffect } from 'react';
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
  Receipt
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

export default function KasirDashboardPage() {
  const [operatorProfile, setOperatorProfile] = useState<UserProfile | null>(null);
  const [isPhotoPreviewOpen, setIsPhotoPreviewOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // State jumlah antrean per modul untuk badge notifikasi
  const [rawatJalanCount, setRawatJalanCount] = useState<number>(0);
  const [rawatInapCount, setRawatInapCount] = useState<number>(0);
  const [igdCount, setIgdCount] = useState<number>(0);

  const router = useRouter();

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

          // Catat sesi aktif otomatis (aman menggunakan .limit(1))
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

        // Ambil jumlah data pending per kategori untuk badge notifikasi
        const { data: txData } = await supabase
          .from('transaksi_pasien')
          .select('jenis_layanan, status_bayar')
          .eq('status_bayar', 'pending');

        if (txData) {
          setRawatJalanCount(txData.filter(t => t.jenis_layanan === 'rawat_jalan' || !t.jenis_layanan).length);
          setRawatInapCount(txData.filter(t => t.jenis_layanan === 'rawat_inap').length);
          setIgdCount(txData.filter(t => t.jenis_layanan === 'igd').length);
        } else {
          setRawatJalanCount(0);
          setRawatInapCount(0);
          setIgdCount(0);
        }
      } catch (err) {
        console.error('Gagal memuat dashboard kasir:', err);
      }finally {
        setIsLoading(false);
      }
    }

    initKasirDashboard();
  }, []);

  const operatorPhoto = operatorProfile?.foto_url || operatorProfile?.foto_uri;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[120px] pointer-events-none -z-10"></div>

      {/* Header Kasir Utama */}
      <KasirHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Panel Utama Modul Kasir & Billing SIMRS"
        showBackButton={false}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8 relative z-10">
        
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
                    <Maximize2 className="w-5 h-5" />
                  </div>
                </>
              ) : (
                <User className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Operator Aktif
                </span>
                <span className="bg-slate-100 text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                  Role: {operatorProfile?.role?.toUpperCase() || 'KASIR'}
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
                <FileBadge className="w-3.5 h-3.5 text-slate-400" />
                <span>NIK / NIP:</span>
              </div>
              <p className="font-bold text-slate-800 font-mono">{operatorProfile?.nik || operatorProfile?.nip || '-'}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-1.5 text-slate-500">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>No. WhatsApp:</span>
              </div>
              <p className="font-bold text-slate-800 font-mono">{operatorProfile?.no_telepon || '-'}</p>
            </div>
          </div>
        </div>

        {/* GRID CARD MODUL UTAMA KASIR */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider px-1">
            Modul &amp; Rincian Biaya Layanan
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* CARD 1: Rincian Biaya Rawat Jalan */}
            <div 
              onClick={() => router.push('/kasir/rawat-jalan')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-emerald-400 cursor-pointer relative overflow-hidden group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Stethoscope className="w-6 h-6" />
                  </div>
                  {!isLoading && rawatJalanCount > 0 && (
                    <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      {rawatJalanCount} Pending
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    Rincian Biaya Rawat Jalan
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Kelola tagihan konsultasi poliklinik, tindakan medis poliklinik, dan resep obat jalan pasien.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Rawat Jalan</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 2: Rincian Biaya Rawat Inap */}
            <div 
              onClick={() => router.push('/kasir/rawat-inap')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-teal-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-teal-50 border border-teal-200 rounded-2xl text-teal-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <BedDouble className="w-6 h-6" />
                  </div>
                  {!isLoading && rawatInapCount > 0 && (
                    <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      {rawatInapCount} Pending
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition">
                    Rincian Biaya Rawat Inap
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Rekapitulasi tarif akomodasi kamar perawatan, visite dokter spesialis, tindakan, dan farmasi inap.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Rawat Inap</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 3: Rincian Biaya IGD */}
            <div 
              onClick={() => router.push('/kasir/igd')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-amber-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-amber-50 border border-amber-200 rounded-2xl text-amber-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Activity className="w-6 h-6" />
                  </div>
                  {!isLoading && igdCount > 0 && (
                    <span className="bg-amber-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm animate-pulse">
                      {igdCount} Pending
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition">
                    Rincian Biaya IGD
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Manajemen tagihan penanganan gawat darurat, observasi medis, alat kesehatan, dan tindakan darurat.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Modul IGD</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 4: Rincian Biaya Obat-Obatan & OBHP */}
            <div 
              onClick={() => router.push('/kasir/rincian-obat')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-purple-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-purple-50 border border-purple-200 rounded-2xl text-purple-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Pill className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition">
                    Biaya Obat &amp; OBHP
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Rincian itemisasi resep obat-obatan dan bahan habis pakai medis (OBHP) per pasien.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Biaya Obat &amp; OBHP</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 5: Kwitansi Pembayaran */}
            <div 
              onClick={() => router.push('/kasir/kwitansi')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-sky-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-sky-50 border border-sky-200 rounded-2xl text-sky-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Receipt className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-sky-700 transition">
                    Kwitansi Pembayaran
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Entry transaksi pembayaran, penerimaan tunai/non-tunai, dan cetak kwitansi resmi.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Kwitansi</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* CARD 6: Absensi Petugas Kasir */}
            <div 
              onClick={() => router.push('/kasir/absensi')}
              className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-6 transition hover:shadow-xl hover:border-emerald-400 cursor-pointer group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition">
                    <Clock className="w-6 h-6" />
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition">
                    Absensi Petugas Kasir
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Form clock-in/clock-out shift kerja mandiri serta pencatatan modal awal kas.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-600 group-hover:translate-x-1 transition-transform">
                <span>Buka Absensi Kasir</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* MODAL PRATINJAU FOTO PROFIL */}
      {isPhotoPreviewOpen && operatorPhoto && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-4 space-y-4 border border-slate-100 text-center relative">
            <div className="flex items-center justify-between px-2 pt-2">
              <span className="text-xs font-bold text-slate-700">Pas Foto Operator Kasir</span>
              <button onClick={() => setIsPhotoPreviewOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full h-80 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 shadow-inner">
              <img src={operatorPhoto} alt="Pratinjau Foto Kasir" className="w-full h-full object-contain" />
            </div>
            <div className="pb-2">
              <button onClick={() => setIsPhotoPreviewOpen(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <KasirFooter />
    </div>
  );
}