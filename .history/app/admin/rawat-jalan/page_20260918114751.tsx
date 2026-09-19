'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  ArrowLeft, 
  Check, 
  Ban,
  Stethoscope,
  Eye
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface TransactionItem {
  id: string;
  no_rm?: string;
  nama_pasien?: string;
  poli_tujuan?: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  tanggal_transaksi?: string;
  rincian_layanan?: any;
}

export default function AdminRawatJalanVerification() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDetail, setSelectedDetail] = useState<TransactionItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transaksi_pasien')
        .select('*')
        .eq('jenis_layanan', 'rawat_jalan')
        .eq('status_bayar', activeTab)
        .order('tanggal_transaksi', { ascending: false });

      if (!error && data) {
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (tx: TransactionItem) => {
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'lunas', metode_bayar: 'verifikasi_admin_pusat' })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      alert(`Tagihan ${tx.id} (${tx.nama_pasien}) berhasil diverifikasi LUNAS.`);
      fetchData();
      setSelectedDetail(null);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const filtered = transactions.filter(t => 
    t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-teal-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-teal-200/30 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Verifikasi Admin Pusat — Perincian Rawat Jalan"
        badgeText="Admin Pusat"
        showBackButton={true}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24">
        
        <div className="bg-white/90 border border-slate-200 rounded-3xl p-6 shadow-xl backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button 
              onClick={() => router.push('/admin')}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Admin</span>
            </button>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <Stethoscope className="w-6 h-6 text-teal-600" />
              <span>Audit Perincian Biaya Rawat Jalan</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending Verifikasi
            </button>
            <button
              onClick={() => setActiveTab('lunas')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'lunas' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Sudah Lunas
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400">Memuat data verifikasi...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-2 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-sm font-bold text-slate-700">Tidak ada data tagihan {activeTab}.</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(tx => {
              let parsedRincian = null;
              try {
                parsedRincian = typeof tx.rincian_layanan === 'string' ? JSON.parse(tx.rincian_layanan) : tx.rincian_layanan;
              } catch {
                parsedRincian = null;
              }

              return (
                <div key={tx.id} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-lg space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-mono">{tx.id}</span>
                      <span className="text-xs font-bold text-teal-700">{tx.poli_tujuan}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{tx.nama_pasien}</h3>
                      <p className="text-xs text-slate-500 font-mono">No. RM: {tx.no_rm}</p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1 font-mono">
                      <div className="flex justify-between"><span>Karcis:</span> <span>{formatRupiah(parsedRincian?.karcis || 0)}</span></div>
                      <div className="flex justify-between"><span>Konsultasi:</span> <span>{formatRupiah((parsedRincian?.konsultasi_umum || 0) + (parsedRincian?.konsultasi_spesialis || 0))}</span></div>
                      <div className="flex justify-between"><span>Apotek:</span> <span>{formatRupiah(parsedRincian?.apotek || 0)}</span></div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-200">
                        <span>Total Tagihan:</span>
                        <span className="text-teal-700">{formatRupiah(tx.total_biaya)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    {tx.status_bayar === 'pending' ? (
                      <button
                        onClick={() => handleApprove(tx)}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md transition flex items-center justify-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verifikasi &amp; Setujui Lunas</span>
                      </button>
                    ) : (
                      <div className="w-full text-center py-2 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>Telah Disetujui Admin</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>
      <AdminFooter />
    </div>
  );
}