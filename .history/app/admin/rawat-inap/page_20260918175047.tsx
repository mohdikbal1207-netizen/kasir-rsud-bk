'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, CheckCircle2, Clock, XCircle, Search, 
  Printer, Eye, ShieldCheck, Database, Building2, ArrowLeft, X, 
  User, Calendar, AlertCircle, RefreshCw, MessageSquare, CheckSquare, Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AdminHeader from '@/components/admin/AdminHeader';
import AdminFooter from '@/components/admin/AdminFooter';

interface RanapHeader {
  id: string;
  no_reg: string;
  nama_pasien: string;
  nik_pasien?: string;
  umur: string;
  alamat: string;
  diagnosa: string;
  ruang: string;
  jenis_penjaminan?: string;
  metode_pembayaran?: string;
  masuk_tgl: string;
  keluar_tgl: string;
  dokter_merawat: string;
  kepala_ruangan: string;
  bendahara_penerima: string;
  status_verifikasi: string;
  catatan_admin?: string;
  created_at: string;
}

interface RanapItem {
  id: string;
  kategori_biaya: string;
  nama_item: string;
  volume: number;
  tarif_satuan: number;
  jumlah_total: number;
  ditanggung_pihak3: number;
  selisih_bayar: number;
}

const formatNumber = (num: number): string => {
  if (!num || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export default function AdminRanapPage() {
  const router = useRouter();
  const [patientList, setPatientList] = useState<RanapHeader[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // State untuk Modal Detail & Cetak Rincian Biaya
  const [selectedPatient, setSelectedPatient] = useState<RanapHeader | null>(null);
  const [patientItems, setPatientItems] = useState<RanapItem[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [loadingItems, setLoadingItems] = useState<boolean>(false);

  // State untuk Modal Catatan Admin (Revisi / Penolakan)
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [actionTargetStatus, setActionTargetStatus] = useState<string>('');
  const [adminNoteInput, setAdminNoteInput] = useState<string>('');
  const [processingAction, setProcessingAction] = useState<boolean>(false);

  // State untuk Notifikasi Custom
  const [modalNotif, setModalNotif] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  const fetchRanapData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ranap_billing_header')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPatientList(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil data ranap:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRanapData();
  }, []);

  const handleOpenDetail = async (patient: RanapHeader) => {
    setSelectedPatient(patient);
    setShowDetailModal(true);
    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from('ranap_billing_items')
        .select('*')
        .eq('no_reg', patient.no_reg);

      if (error) throw error;
      setPatientItems(data || []);
    } catch (err: any) {
      console.error('Gagal mengambil item rincian:', err);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleExecuteStatusUpdate = async () => {
    if (!selectedPatient) return;

    // Jika status memerlukan catatan (Revisi atau Ditolak), pastikan catatan diisi
    if ((actionTargetStatus === 'NEEDS_REVISION' || actionTargetStatus === 'REJECTED') && !adminNoteInput.trim()) {
      setModalNotif({
        show: true,
        type: 'warning',
        title: 'Catatan Wajib Diisi',
        message: 'Mohon berikan alasan atau catatan mengapa pengajuan ini direvisi/ditolak.'
      });
      return;
    }

    setProcessingAction(true);
    try {
      const updatePayload: any = {
        status_verifikasi: actionTargetStatus,
        catatan_admin: adminNoteInput.trim() || null
      };

      const { error } = await supabase
        .from('ranap_billing_header')
        .update(updatePayload)
        .eq('no_reg', selectedPatient.no_reg);

      if (error) throw error;

      setModalNotif({
        show: true,
        type: 'success',
        title: 'Status Berhasil Diperbarui',
        message: `Status tagihan ${selectedPatient.no_reg} berhasil diubah menjadi ${actionTargetStatus}.`
      });

      setShowActionModal(false);
      setAdminNoteInput('');
      fetchRanapData();

      // Perbarui selected patient lokal
      setSelectedPatient(prev => prev ? { ...prev, status_verifikasi: actionTargetStatus, catatan_admin: updatePayload.catatan_admin } : null);

    } catch (err: any) {
      console.error('Gagal memperbarui status:', err);
      setModalNotif({
        show: true,
        type: 'error',
        title: 'Gagal Memperbarui',
        message: 'Terjadi kesalahan sistem: ' + err.message
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredPatients = patientList.filter(p => {
    const matchesSearch = 
      p.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.no_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ruang?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'ALL' || (p.status_verifikasi || 'PENDING_VERIFIKASI') === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const countByStatus = (status: string) => {
    if (status === 'ALL') return patientList.length;
    return patientList.filter(p => (p.status_verifikasi || 'PENDING_VERIFIKASI') === status).length;
  };

  const renderStatusBadge = (status?: string) => {
    const st = status || 'PENDING_VERIFIKASI';
    if (st === 'VERIFIED_ADMIN' || st === 'VERIFIED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Terverifikasi</span>
        </span>
      );
    } else if (st === 'NEEDS_REVISION') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>Perlu Revisi</span>
        </span>
      );
    } else if (st === 'REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 uppercase">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 uppercase">
          <Clock className="w-3 h-3 text-sky-600 animate-pulse" />
          <span>Menunggu Verifikasi</span>
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans">
      
      {modalNotif.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className={`p-6 flex flex-col items-center text-center space-y-3 ${
              modalNotif.type === 'success' ? 'bg-emerald-50/80' :
              modalNotif.type === 'error' ? 'bg-rose-50/80' :
              modalNotif.type === 'warning' ? 'bg-amber-50/80' : 'bg-sky-50/80'
            }`}>
              <h3 className="text-lg font-black text-slate-900">{modalNotif.title}</h3>
              <p className="text-xs text-slate-600 font-medium">{modalNotif.message}</p>
            </div>
            <div className="p-4 bg-white border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalNotif({ ...modalNotif, show: false })}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Catatan Admin (Revisi / Penolakan) */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col">
            <div className={`px-6 py-4 flex items-center justify-between text-white ${
              actionTargetStatus === 'REJECTED' ? 'bg-rose-700' : 'bg-amber-600'
            }`}>
              <h3 className="text-sm font-black uppercase tracking-wider">
                {actionTargetStatus === 'REJECTED' ? 'Konfirmasi Penolakan Tagihan' : 'Catatan Permintaan Revisi'}
              </h3>
              <button onClick={() => setShowActionModal(false)} className="p-1 rounded-lg hover:bg-black/20 transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 bg-slate-50">
              <p className="text-xs text-slate-600 font-medium">
                Berikan catatan atau instruksi perbaikan yang jelas untuk petugas kasir penginput:
              </p>
              <textarea
                rows={4}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Contoh: Mohon periksa kembali tarif kamar VIP dan jumlah hari rawat pasien..."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                onClick={() => setShowActionModal(false)}
                className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteStatusUpdate}
                disabled={processingAction}
                className={`px-5 py-2.5 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-md ${
                  actionTargetStatus === 'REJECTED' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-amber-600 hover:bg-amber-500'
                }`}
              >
                {processingAction ? 'Memproses...' : 'Kirim Catatan & Perbarui Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AdminHeader 
        title="RSUD BUKIT KERMAN" 
        subtitle="Panel Verifikasi Admin — Perincian Rawat Inap" 
        badgeText="Verifikasi Admin"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Verifikasi & Data Pasien Rawat Inap</h1>
            <p className="text-xs text-slate-500">Kelola dan verifikasi rincian biaya perawatan pasien rawat inap yang diinput kasir.</p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali</span>
          </button>
        </div>

        {/* Tab Filter Status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { id: 'ALL', label: 'Semua Data', color: 'bg-slate-900 text-white' },
            { id: 'PENDING_VERIFIKASI', label: 'Menunggu', color: 'bg-sky-700 text-white' },
            { id: 'VERIFIED_ADMIN', label: 'Terverifikasi', color: 'bg-emerald-700 text-white' },
            { id: 'NEEDS_REVISION', label: 'Perlu Revisi', color: 'bg-amber-600 text-white' },
            { id: 'REJECTED', label: 'Ditolak', color: 'bg-rose-700 text-white' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`p-3 rounded-2xl text-xs font-black transition flex items-center justify-between shadow-sm cursor-pointer border ${
                filterStatus === tab.id 
                  ? `${tab.color} border-transparent ring-2 ring-offset-2 ring-slate-400` 
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {countByStatus(tab.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari nama pasien atau No. Reg..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          <div className="text-xs font-semibold text-slate-600">
            Menampilkan <strong className="text-emerald-700">{filteredPatients.length}</strong> data sesuai filter
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300 text-[10px]">
                  <th className="p-3.5">No. Reg / Tgl</th>
                  <th className="p-3.5">Nama Pasien</th>
                  <th className="p-3.5">Ruang / Kelas</th>
                  <th className="p-3.5">Penjaminan</th>
                  <th className="p-3.5">Diagnosa</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                  <th className="p-3.5 text-center">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Memuat data dari database...</td>
                  </tr>
                ) : filteredPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">Tidak ada data tagihan yang cocok dengan filter saat ini.</td>
                  </tr>
                ) : (
                  filteredPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5">
                        <span className="font-mono font-bold text-slate-900 block">{patient.no_reg}</span>
                        <span className="text-[10px] text-slate-400">{patient.created_at ? new Date(patient.created_at).toLocaleDateString('id-ID') : '-'}</span>
                      </td>
                      <td className="p-3.5">
                        <p className="font-bold text-slate-900 uppercase">{patient.nama_pasien}</p>
                        <p className="text-[10px] text-slate-400">NIK: {patient.nik_pasien || '-'}</p>
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">{patient.ruang}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">
                          {patient.jenis_penjaminan || 'UMUM'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600">{patient.diagnosa || '-'}</td>
                      <td className="p-3.5 text-center">
                        {renderStatusBadge(patient.status_verifikasi)}
                        {patient.catatan_admin && (
                          <span className="block text-[10px] text-amber-700 font-medium mt-1 truncate max-w-[150px]" title={patient.catatan_admin}>
                            Catatan: {patient.catatan_admin}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => handleOpenDetail(patient)}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl transition cursor-pointer inline-flex items-center gap-1 border border-emerald-200 shadow-sm"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Periksa & Verifikasi</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* MODAL DETAIL & VERIFIKASI ADMIN */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-800 relative max-h-[92vh] flex flex-col">
            
            <button 
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 border-b border-slate-200 pr-10">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-emerald-300">
                Panel Kontrol Admin RSUD Bukit Kerman
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 uppercase">{selectedPatient.nama_pasien}</h2>
              <p className="text-xs text-slate-500">No. Reg: <span className="font-mono font-bold text-slate-700">{selectedPatient.no_reg}</span> • Ruangan: {selectedPatient.ruang}</p>
            </div>

            <div className="py-4 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Umur & Alamat</span>
                  <span className="font-bold text-slate-800">{selectedPatient.umur || '-'} • {selectedPatient.alamat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Diagnosa Medis</span>
                  <span className="font-bold text-slate-800">{selectedPatient.diagnosa || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dokter Merawat</span>
                  <span className="font-bold text-slate-800">{selectedPatient.dokter_merawat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kasir Penginput</span>
                  <span className="font-bold text-emerald-700">{selectedPatient.bendahara_penerima || '-'}</span>
                </div>
              </div>

              {selectedPatient.catatan_admin && (
                <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl text-xs text-amber-900 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-black uppercase text-[10px] text-amber-800">Catatan / Alasan Sebelumnya:</strong>
                    <p className="mt-0.5 font-medium">{selectedPatient.catatan_admin}</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white font-bold border-b border-slate-200 text-[10px] uppercase">
                      <th className="p-2.5">Kategori</th>
                      <th className="p-2.5">Uraian Biaya</th>
                      <th className="p-2.5 text-center">Vol</th>
                      <th className="p-2.5 text-right">Tarif</th>
                      <th className="p-2.5 text-right">Total</th>
                      <th className="p-2.5 text-right">Ditanggung Pihak 3</th>
                      <th className="p-2.5 text-right">Selisih Bayar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loadingItems ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Memuat rincian item biaya...</td>
                      </tr>
                    ) : patientItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Tidak ada rincian item tercatat.</td>
                      </tr>
                    ) : (
                      patientItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="p-2.5 font-semibold text-slate-600">{item.kategori_biaya}</td>
                          <td className="p-2.5 font-bold text-slate-900">{item.nama_item}</td>
                          <td className="p-2.5 text-center font-mono">{item.volume}</td>
                          <td className="p-2.5 text-right font-mono">Rp {formatNumber(item.tarif_satuan)}</td>
                          <td className="p-2.5 text-right font-bold font-mono">Rp {formatNumber(item.jumlah_total)}</td>
                          <td className="p-2.5 text-right text-emerald-700 font-mono">Rp {formatNumber(item.ditanggung_pihak3)}</td>
                          <td className="p-2.5 text-right text-rose-700 font-bold font-mono">Rp {formatNumber(item.selisih_bayar)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aksi Verifikasi Footer */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-slate-500 mr-1">Aksi Admin:</span>
                
                <button
                  onClick={() => {
                    setActionTargetStatus('VERIFIED_ADMIN');
                    setAdminNoteInput('Tagihan telah diverifikasi dan disetujui sepenuhnya oleh admin.');
                    handleExecuteStatusUpdate();
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Setujui (Verify)</span>
                </button>

                <button
                  onClick={() => {
                    setActionTargetStatus('NEEDS_REVISION');
                    setAdminNoteInput('');
                    setShowActionModal(true);
                  }}
                  className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Minta Revisi</span>
                </button>

                <button
                  onClick={() => {
                    setActionTargetStatus('REJECTED');
                    setAdminNoteInput('');
                    setShowActionModal(true);
                  }}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm flex items-center space-x-1"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak Tagihan</span>
                </button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      <AdminFooter />

    </div>
  );
}