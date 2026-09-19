'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  CreditCard, Receipt, Search, RefreshCw, CheckCircle2, Clock, 
  Printer, Building2, X, AlertCircle, Stethoscope, ArrowLeft 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import KasirHeader from '@/components/kasir/KasirHeader';
import KasirFooter from '@/components/kasir/KasirFooter';

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

export default function RawatJalanPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'all'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('tunai');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedTx, setCompletedTx] = useState<TransactionItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('transaksi_pasien').select('*').eq('jenis_layanan', 'rawat_jalan');
      if (activeTab === 'pending') query = query.eq('status_bayar', 'pending');
      else if (activeTab === 'lunas') query = query.eq('status_bayar', 'lunas');

      const { data, error } = await query.order('tanggal_transaksi', { ascending: false });

      if (error || !data || data.length === 0) {
        setTransactions([
          {
            id: 'TX-RJ-001',
            no_rm: 'RM-098231',
            nama_pasien: 'Ny. Siti Aminah',
            poli_tujuan: 'Poli Umum',
            dokter_penanggung_jawab: 'dr. H. Abrar, Sp.PD',
            total_biaya: 125000,
            status_bayar: 'pending',
            rincian_layanan: 'Konsultasi Dokter Umum + Resep Obat',
            jenis_layanan: 'rawat_jalan'
          }
        ]);
      } else {
        setTransactions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatRupiah = (num: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  const numericCash = parseFloat(cashGiven) || 0;
  const changeAmount = selectedTx ? numericCash - selectedTx.total_biaya : 0;

  const handleProcessPayment = async () => {
    if (!selectedTx) return;
    if (paymentMethod === 'tunai' && numericCash < selectedTx.total_biaya) {
      alert('Uang tunai kurang!');
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.from('transaksi_pasien').update({ status_bayar: 'lunas', metode_bayar: paymentMethod }).eq('id', selectedTx.id);
      setIsPaymentModalOpen(false);
      setCompletedTx({ ...selectedTx, status_bayar: 'lunas', metode_bayar: paymentMethod });
      setIsReceiptModalOpen(true);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = transactions.filter(t => t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()) || t.no_rm?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Rincian Biaya Rawat Jalan" showBackButton={true} backUrl="/kasir" />
      <main className="w-full max-w-7xl mx-auto px-4 py-8 flex-1 space-y-6">
        <div className="bg-white/9ori border border-slate-200/80 rounded-3xl p-6 shadow-xl flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/kasir')} className="text-xs font-bold text-emerald-600 flex items-center space-x-1 mb-1 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /><span>Kembali ke Menu Kasir</span>
            </button>
            <h1 className="text-xl font-black text-slate-900">Rincian Biaya Rawat Jalan</h1>
          </div>
          <button onClick={fetchData} className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-2xl cursor-pointer">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col sm:flex-row justify-between gap-3">
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Pending</button>
            <button onClick={() => setActiveTab('lunas')} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${activeTab === 'lunas' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Lunas</button>
            <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Semua</button>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Cari nama, No RM..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-3.5 py-2 text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-white border rounded-3xl p-6 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {tx.status_bayar === 'lunas' ? 'Lunas' : 'Pending'}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">{tx.id}</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">{tx.nama_pasien}</h2>
                  <p className="text-xs text-emerald-700 font-mono font-semibold">RM: {tx.no_rm}</p>
                </div>
                <div className="bg-slate-50 border p-3 rounded-2xl text-xs space-y-1">
                  <p>Poli: <strong className="text-slate-800">{tx.poli_tujuan}</strong></p>
                  <p>Dokter: <strong className="text-slate-800">{tx.dokter_penanggung_jawab}</strong></p>
                  <p className="text-[11px] text-slate-500">{tx.rincian_layanan}</p>
                </div>
                <div className="flex justify-between items-center font-bold text-xs">
                  <span className="text-slate-500">Total:</span>
                  <span className="text-base font-black text-slate-900">{formatRupiah(tx.total_biaya)}</span>
                </div>
              </div>
              <div>
                {tx.status_bayar === 'pending' ? (
                  <button onClick={() => { setSelectedTx(tx); setIsPaymentModalOpen(true); }} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-2xl shadow-md cursor-pointer">
                    Proses Pembayaran
                  </button>
                ) : (
                  <button onClick={() => { setCompletedTx(tx); setIsReceiptModalOpen(true); }} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-2xl cursor-pointer">
                    Cetak Kuitansi
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal Pembayaran */}
      {isPaymentModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-sm font-bold">Bayar Rawat Jalan - {selectedTx.nama_pasien}</h2>
            <p className="text-xs text-emerald-700 font-black">{formatRupiah(selectedTx.total_biaya)}</p>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-2.5 text-xs font-bold">
              <option value="tunai">TUNAI</option>
              <option value="qris">QRIS</option>
              <option value="bpjs">BPJS</option>
            </select>
            {paymentMethod === 'tunai' && (
              <div className="space-y-1">
                <input type="number" placeholder="Uang Tunai" value={cashGiven} onChange={e => setCashGiven(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-2.5 text-xs" />
                {numericCash > 0 && <p className="text-xs font-bold text-emerald-700">Kembalian: {formatRupiah(changeAmount)}</p>}
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-2xl text-xs font-bold cursor-pointer">Batal</button>
              <button onClick={handleProcessPayment} disabled={isSubmitting} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold cursor-pointer">Konfirmasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kuitansi */}
      {isReceiptModalOpen && completedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 font-mono">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xs font-black">KUITANSI RAWAT JALAN</h2>
            <p className="text-xs">{completedTx.nama_pasien} — {formatRupiah(completedTx.total_biaya)}</p>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 bg-emerald-600 text-white py-3 rounded-2xl text-xs font-bold cursor-pointer">Print</button>
              <button onClick={() => setIsReceiptModalOpen(false)} className="bg-slate-100 py-3 px-5 rounded-2xl text-xs font-bold cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}
      <KasirFooter />
    </div>
  );
}