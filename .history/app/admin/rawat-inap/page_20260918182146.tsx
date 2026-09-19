'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, CheckCircle2, Clock, XCircle, Search, 
  Printer, Eye, ShieldCheck, Database, Building2, ArrowLeft, X, 
  User, Calendar, AlertCircle, RefreshCw, MessageSquare, CheckSquare, Send,
  Download, CheckSquare2, Square, Layers, Banknote, ArrowUpDown, Filter, BarChart3, RotateCcw, ChevronLeft, ChevronRight
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
  total_biaya?: number;
  total_ditanggung?: number;
  total_selisih?: number;
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

// Fungsi Terbilang Otomatis untuk Format Cetak Resmi
const penyebut = (nilai: number): string => {
  let bilangan = Math.floor(Math.abs(nilai));
  let kata = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let hasil = "";
  if (bilangan < 12) {
    hasil = " " + kata[bilangan];
  } else if (bilangan < 20) {
    hasil = penyebut(bilangan - 10) + " Belas";
  } else if (bilangan < 100) {
    hasil = penyebut(Math.floor(bilangan / 10)) + " Puluh" + penyebut(bilangan % 10);
  } else if (bilangan < 200) {
    hasil = " Seratus" + penyebut(bilangan - 100);
  } else if (bilangan < 1000) {
    hasil = penyebut(Math.floor(bilangan / 100)) + " Ratus" + penyebut(bilangan % 100);
  } else if (bilangan < 2000) {
    hasil = penyebut(Math.floor(bilangan / 1000)) + " Ribu" + penyebut(bilangan % 1000);
  } else if (bilangan < 1000000) {
    hasil = penyebut(Math.floor(bilangan / 1000)) + " Ribu" + penyebut(bilangan % 1000);
  } else if (bilangan < 1000000000) {
    hasil = penyebut(Math.floor(bilangan / 1000000)) + " Juta" + penyebut(bilangan % 1000000);
  }
  return hasil;
};

const terbilang = (nilai: number): string => {
  if (!nilai || isNaN(nilai)) return 'Nol Rupiah';
  let hasil = penyebut(nilai).trim();
  return (hasil ? hasil + " Rupiah" : "Nol Rupiah");
};

export default function AdminRanapPage() {
  const router = useRouter();
  const [patientList, setPatientList] = useState<RanapHeader[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');

  // State Filter Tambahan
  const [filterPenjaminan, setFilterPenjaminan] = useState<string>('ALL');
  const [filterRuang, setFilterRuang] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // State Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  // State untuk Batch Selection
  const [selectedAdminRowIds, setSelectedAdminRowIds] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState<boolean>(false);

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

  // Listener tombol ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showActionModal) {
          setShowActionModal(false);
        } else if (showDetailModal) {
          setShowDetailModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showActionModal, showDetailModal]);

  const fetchRanapData = async () => {
    setLoading(true);
    try {
      const { data: headers, error: headerErr } = await supabase
        .from('ranap_billing_header')
        .select('*, ranap_billing_items(jumlah_total, ditanggung_pihak3, selisih_bayar)')
        .order('created_at', { ascending: false });

      if (headerErr) throw headerErr;

      if (headers) {
        const formatted = headers.map((h: any) => {
          const matchingItems = h.ranap_billing_items || [];
          const total_biaya = matchingItems.reduce((acc: number, curr: any) => acc + (curr.jumlah_total || 0), 0);
          const total_ditanggung = matchingItems.reduce((acc: number, curr: any) => acc + (curr.ditanggung_pihak3 || 0), 0);
          const total_selisih = matchingItems.reduce((acc: number, curr: any) => acc + (curr.selisih_bayar || 0), 0);

          return {
            ...h,
            total_biaya,
            total_ditanggung,
            total_selisih
          };
        });

        setPatientList(formatted);
      }
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

  // Batch Verification Handler
  const handleBatchVerify = async () => {
    if (selectedAdminRowIds.length === 0) return;

    setBatchProcessing(true);
    try {
      const { error } = await supabase
        .from('ranap_billing_header')
        .update({ 
          status_verifikasi: 'VERIFIED_ADMIN',
          catatan_admin: 'Disetujui secara massal (Batch Verification) oleh Admin.' 
        })
        .in('no_reg', selectedAdminRowIds);

      if (error) throw error;

      setModalNotif({
        show: true,
        type: 'success',
        title: 'Verifikasi Massal Berhasil',
        message: `${selectedAdminRowIds.length} data tagihan berhasil disetujui sekaligus.`
      });

      setSelectedAdminRowIds([]);
      fetchRanapData();
    } catch (err: any) {
      console.error('Gagal melakukan verifikasi massal:', err);
      setModalNotif({
        show: true,
        type: 'error',
        title: 'Gagal Batch Verifikasi',
        message: 'Terjadi kendala sistem: ' + err.message
      });
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleExportAdminCSV = () => {
    if (filteredPatients.length === 0) {
      setModalNotif({
        show: true,
        type: 'warning',
        title: 'Data Kosong',
        message: 'Tidak ada data rekapitulasi yang dapat diekspor.'
      });
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "No. Reg,Nama Pasien,NIK,Ruangan,Penjaminan,Status Verifikasi,Total Biaya (Rp),Ditanggung BPJS (Rp),Selisih Umum (Rp)\n";
    
    filteredPatients.forEach(p => {
      const row = [
        p.no_reg,
        `"${p.nama_pasien}"`,
        p.nik_pasien || '',
        `"${p.ruang || '-'}"`,
        p.jenis_penjaminan || 'UMUM',
        p.status_verifikasi || 'PENDING_VERIFIKASI',
        p.total_biaya || 0,
        p.total_ditanggung || 0,
        p.total_selisih || 0
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Admin_Ranap_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const uniqueRooms = Array.from(new Set(patientList.map(p => p.ruang).filter(Boolean)));

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterStatus('ALL');
    setFilterPenjaminan('ALL');
    setFilterRuang('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const filteredPatients = patientList.filter(p => {
    const matchesSearch = 
      p.nama_pasien.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.no_reg.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.ruang?.toLowerCase().includes(searchTerm.toLowerCase());
     
    const matchesFilter = filterStatus === 'ALL' || (p.status_verifikasi || 'PENDING_VERIFIKASI') === filterStatus;
    const matchesPenjaminan = filterPenjaminan === 'ALL' || (p.jenis_penjaminan || 'UMUM / MANDIRI').includes(filterPenjaminan);
    const matchesRuang = filterRuang === 'ALL' || p.ruang === filterRuang;

    let matchesDate = true;
    if (startDate && p.created_at) {
      matchesDate = matchesDate && new Date(p.created_at) >= new Date(startDate);
    }
    if (endDate && p.created_at) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59);
      matchesDate = matchesDate && new Date(p.created_at) <= endDateTime;
    }

    return matchesSearch && matchesFilter && matchesPenjaminan && matchesRuang && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'highest_cost') {
      return (b.total_biaya || 0) - (a.total_biaya || 0);
    } else if (sortBy === 'lowest_cost') {
      return (a.total_biaya || 0) - (b.total_biaya || 0);
    } else if (sortBy === 'name_asc') {
      return a.nama_pasien.localeCompare(b.nama_pasien);
    } else {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
  });

  const totalPages = Math.ceil(filteredPatients.length / rowsPerPage) || 1;
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const countByStatus = (status: string) => {
    if (status === 'ALL') return patientList.length;
    return patientList.filter(p => (p.status_verifikasi || 'PENDING_VERIFIKASI') === status).length;
  };

  const totalAkumulasiSemua = patientList.reduce((acc, curr) => acc + (curr.total_biaya || 0), 0);
  const totalBpjsSemua = patientList.reduce((acc, curr) => acc + (curr.total_ditanggung || 0), 0);
  const totalUmumSemua = patientList.reduce((acc, curr) => acc + (curr.total_selisih || 0), 0);

  const totalVerifiedCount = patientList.filter(p => p.status_verifikasi === 'VERIFIED_ADMIN' || p.status_verifikasi === 'VERIFIED').length;
  const verificationPercentage = patientList.length > 0 ? Math.round((totalVerifiedCount / patientList.length) * 100) : 0;

  const toggleSelectAllAdmin = () => {
    if (selectedAdminRowIds.length === paginatedPatients.length) {
      setSelectedAdminRowIds([]);
    } else {
      setSelectedAdminRowIds(paginatedPatients.map(p => p.no_reg));
    }
  };

  const toggleSelectOneAdmin = (noReg: string) => {
    if (selectedAdminRowIds.includes(noReg)) {
      setSelectedAdminRowIds(selectedAdminRowIds.filter(id => id !== noReg));
    } else {
      setSelectedAdminRowIds([...selectedAdminRowIds, noReg]);
    }
  };

  const renderStatusBadge = (status?: string) => {
    const st = status || 'PENDING_VERIFIKASI';
    if (st === 'VERIFIED_ADMIN' || st === 'VERIFIED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase shadow-sm">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Terverifikasi</span>
        </span>
      );
    } else if (st === 'NEEDS_REVISION') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 uppercase shadow-sm">
          <AlertCircle className="w-3 h-3 text-amber-600" />
          <span>Perlu Revisi</span>
        </span>
      );
    } else if (st === 'REJECTED') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 uppercase shadow-sm">
          <XCircle className="w-3 h-3 text-rose-600" />
          <span>Ditolak</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-[10px] font-black bg-sky-100 text-sky-800 border border-sky-300 uppercase shadow-sm">
          <Clock className="w-3 h-3 text-sky-600 animate-pulse" />
          <span>Menunggu</span>
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans print:bg-white">
      
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>

      {modalNotif.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in print:hidden">
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

      {/* Modal Input Catatan Admin */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in print:hidden">
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

      <div className="print:hidden">
        <AdminHeader 
          title="RSUD BUKIT KERMAN" 
          subtitle="Panel Verifikasi Admin — Perincian Rawat Inap" 
          badgeText="Verifikasi Admin"
        />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 print:p-0 print:m-0 print:max-w-none">
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
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

        {/* Progress Bar & Financial Summary Cards */}
        <div className="bg-white p-5 rounded-3xl shadow-md border border-slate-200 space-y-4 print:hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Progress Verifikasi & Status Dokumen</h3>
            </div>
            <div className="text-xs font-bold text-slate-600">
              <span className="text-emerald-700 font-black">{totalVerifiedCount}</span> dari <span className="font-black">{patientList.length}</span> tagihan telah tuntas diverifikasi (<span className="text-emerald-700">{verificationPercentage}%</span>)
            </div>
          </div>
          
          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${verificationPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
          <div 
            onClick={() => { setFilterStatus('ALL'); setCurrentPage(1); }}
            className="bg-slate-900 text-white p-5 rounded-3xl shadow-md border border-slate-800 flex flex-col justify-between cursor-pointer hover:bg-slate-800 transition"
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
              <span>Total Akumulasi Tagihan</span>
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-mono font-black text-emerald-400">Rp {formatNumber(totalAkumulasiSemua)}</span>
              <p className="text-[10px] text-slate-400 mt-1">Klik untuk tampilkan semua data</p>
            </div>
          </div>

          <div 
            onClick={() => { setFilterPenjaminan('BPJS'); setCurrentPage(1); }}
            className="bg-teal-800 text-white p-5 rounded-3xl shadow-md border border-teal-700 flex flex-col justify-between cursor-pointer hover:bg-teal-700 transition"
          >
            <div className="flex items-center justify-between text-teal-200 text-xs font-bold uppercase">
              <span>Ditanggung BPJS / Pihak 3</span>
              <ShieldCheck className="w-4 h-4 text-teal-300" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-mono font-black text-white">Rp {formatNumber(totalBpjsSemua)}</span>
              <p className="text-[10px] text-teal-200 mt-1">Klik untuk filter khusus klaim BPJS</p>
            </div>
          </div>

          <div 
            onClick={() => { setFilterPenjaminan('UMUM'); setCurrentPage(1); }}
            className="bg-cyan-900 text-white p-5 rounded-3xl shadow-md border border-cyan-800 flex flex-col justify-between cursor-pointer hover:bg-cyan-800 transition"
          >
            <div className="flex items-center justify-between text-cyan-200 text-xs font-bold uppercase">
              <span>Kewajiban Pasien / Umum</span>
              <Banknote className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="mt-3">
              <span className="text-xl font-mono font-black text-white">Rp {formatNumber(totalUmumSemua)}</span>
              <p className="text-[10px] text-cyan-200 mt-1">Klik untuk filter khusus pasien umum</p>
            </div>
          </div>
        </div>

        {/* Tab Filter Status */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 print:hidden">
          {[
            { id: 'ALL', label: 'Semua Data', color: 'bg-slate-900 text-white' },
            { id: 'PENDING_VERIFIKASI', label: 'Menunggu', color: 'bg-sky-700 text-white' },
            { id: 'VERIFIED_ADMIN', label: 'Terverifikasi', color: 'bg-emerald-700 text-white' },
            { id: 'NEEDS_REVISION', label: 'Perlu Revisi', color: 'bg-amber-600 text-white' },
            { id: 'REJECTED', label: 'Ditolak', color: 'bg-rose-700 text-white' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setFilterStatus(tab.id); setCurrentPage(1); }}
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

        {/* Toolbar */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-3 print:hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
            
            <div className="relative w-full lg:w-64">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari pasien / No. Reg..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 font-medium bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <select
                value={filterRuang}
                onChange={(e) => { setFilterRuang(e.target.value); setCurrentPage(1); }}
                className="p-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-700 cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Ruangan</option>
                {uniqueRooms.map((room, idx) => (
                  <option key={idx} value={room}>{room}</option>
                ))}
              </select>

              <select
                value={filterPenjaminan}
                onChange={(e) => { setFilterPenjaminan(e.target.value); setCurrentPage(1); }}
                className="p-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-700 cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Penjaminan</option>
                <option value="UMUM">UMUM / MANDIRI</option>
                <option value="BPJS">BPJS KESEHATAN</option>
              </select>

              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded-xl px-2 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Dari:</span>
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-300 rounded-xl px-2 py-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">S/d:</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setCurrentPage(1); }}
                  className="bg-transparent text-xs font-medium text-slate-700 focus:outline-none"
                />
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2.5 rounded-xl border border-slate-300 text-xs bg-slate-50 font-medium text-slate-700 cursor-pointer focus:ring-2 focus:ring-emerald-500"
              >
                <option value="newest">Urutkan: Terbaru</option>
                <option value="highest_cost">Biaya Tertinggi</option>
                <option value="lowest_cost">Biaya Terendah</option>
                <option value="name_asc">Nama Pasien (A-Z)</option>
              </select>

              <button
                onClick={handleResetFilters}
                title="Reset Semua Filter"
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-500 font-medium">
                Menampilkan <strong className="text-slate-800">{filteredPatients.length}</strong> data sesuai filter aktif.
              </span>
              
              <div className="flex items-center space-x-1 text-xs text-slate-600">
                <span>Baris:</span>
                <select 
                  value={rowsPerPage} 
                  onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 font-bold text-slate-800 focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportAdminCSV}
                className="flex items-center space-x-1.5 bg-emerald-700 hover:bg-emerald-600 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ekspor Rekap Excel</span>
              </button>

              {selectedAdminRowIds.length > 0 && (
                <button
                  onClick={handleBatchVerify}
                  disabled={batchProcessing}
                  className="flex items-center space-x-1.5 bg-sky-700 hover:bg-sky-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer animate-pulse"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Setujui Terpilih ({selectedAdminRowIds.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabel Data Utama */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden print:hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300 text-[10px]">
                  <th className="p-3.5 text-center w-12">
                    <input 
                      type="checkbox"
                      checked={selectedAdminRowIds.length === paginatedPatients.length && paginatedPatients.length > 0}
                      onChange={toggleSelectAllAdmin}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-3.5">No. Reg / Tgl</th>
                  <th className="p-3.5">Nama Pasien</th>
                  <th className="p-3.5">Ruang / Kelas</th>
                  <th className="p-3.5">Penjaminan</th>
                  <th className="p-3.5 text-right">Total Biaya</th>
                  <th className="p-3.5 text-center">Status Verifikasi</th>
                  <th className="p-3.5 text-center">Aksi Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">Memuat data dari database...</td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">Tidak ada data tagihan yang cocok dengan filter saat ini.</td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient) => {
                    const isChecked = selectedAdminRowIds.includes(patient.no_reg);
                    return (
                      <tr key={patient.id} className={`hover:bg-slate-50 transition ${isChecked ? 'bg-emerald-50/40' : ''}`}>
                        <td className="p-3.5 text-center">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOneAdmin(patient.no_reg)}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </td>
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
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          Rp {formatNumber(patient.total_biaya || 0)}
                        </td>
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Halaman <strong className="text-slate-800">{currentPage}</strong> dari <strong className="text-slate-800">{totalPages}</strong> (Total {filteredPatients.length} data)
            </span>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 bg-white border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer flex items-center space-x-1 text-xs font-bold"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </main>

      {/* MODAL DETAIL & VERIFIKASI ADMIN (AKSI PINDAH KE DEPAN/ATAS) */}
      {showDetailModal && selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white print:static print:inset-auto">
          <div className="bg-white border border-slate-200 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden p-6 text-slate-800 relative max-h-[92vh] flex flex-col print:shadow-none print:border-none print:max-h-none print:p-0">
             
            <button 
              onClick={() => setShowDetailModal(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 transition cursor-pointer print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pb-4 border-b border-slate-200 pr-10 print:hidden">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase border border-emerald-300">
                Panel Kontrol Admin RSUD Bukit Kerman
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-1 uppercase">{selectedPatient.nama_pasien}</h2>
              <p className="text-xs text-slate-500">No. Reg: <span className="font-mono font-bold text-slate-700">{selectedPatient.no_reg}</span> • Ruangan: {selectedPatient.ruang}</p>
            </div>

            {/* --- AREA TAMPILAN MODAL NORMAL --- */}
            <div className="py-4 overflow-y-auto flex-1 space-y-4 print:hidden">
              
              {/* TOMBOL AKSI ADMIN DI PINDAH KE DEPAN (ATAS) */}
              <div className="bg-slate-900 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                <div className="flex items-center space-x-2 text-white">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider">Keputusan Verifikasi Cepat:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">NIK Pasien</span>
                  <span className="font-bold font-mono text-slate-800">{selectedPatient.nik_pasien || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Umur & Alamat</span>
                  <span className="font-bold text-slate-800">{selectedPatient.umur || '-'} • {selectedPatient.alamat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Diagnosa Medis</span>
                  <span className="font-bold text-slate-800">{selectedPatient.diagnosa || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Jenis Penjaminan</span>
                  <span className="font-bold text-emerald-700 uppercase">{selectedPatient.jenis_penjaminan || 'UMUM'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Tgl Masuk & Keluar</span>
                  <span className="font-bold font-mono text-slate-800">
                    {selectedPatient.masuk_tgl ? new Date(selectedPatient.masuk_tgl).toLocaleDateString('id-ID') : '-'} s.d. {selectedPatient.keluar_tgl ? new Date(selectedPatient.keluar_tgl).toLocaleDateString('id-ID') : '-'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dokter Merawat</span>
                  <span className="font-bold text-slate-800">{selectedPatient.dokter_merawat || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Kepala Ruangan</span>
                  <span className="font-bold text-slate-800">{selectedPatient.kepala_ruangan || '-'}</span>
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

            {/* --- AREA KHUSUS CETAK RESMI (HANYA MUNCUL KETIKA PRINT) --- */}
            <div className="hidden print:block font-sans text-slate-900 text-[10px] p-1 space-y-2">
              <div className="flex items-center border-b-2 border-slate-900 pb-2 mb-2">
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center text-white font-bold text-[10px] justify-center text-center">RSUD</div>
                </div>
                <div className="flex-1 text-center px-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider">PEMERINTAH KABUPATEN KERINCI</h4>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider">DINAS KESEHATAN</h3>
                  <h2 className="text-xs font-black uppercase tracking-tight text-emerald-900">RSUD BUKIT KERMAN</h2>
                  <p className="text-[8px] text-slate-600">Desa Pondok, Kecamatan Bukit Kerman, Kode Pos: 37176 | Email: rsudbukitkerman@gmail.com</p>
                </div>
                <div className="w-12 flex-shrink-0 flex items-center justify-center">
                  <div className="w-10 h-10 border border-emerald-800 rounded-full flex items-center justify-center text-emerald-800 font-bold text-[8px]">LOGO</div>
                </div>
              </div>

              <div className="text-center font-bold underline uppercase text-[11px] tracking-wide mb-2">
                PERINCIAN BIAYA PERAWATAN PASIEN RAWAT INAP
              </div>

              <div className="grid grid-cols-2 gap-x-4 border border-slate-800 p-2 rounded text-[9px] mb-2">
                <div className="space-y-0.5">
                  <div className="flex"><span className="w-24 font-bold">Nama Pasien</span><span className="mr-2">:</span><span className="font-semibold uppercase">{selectedPatient.nama_pasien}</span></div>
                  <div className="flex"><span className="w-24 font-bold">Umur</span><span className="mr-2">:</span><span>{selectedPatient.umur || '-'}</span></div>
                  <div className="flex"><span className="w-24 font-bold">Alamat</span><span className="mr-2">:</span><span>{selectedPatient.alamat || '-'}</span></div>
                  <div className="flex"><span className="w-24 font-bold">Diagnosa</span><span className="mr-2">:</span><span>{selectedPatient.diagnosa || '-'}</span></div>
                </div>
                <div className="space-y-0.5">
                  <div className="flex"><span className="w-24 font-bold">Masuk Tgl</span><span className="mr-2">:</span><span>{selectedPatient.masuk_tgl ? new Date(selectedPatient.masuk_tgl).toLocaleDateString('id-ID') : '-'}</span></div>
                  <div className="flex"><span className="w-24 font-bold">Keluar Tgl</span><span className="mr-2">:</span><span>{selectedPatient.keluar_tgl ? new Date(selectedPatient.keluar_tgl).toLocaleDateString('id-ID') : '-'}</span></div>
                  <div className="flex"><span className="w-24 font-bold">Ruangan</span><span className="mr-2">:</span><span className="font-semibold">{selectedPatient.ruang}</span></div>
                  <div className="flex"><span className="w-24 font-bold">No. Reg</span><span className="mr-2">:</span><span className="font-mono font-bold">{selectedPatient.no_reg}</span></div>
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-800 text-[9px] mb-2">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-center border-b border-slate-800">
                    <th className="border border-slate-800 p-1 w-6">No</th>
                    <th className="border border-slate-800 p-1 text-left">Uraian Biaya</th>
                    <th className="border border-slate-800 p-1 w-8">Vol</th>
                    <th className="border border-slate-800 p-1 text-right">Tarif (Rp)</th>
                    <th className="border border-slate-800 p-1 text-right">Jumlah (Rp)</th>
                    <th className="border border-slate-800 p-1 text-right">Ditanggung (Pihak 3)</th>
                    <th className="border border-slate-800 p-1 text-right">Selisih (Bayar)</th>
                  </tr>
                </thead>
                <tbody>
                  {patientItems.map((it, idx) => (
                    <tr key={it.id} className="border-b border-slate-300">
                      <td className="border border-slate-800 p-0.5 text-center">{idx + 1}</td>
                      <td className="border border-slate-800 p-0.5">
                        <span className="font-bold">{it.kategori_biaya}</span> — <span>{it.nama_item}</span>
                      </td>
                      <td className="border border-slate-800 p-0.5 text-center font-mono">{it.volume}</td>
                      <td className="border border-slate-800 p-0.5 text-right font-mono">{formatNumber(it.tarif_satuan)}</td>
                      <td className="border border-slate-800 p-0.5 text-right font-mono font-bold">{formatNumber(it.jumlah_total)}</td>
                      <td className="border border-slate-800 p-0.5 text-right font-mono">{formatNumber(it.ditanggung_pihak3)}</td>
                      <td className="border border-slate-800 p-0.5 text-right font-mono">{formatNumber(it.selisih_bayar)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border border-slate-800 p-1 text-right uppercase">Jumlah Total :</td>
                    <td className="border border-slate-800 p-1 text-right font-mono">Rp {formatNumber(selectedPatient.total_biaya || 0)}</td>
                    <td className="border border-slate-800 p-1 text-right font-mono">Rp {formatNumber(selectedPatient.total_ditanggung || 0)}</td>
                    <td className="border border-slate-800 p-1 text-right font-mono">Rp {formatNumber(selectedPatient.total_selisih || 0)}</td>
                  </tr>
                </tfoot>
              </table>

              <div className="border border-slate-800 p-1.5 rounded text-[9px] flex items-center space-x-2 mb-2">
                <span className="font-bold uppercase w-16">Terbilang:</span>
                <span className="italic font-bold text-slate-800 uppercase">({terbilang(selectedPatient.total_biaya || 0)})</span>
              </div>

              <div className="grid grid-cols-3 pt-2 text-center text-[9px]">
                <div>
                  <p className="font-medium">Dokter Yang Merawat</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline">({selectedPatient.dokter_merawat || '..............................'})</p>
                </div>
                <div>
                  <p className="font-medium">Bendahara Yang Menerima</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline">({selectedPatient.bendahara_penerima || '..............................'})</p>
                </div>
                <div>
                  <p className="font-medium">Bukit Kerman, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p className="font-medium">Kepala Ruangan</p>
                  <div className="h-10"></div>
                  <p className="font-bold underline">({selectedPatient.kepala_ruangan || '..............................'})</p>
                </div>
              </div>
            </div>

            {/* Footer Modal (Hanya menyisakan tombol Cetak & Tutup) */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2 print:hidden">
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
      )}

      <div className="print:hidden">
        <AdminFooter />
      </div>

    </div>
  );
}