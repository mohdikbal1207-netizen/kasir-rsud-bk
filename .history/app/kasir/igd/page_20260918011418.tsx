'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Search, ArrowLeft, CreditCard, Printer, X } from 'lucide-react';
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
  rincian_layanan?: string;
  jenis_layanan?: string;
}

export default function IgdPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'lunas' | 'all'>('pending');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('tunai');
  const [cashGiven, setCashGiven] = useState<string>('');

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [completedTx, setCompletedTx] = useState<TransactionItem | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('transaksi_pasien').select('*').eq('jenis_layanan', 'igd');
      if (activeTab === 'pending') query = query.eq('status_bayar', 'pending');
      else if (activeTab === 'lunas') query = query.eq('status_bayar', 'lunas');

      const { data, error } = await query.order('tanggal_transaksi', { ascending: false });

      if (error || !data || data.length === 0) {
        setTransactions([
          {
            id: 'TX-IGD-001',
            no_rm: 'RM-098512',
            nama_pasien: 'Ny. Ratna Sari',
            poli_tujuan: 'Instalasi Gawat Darurat (IGD)',
            dokter_penanggung_jawab: 'dr. Fikri (Dokter Jaga)',
            total_biaya: 450000,
            status_bayar: 'pending',
            rincian_layanan: 'Penanganan Darurat + Infus + Injeksi',
            jenis_layanan: 'igd'
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
    try {
      await supabase.from('transaksi_pasien').update({ status_bayar: 'lunas', metode_bayar: paymentMethod }).eq('id', selectedTx.id);
      setIsPaymentModalOpen(false);
      setCompletedTx({ ...selectedTx, status_bayar: 'lunas', metode_bayar: paymentMethod });
      setIsReceiptModalOpen(true);
      fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const filtered = transactions.filter(t => t.nama_pasien?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      <KasirHeader title="RSUD BUKIT KERMAN" subtitle="Modul Kasir — Rincian Biaya IGD" showBackButton={true} backUrl="/kasir" />
      <main className="w-full max-w-7xl mx-auto px-4 py-8 flex-1 space-y-6">
        <div className="bg-white/90 border border-slate-200/80 rounded-3xl p-6 shadow-xl flex justify-between items-center">
          <div>
            <button onClick={() => router.push('/kasir')} className="text-xs font-bold text-amber-600 flex items-center space-x-1 mb-1 cursor-pointer">
              <ArrowLeft className="w-4 h-4" /><span>Kembali ke Menu Kasir</span>
            </button>
            <h1 className="text-xl font-black text-slate-900">Rincian Biaya IGD (Gawat Darurat)</h1>
          </div>
          <button onClick={fetchData} className="bg-slate-100 p-2.5 rounded-2xl cursor-pointer"><RefreshCw className="w-4 h-4" /></button>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex justify-between gap-3">
          <div className="flex space-x-2">
            <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${activeTab === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Pending</button>
            <button onClick={() => setActiveTab('lunas')} className={`px-4 py-2 rounded-2xl text-xs font-bold cursor-pointer ${activeTab === 'lunas' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Lunas</button>
          </div>
          <input type="text" placeholder="Cari nama..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-72 bg-slate-50 border rounded-2xl px-4 py-2 text-xs" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(tx => (
            <div key={tx.id} className="bg-white border rounded-3xl p-6 shadow-lg flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${tx.status_bayar === 'lunas' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {tx.status_bayar}
                </span>
                <h2 className="text-sm font-bold text-slate-900">{tx.nama_pasien}</h2>
                <div className="bg-slate-50 border p-3 rounded-2xl text-xs space-y-1">
                  <p>Unit: <strong className="text-slate-800">{tx.poli_tujuan}</strong></p>
                  <p className="text-[11px] text-slate-500">{tx.rincian_layanan}</p>
                </div>
                <p className="text-base font-black text-slate-900">{formatRupiah(tx.total_biaya)}</p>
              </div>
              {tx.status_bayar === 'pending' ? (
                <button onClick={() => { setSelectedTx(tx); setIsPaymentModalOpen(true); }} className="w-full bg-amber-600 text-white font-bold text-xs py-2.5 rounded-2xl cursor-pointer">Proses Pembayaran</button>
              ) : (
                <button onClick={() => { setCompletedTx(tx); setIsReceiptModalOpen(true); }} className="w-full bg-slate-100 text-slate-700 font-bold text-xs py-2.5 rounded-2xl cursor-pointer">Cetak Kuitansi</button>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Modal Bayar */}
      {isPaymentModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-sm font-bold">Bayar IGD - {selectedTx.nama_pasien}</h2>
            <p className="text-xs text-amber-700 font-black">{formatRupiah(selectedTx.total_biaya)}</p>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-2.5 text-xs font-bold">
              <option value="tunai">TUNAI</option>
              <option value="qris">QRIS</option>
            </select>
            {paymentMethod === 'tunai' && <input type="number" placeholder="Uang Tunai" value={cashGiven} onChange={e => setCashGiven(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-2.5 text-xs" />}
            <div className="flex gap-2">
              <button onClick={() => setIsPaymentModalOpen(false)} className="flex-1 bg-slate-100 py-3 rounded-2xl text-xs font-bold cursor-pointer">Batal</button>
              <button onClick={handleProcessPayment} className="flex-1 bg-amber-600 text-white py-3 rounded-2xl text-xs font-bold cursor-pointer">Konfirmasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Kuitansi */}
      {isReceiptModalOpen && completedTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4 font-mono">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xs font-black">KUITANSI IGD</h2>
            <p className="text-xs">{completedTx.nama_pasien} — {formatRupiah(completedTx.total_biaya)}</p>
            <div className="flex gap-2">
              <button onClick={() => window.print()} className="flex-1 bg-amber-600 text-white py-3 rounded-2xl text-xs font-bold cursor-pointer">Print</button>
              <button onClick={() => setIsReceiptModalOpen(false)} className="bg-slate-100 py-3 px-5 rounded-2xl text-xs font-bold cursor-pointer">Tutup</button>
            </div>
          </div>
        </div>
      )}
      <KasirFooter />
    </div>
  );
}