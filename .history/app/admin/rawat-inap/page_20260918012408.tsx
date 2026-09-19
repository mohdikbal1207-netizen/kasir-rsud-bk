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
  BedDouble,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface TransactionItem {
  id: string;
  no_rm?: string;
  nama_pasien?: string;
  poli_tujuan?: string;
  dokter_penanggung_jawab?: string;
  total_biaya: number;
  status_bayar: 'pending' | 'lunas' | 'dibatalkan';
  metode_bayar?: string;
  tanggal_transaksi?: string;
  rincian_layanan?: string;
  jenis_layanan?: string;
}

export default function AdminRawatInapPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'all'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      let query = supabase
        .from('transaksi_pasien')
        .select('*')
        .eq('jenis_layanan', 'rawat_inap');

      if (activeTab === 'pending') {
        query = query.eq('status_bayar', 'pending');
      } else if (activeTab === 'lunas') {
        query = query.eq('status_bayar', 'lunas');
      }

      const { data, error } = await query.order('tanggal_transaksi', { ascending: false });

      if (error || !data || data.length === 0) {
        setTransactions([
          {
            id: 'TX-RI-001',
            no_rm: 'RM-044120',
            nama_pasien: 'Tn. Budi Santoso',
            poli_tujuan: 'Bangsal Melati (VIP)',
            dokter_penanggung_jawab: 'dr. Sp.B',
            total_biaya: 1550000,
            status_bayar: 'pending',
            tanggal_transaksi: new Date().toISOString(),
            rincian_layanan: 'Akomodasi Inap 3 Hari + Visite & Tindakan Bedah',
            jenis_layanan: 'rawat_inap'
          }
        ]);
      } else {
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Gagal memuat data verifikasi Rawat Inap.' });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  const handleApprove = async (tx: TransactionItem) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'lunas', metode_bayar: 'verifikasi_admin' })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi Rawat Inap ${tx.id} (${tx.nama_pasien}) disetujui LUNAS.` });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (tx: TransactionItem) => {
    if (!confirm(`Batalkan transaksi ${tx.id}?`)) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('transaksi_pasien')
        .update({ status_bayar: 'dibatalkan' })
        .eq('id', tx.id);

      if (error) throw new Error(error.message);
      setMessage({ type: 'success', text: `Transaksi ${tx.id} dibatalkan.` });
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setMessage({ type: 'error', text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = transactions.filter(t => 
    t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[140px] pointer-events-none -z-10"></div>
      
      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Verifikasi Admin — Rawat Inap"
        badgeText="Admin Pusat"
        showBackButton={true}
      />

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 flex-1 space-y-6 relative z-10 pb-24">
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl shadow-slate-200/50 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <button 
              onClick={() => router.push('/admin')}
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 mb-1 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard Admin</span>
            </button>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
              <BedDouble className="w-6 h-6 text-indigo-600" />
              <span>Verifikasi Pembayaran Rawat Inap</span>
            </h1>
            <p className="text-xs text-slate-500">Pusat audit dan persetujuan billing kamar, visite dokter, serta tindakan inap.</p>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 p-2.5 rounded-2xl transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-white/90 border border-slate-200 rounded-3xl p-4 shadow-sm backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'pending' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setActiveTab('lunas')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'lunas' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Lunas (Diverifikasi)
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'all' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Cari pasien, No RM, ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2 text-xs text-slate-800 focus:outline-none font-medium"
            />
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs flex items-start space-x-2.5 border shadow-sm ${
            message.type === 'success' ? 'bg-indigo-50 border-indigo-200 text-indigo-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-slate-200 rounded-3xl p-6 h-60 animate-pulse shadow-sm"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-sm">
            <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-sm font-bold text-slate-700">Tidak ada data verifikasi Rawat Inap.</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tx) => (
              <div key={tx.id} className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-lg shadow-slate-200/50 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                      tx.status_bayar === 'lunas' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {tx.status_bayar === 'lunas' ? 'Sudah Diverifikasi' : 'Pending Verifikasi'}
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {tx.id}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <h2 className="text-sm font-bold text-slate-900">{tx.nama_pasien}</h2>
                    <p className="text-xs text-indigo-700 font-mono font-semibold">No. RM: {tx.no_rm}</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1 text-slate-600">
                    <p>Bangsal / Kamar: <strong className="text-slate-800">{tx.poli_tujuan}</strong></p>
                    <p>Dokter: <strong className="text-slate-800">{tx.dokter_penanggung_jawab}</strong></p>
                    <p className="pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">{tx.rincian_layanan}</p>
                  </div>

                  <div className="flex justify-between items-center font-bold text-xs">
                    <span className="text-slate-500">Total Tagihan:</span>
                    <span className="text-base font-black text-slate-900">{formatRupiah(tx.total_biaya)}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {tx.status_bayar === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(tx)}
                        disabled={isSubmitting}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition shadow-md flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        <span>Verifikasi Lunas</span>
                      </button>
                      <button
                        onClick={() => handleReject(tx)}
                        disabled={isSubmitting}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center space-x-1 cursor-pointer border border-rose-200"
                      >
                        <Ban className="w-4 h-4 text-rose-500" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-2 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                      <span>Telah Diverifikasi Pusat</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <AdminFooter />
    </div>
  );
}